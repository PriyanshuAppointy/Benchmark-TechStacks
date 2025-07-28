package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

type ColdStartResult struct {
	Operations      int     `json:"operations"`
	TotalTimeMs     float64 `json:"totalTimeMs"`
	ColdStartTimeMs float64 `json:"coldStartTimeMs"`
}

func main() {
	var port string
	var iterations int
	var timeout int

	flag.StringVar(&port, "port", "3000", "Port for the HTTP server")
	flag.IntVar(&iterations, "iterations", 10, "Number of cold start measurements")
	flag.IntVar(&timeout, "timeout", 10000, "Timeout in milliseconds for each cold start attempt")
	flag.Parse()

	portInt, err := strconv.Atoi(port)
	if err != nil {
		log.Fatalf("Invalid port: %s", port)
	}

	fmt.Printf("Running cold start benchmark: %d iterations, port %d, timeout %dms\n", iterations, portInt, timeout)

	var totalColdStartTime float64
	successfulMeasurements := 0

	for i := 0; i < iterations; i++ {
		fmt.Printf("Cold start measurement %d/%d...\n", i+1, iterations)

		startTime := time.Now()

		// Start HTTP server in goroutine
		server := &http.Server{
			Addr: fmt.Sprintf(":%d", portInt),
			Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				w.Write([]byte(`{"status": "ok", "message": "Cold start complete"}`))
			}),
		}

		serverReady := make(chan bool, 1)
		serverError := make(chan error, 1)

		go func() {
			// Give server a moment to bind to port
			time.Sleep(10 * time.Millisecond)

			if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				serverError <- err
			}
		}()

		// Wait for server to be ready by making HTTP requests
		go func() {
			client := &http.Client{
				Timeout: time.Duration(timeout) * time.Millisecond,
			}

			url := fmt.Sprintf("http://localhost:%d/", portInt)
			maxAttempts := timeout / 10 // Attempt every 10ms

			for attempt := 0; attempt < maxAttempts; attempt++ {
				resp, err := client.Get(url)
				if err == nil && resp.StatusCode == http.StatusOK {
					resp.Body.Close()
					serverReady <- true
					return
				}
				if resp != nil {
					resp.Body.Close()
				}
				time.Sleep(10 * time.Millisecond)
			}
			serverReady <- false
		}()

		// Wait for either server ready or timeout
		select {
		case ready := <-serverReady:
			if ready {
				coldStartTime := time.Since(startTime)
				totalColdStartTime += float64(coldStartTime.Nanoseconds()) / 1e6 // Convert to milliseconds
				successfulMeasurements++
				fmt.Printf("Cold start %d: %.2fms\n", i+1, float64(coldStartTime.Nanoseconds())/1e6)
			} else {
				fmt.Printf("Cold start %d: timeout\n", i+1)
			}
		case err := <-serverError:
			fmt.Printf("Cold start %d: server error: %v\n", i+1, err)
		case <-time.After(time.Duration(timeout) * time.Millisecond):
			fmt.Printf("Cold start %d: timeout\n", i+1)
		}

		// Shutdown server
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		server.Shutdown(ctx)
		cancel()

		// Wait a bit between iterations to ensure clean state
		time.Sleep(100 * time.Millisecond)
	}

	if successfulMeasurements == 0 {
		log.Fatalf("No successful cold start measurements completed")
	}

	avgColdStartTime := totalColdStartTime / float64(successfulMeasurements)

	result := ColdStartResult{
		Operations:      successfulMeasurements,
		TotalTimeMs:     totalColdStartTime,
		ColdStartTimeMs: avgColdStartTime,
	}

	// Output JSON result
	jsonResult, err := json.Marshal(result)
	if err != nil {
		log.Fatalf("Failed to marshal result: %v", err)
	}

	fmt.Print(string(jsonResult))
}
