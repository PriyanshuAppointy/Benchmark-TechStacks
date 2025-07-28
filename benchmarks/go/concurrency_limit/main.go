package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type ConcurrencyResult struct {
	Operations           int     `json:"operations"`
	TotalTimeMs          float64 `json:"totalTimeMs"`
	MaxConcurrentClients int     `json:"maxConcurrentClients"`
	MaxRequestsPerSecond float64 `json:"maxRequestsPerSecond"`
	ConcurrencyThreshold float64 `json:"concurrencyThreshold"`
}

func main() {
	var port string
	var startClients, maxClients, stepSize int
	var duration, thresholdPercent float64

	flag.StringVar(&port, "port", "3000", "Port for the HTTP server")
	flag.IntVar(&startClients, "start-clients", 10, "Starting number of concurrent clients")
	flag.IntVar(&maxClients, "max-clients", 500, "Maximum number of concurrent clients to test")
	flag.IntVar(&stepSize, "step-size", 25, "Step size for increasing concurrent clients")
	flag.Float64Var(&duration, "duration", 10.0, "Duration in seconds for each test")
	flag.Float64Var(&thresholdPercent, "threshold", 0.9, "Performance threshold (90% = stop when RPS drops below 90% of peak)")
	flag.Parse()

	if !isServerRunning(port) {
		fmt.Fprintf(os.Stderr, "HTTP server not running on port %s\n", port)
		os.Exit(1)
	}

	fmt.Printf("Testing concurrency limits from %d to %d clients (step: %d)\n", startClients, maxClients, stepSize)

	startTime := time.Now()
	maxRPS := 0.0
	maxConcurrency := startClients
	totalTests := 0

	// Test increasing concurrency levels
	for clients := startClients; clients <= maxClients; clients += stepSize {
		totalTests++
		fmt.Printf("Testing %d concurrent clients...\n", clients)

		rps, err := testConcurrencyLevel(clients, duration, port)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error testing %d clients: %v\n", clients, err)
			continue
		}

		fmt.Printf("  -> %d clients: %.2f RPS\n", clients, rps)

		if rps > maxRPS {
			maxRPS = rps
			maxConcurrency = clients
		} else if rps < maxRPS*thresholdPercent {
			// Performance degraded below threshold, stop testing
			fmt.Printf("Performance degraded below %.0f%% threshold. Max concurrency: %d clients\n",
				thresholdPercent*100, maxConcurrency)
			break
		}

		// Small delay between tests
		time.Sleep(500 * time.Millisecond)
	}

	totalTime := time.Since(startTime)

	result := ConcurrencyResult{
		Operations:           totalTests,
		TotalTimeMs:          float64(totalTime.Nanoseconds()) / 1e6,
		MaxConcurrentClients: maxConcurrency,
		MaxRequestsPerSecond: maxRPS,
		ConcurrencyThreshold: thresholdPercent,
	}

	output, err := json.Marshal(result)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling result: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(output))
}

func testConcurrencyLevel(clients int, duration float64, port string) (float64, error) {
	durationStr := fmt.Sprintf("%.0fs", duration)

	// Use wrk to test this concurrency level
	cmd := exec.Command("wrk",
		"-t", strconv.Itoa(runtime.NumCPU()),
		"-c", strconv.Itoa(clients),
		"-d", durationStr,
		fmt.Sprintf("http://localhost:%s", port))

	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("wrk command failed: %v", err)
	}

	return parseWrkRPS(string(output))
}

func parseWrkRPS(output string) (float64, error) {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.Contains(line, "Requests/sec:") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				return strconv.ParseFloat(parts[1], 64)
			}
		}
	}
	return 0, fmt.Errorf("could not parse RPS from wrk output")
}

func isServerRunning(port string) bool {
	resp, err := http.Get(fmt.Sprintf("http://localhost:%s", port))
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == 200
}
