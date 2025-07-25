package main

import (
	"crypto/sha256"
	"flag"
	"fmt"
	"os"
	"runtime"
	"sync"
	"time"
)

func main() {
	var mode string
	var workload int

	flag.StringVar(&mode, "mode", "single", "Mode: single or multi")
	flag.IntVar(&workload, "workload", 1000000, "Number of hash operations to perform")
	flag.Parse()

	startTime := time.Now()

	if mode == "single" {
		// Single-threaded execution
		for i := 0; i < workload; i++ {
			data := fmt.Sprintf("data_%d", i)
			hash := sha256.Sum256([]byte(data))
			_ = hash // Prevent optimization
		}
	} else if mode == "multi" {
		// Multi-threaded execution
		numCPU := runtime.NumCPU()
		workPerCPU := workload / numCPU

		var wg sync.WaitGroup
		for cpu := 0; cpu < numCPU; cpu++ {
			wg.Add(1)
			go func(cpuID int) {
				defer wg.Done()
				start := cpuID * workPerCPU
				end := start + workPerCPU
				if cpuID == numCPU-1 {
					end = workload // Last CPU gets remaining work
				}

				for i := start; i < end; i++ {
					data := fmt.Sprintf("data_%d", i)
					hash := sha256.Sum256([]byte(data))
					_ = hash // Prevent optimization
				}
			}(cpu)
		}
		wg.Wait()
	} else {
		fmt.Fprintf(os.Stderr, "Invalid mode: %s. Use 'single' or 'multi'\n", mode)
		os.Exit(1)
	}

	endTime := time.Now()
	totalTime := endTime.Sub(startTime)
	totalTimeMs := float64(totalTime.Microseconds()) / 1000.0
	opsPerSecond := float64(workload) / (totalTimeMs / 1000.0)

	// Output JSON result to stdout
	fmt.Printf(`{"operations":%d,"totalTimeMs":%.2f,"operationsPerSecond":%.2f,"mode":"%s"}`,
		workload, totalTimeMs, opsPerSecond, mode)
}
