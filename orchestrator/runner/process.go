package runner

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"performance-benchmark-suite/orchestrator/config"
	"performance-benchmark-suite/orchestrator/report"

	"github.com/shirou/gopsutil/v3/process"
)

type Runner struct {
	projectRoot string
	config      *config.Config
}

type ProcessMetrics struct {
	MaxMemoryMB   float64
	AvgCPUPercent float64
	SampleCount   int
}

func NewRunner() (*Runner, error) {
	// Get the project root - try to find it relative to current directory
	var projectRoot string

	// First, try to find the config file relative to current directory
	if _, err := os.Stat("config/technologies.yaml"); err == nil {
		projectRoot, _ = filepath.Abs(".")
	} else if _, err := os.Stat("../config/technologies.yaml"); err == nil {
		projectRoot, _ = filepath.Abs("..")
	} else if _, err := os.Stat("../../config/technologies.yaml"); err == nil {
		projectRoot, _ = filepath.Abs("../..")
	} else {
		// Fallback: assume we're in the orchestrator directory
		projectRoot, _ = filepath.Abs(filepath.Join("..", ".."))
	}

	// Load configuration
	cfg, err := config.LoadConfig("")
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %v", err)
	}

	return &Runner{
		projectRoot: projectRoot,
		config:      cfg,
	}, nil
}

func (r *Runner) RunBenchmark(tech, test string, params map[string]string) (*report.BenchmarkResult, error) {
	// Get benchmark configuration
	benchmark, err := r.config.GetBenchmark(tech, test)
	if err != nil {
		return nil, fmt.Errorf("failed to get benchmark config: %v", err)
	}

	// Handle server tests specially
	if benchmark.Type == "server" {
		return r.runServerBenchmark(tech, test, params)
	}

	// Handle regular benchmark tests
	return r.runRegularBenchmark(tech, test, params)
}

func (r *Runner) runServerBenchmark(tech, test string, params map[string]string) (*report.BenchmarkResult, error) {
	fmt.Printf("\n=== Starting HTTP Server Benchmark: %s ===\n", tech)

	// Build server command
	serverCmd, err := r.buildBenchmarkCommand(tech, test, params)
	if err != nil {
		return nil, fmt.Errorf("failed to build server command: %v", err)
	}

	// Capture server stdout and stderr for debugging
	serverStdout, err := serverCmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to get server stdout pipe: %v", err)
	}

	serverStderr, err := serverCmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to get server stderr pipe: %v", err)
	}

	// Start capturing server logs
	var serverStdoutData strings.Builder
	var serverStderrData strings.Builder

	go func() {
		scanner := bufio.NewScanner(serverStdout)
		for scanner.Scan() {
			line := scanner.Text()
			fmt.Printf("[%s-server-stdout] %s\n", tech, line)
			serverStdoutData.WriteString(line + "\n")
		}
	}()

	go func() {
		scanner := bufio.NewScanner(serverStderr)
		for scanner.Scan() {
			line := scanner.Text()
			fmt.Printf("[%s-server-stderr] %s\n", tech, line)
			serverStderrData.WriteString(line + "\n")
		}
	}()

	// Start the server
	fmt.Printf("Starting %s HTTP server...\n", tech)
	if err := serverCmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start %s server: %v", tech, err)
	}

	// Ensure server cleanup
	defer func() {
		if serverCmd.Process != nil {
			fmt.Printf("Stopping %s server...\n", tech)
			serverCmd.Process.Kill()
			serverCmd.Wait() // Clean up zombie process
		}
	}()

	// Health check with retries
	maxRetries := 30 // 15 seconds total
	fmt.Printf("Waiting for %s server to be ready (health check)...\n", tech)

	var healthCheckSuccess bool
	for i := 0; i < maxRetries; i++ {
		time.Sleep(500 * time.Millisecond)

		// Check if server process is still running
		if serverCmd.Process != nil {
			if proc, err := os.FindProcess(serverCmd.Process.Pid); err == nil {
				// Try to signal the process to check if it's alive
				if err := proc.Signal(syscall.Signal(0)); err != nil {
					return nil, fmt.Errorf("server process died during startup - stdout: %s, stderr: %s",
						serverStdoutData.String(), serverStderrData.String())
				}
			}
		}

		// Try health check
		client := &http.Client{Timeout: 1 * time.Second}
		resp, err := client.Get("http://localhost:3000/health")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				fmt.Printf("%s server is ready!\n", tech)
				healthCheckSuccess = true
				break
			}
		}
	}

	if !healthCheckSuccess {
		return nil, fmt.Errorf("server health check failed after %d retries - stdout: %s, stderr: %s",
			maxRetries, serverStdoutData.String(), serverStderrData.String())
	}

	// Build and run wrk command
	duration := params["duration"]
	if duration == "" {
		duration = "15s"
	}
	connections := params["connections"]
	if connections == "" {
		connections = "100"
	}

	fmt.Printf("Running load test against %s server (duration: %s, connections: %s)...\n", tech, duration, connections)
	wrkCmd := exec.Command("wrk",
		"-t", strconv.Itoa(runtime.NumCPU()),
		"-c", connections,
		"-d", duration,
		"http://localhost:3000")

	wrkCmd.Dir = r.projectRoot

	// Run wrk and capture output
	wrkOutput, err := wrkCmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("wrk failed: %v, output: %s, server stdout: %s, server stderr: %s",
			err, string(wrkOutput), serverStdoutData.String(), serverStderrData.String())
	}

	fmt.Printf("Load test completed for %s\n", tech)
	fmt.Printf("wrk output:\n%s\n", string(wrkOutput))

	// Parse wrk output to extract metrics
	return r.parseWrkOutput(tech, test, params, string(wrkOutput))
}

func (r *Runner) runRegularBenchmark(tech, test string, params map[string]string) (*report.BenchmarkResult, error) {
	cmd, err := r.buildBenchmarkCommand(tech, test, params)
	if err != nil {
		return nil, fmt.Errorf("failed to build command: %v", err)
	}

	// Capture stdout and stderr BEFORE starting the process
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to get stdout pipe: %v", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to get stderr pipe: %v", err)
	}

	// Start the process
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start process: %v", err)
	}

	// Get process for monitoring
	proc, err := process.NewProcess(int32(cmd.Process.Pid))
	if err != nil {
		return nil, fmt.Errorf("failed to get process: %v", err)
	}

	// Start monitoring in a goroutine
	metricsChan := make(chan ProcessMetrics, 1)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go r.monitorProcess(ctx, proc, metricsChan)

	// Read stdout in a goroutine
	var stdoutData strings.Builder
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			stdoutData.WriteString(scanner.Text() + "\n")
		}
	}()

	// Read stderr in a goroutine
	var stderrData strings.Builder
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			stderrData.WriteString(scanner.Text() + "\n")
		}
	}()

	// Wait for the process to complete
	if err := cmd.Wait(); err != nil {
		return nil, fmt.Errorf("process failed: %v, stderr: %s", err, stderrData.String())
	}

	// Stop monitoring and get final metrics
	cancel()
	metrics := <-metricsChan

	// Parse the JSON output
	var benchmarkMetrics map[string]interface{}
	if stdoutData.Len() > 0 {
		// Find the last line that contains JSON
		lines := strings.Split(strings.TrimSpace(stdoutData.String()), "\n")
		for i := len(lines) - 1; i >= 0; i-- {
			line := strings.TrimSpace(lines[i])
			if line != "" {
				if err := json.Unmarshal([]byte(line), &benchmarkMetrics); err == nil {
					break
				}
			}
		}
	}

	// Build the result
	result := &report.BenchmarkResult{
		Tech:       tech,
		Test:       test,
		Parameters: params,
		Metrics: report.Metrics{
			MaxMemoryMB:   metrics.MaxMemoryMB,
			AvgCPUPercent: metrics.AvgCPUPercent,
		},
	}

	// Add benchmark-specific metrics
	if benchmarkMetrics != nil {
		if ops, ok := benchmarkMetrics["operationsPerSecond"].(float64); ok {
			result.Metrics.OperationsPerSecond = ops
		}
		if totalTime, ok := benchmarkMetrics["totalTimeMs"].(float64); ok {
			result.Metrics.TotalTimeMs = totalTime
		}
		if requests, ok := benchmarkMetrics["requestsPerSecond"].(float64); ok {
			result.Metrics.RequestsPerSecond = requests
		}
		if latency, ok := benchmarkMetrics["latencyAvgMs"].(float64); ok {
			result.Metrics.LatencyAvgMs = latency
		}
	}

	return result, nil
}

func (r *Runner) parseWrkOutput(tech, test string, params map[string]string, output string) (*report.BenchmarkResult, error) {
	// Parse wrk output to extract RPS and latency
	lines := strings.Split(output, "\n")
	var requestsPerSecond float64
	var latencyMs float64

	for _, line := range lines {
		if strings.Contains(line, "Requests/sec:") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				if rps, err := strconv.ParseFloat(parts[1], 64); err == nil {
					requestsPerSecond = rps
				}
			}
		}
		if strings.Contains(line, "Latency") && strings.Contains(line, "ms") {
			// Extract latency from line like "Latency     1.23ms    2.34ms   5.67ms   89.01%"
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				latencyStr := strings.TrimSuffix(parts[1], "ms")
				if lat, err := strconv.ParseFloat(latencyStr, 64); err == nil {
					latencyMs = lat
				}
			}
		}
	}

	return &report.BenchmarkResult{
		Tech:       tech,
		Test:       test,
		Parameters: params,
		Metrics: report.Metrics{
			RequestsPerSecond: requestsPerSecond,
			LatencyAvgMs:      latencyMs,
		},
	}, nil
}

func (r *Runner) buildBenchmarkCommand(tech, test string, params map[string]string) (*exec.Cmd, error) {
	benchmark, err := r.config.GetBenchmark(tech, test)
	if err != nil {
		return nil, err
	}

	// Build command from configuration
	cmd := exec.Command(benchmark.Command[0], benchmark.Command[1:]...)

	// Add parameters as command line arguments
	for key, value := range params {
		cmd.Args = append(cmd.Args, fmt.Sprintf("--%s=%s", key, value))
	}

	// Set working directory
	cmd.Dir = r.projectRoot

	return cmd, nil
}

func (r *Runner) monitorProcess(ctx context.Context, proc *process.Process, metricsChan chan<- ProcessMetrics) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	var maxMemoryMB float64
	var totalCPU float64
	var sampleCount int

	for {
		select {
		case <-ctx.Done():
			var avgCPU float64
			if sampleCount > 0 {
				avgCPU = totalCPU / float64(sampleCount)
			}
			metricsChan <- ProcessMetrics{
				MaxMemoryMB:   maxMemoryMB,
				AvgCPUPercent: avgCPU,
				SampleCount:   sampleCount,
			}
			return
		case <-ticker.C:
			// Get memory info
			if memInfo, err := proc.MemoryInfo(); err == nil {
				memoryMB := float64(memInfo.RSS) / 1024 / 1024
				if memoryMB > maxMemoryMB {
					maxMemoryMB = memoryMB
				}
			}

			// Get CPU info
			if cpuPercent, err := proc.CPUPercent(); err == nil {
				totalCPU += cpuPercent
				sampleCount++
			}
		}
	}
}
