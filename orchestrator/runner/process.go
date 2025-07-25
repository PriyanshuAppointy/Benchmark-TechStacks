package runner

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
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

	var cmd *exec.Cmd
	if benchmark.Type == "server" {
		cmd, err = r.buildServerCommand(tech, test, params)
	} else {
		cmd, err = r.buildBenchmarkCommand(tech, test, params)
	}

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

func (r *Runner) buildServerCommand(tech, test string, params map[string]string) (*exec.Cmd, error) {
	// For server tests, we need to start the server first, then run wrk
	serverCmd, err := r.buildBenchmarkCommand(tech, test, params)
	if err != nil {
		return nil, err
	}

	// Start the server
	if err := serverCmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start server: %v", err)
	}

	// Wait a bit for server to start
	time.Sleep(2 * time.Second)

	// Build wrk command
	duration := params["duration"]
	if duration == "" {
		duration = "15s"
	}
	connections := params["connections"]
	if connections == "" {
		connections = "100"
	}

	wrkCmd := exec.Command("wrk",
		"-t", strconv.Itoa(runtime.NumCPU()),
		"-c", connections,
		"-d", duration,
		"http://localhost:3000")

	// Set working directory
	wrkCmd.Dir = r.projectRoot

	// We'll need to handle the server process cleanup
	// For now, let's just run wrk and parse its output
	return wrkCmd, nil
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
