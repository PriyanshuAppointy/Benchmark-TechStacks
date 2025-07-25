package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

func main() {
	var filePath string
	var iterations int

	flag.StringVar(&filePath, "file", "", "Path to the file to read")
	flag.IntVar(&iterations, "iterations", 1000, "Number of iterations to read the file")
	flag.Parse()

	// Default file path if not provided
	if filePath == "" {
		filePath = filepath.Join("test_data", "medium.txt")
	}

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "File not found: %s\n", filePath)
		os.Exit(1)
	}

	startTime := time.Now()

	// Read the file multiple times
	for i := 0; i < iterations; i++ {
		file, err := os.Open(filePath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error opening file: %v\n", err)
			os.Exit(1)
		}

		_, err = io.Copy(io.Discard, file)
		file.Close()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading file: %v\n", err)
			os.Exit(1)
		}
	}

	endTime := time.Now()
	totalTime := endTime.Sub(startTime)
	totalTimeMs := float64(totalTime.Microseconds()) / 1000.0
	opsPerSecond := float64(iterations) / (totalTimeMs / 1000.0)

	// Output JSON result to stdout
	fmt.Printf(`{"operations":%d,"totalTimeMs":%.2f,"operationsPerSecond":%.2f}`,
		iterations, totalTimeMs, opsPerSecond)
}
