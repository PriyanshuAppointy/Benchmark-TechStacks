package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func main() {
	var outputPath string
	var iterations int
	var dataSize int

	flag.StringVar(&outputPath, "output", "", "Path for output file")
	flag.IntVar(&iterations, "iterations", 1000, "Number of iterations to write")
	flag.IntVar(&dataSize, "size", 1024, "Size of data to write in bytes")
	flag.Parse()

	// Default output path if not provided
	if outputPath == "" {
		outputPath = filepath.Join("test_data", "temp_output.txt")
	}

	// Create test data
	testData := make([]byte, dataSize)
	for i := range testData {
		testData[i] = byte(i % 256)
	}

	startTime := time.Now()

	// Write the data multiple times
	for i := 0; i < iterations; i++ {
		file, err := os.Create(outputPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating file: %v\n", err)
			os.Exit(1)
		}

		_, err = file.Write(testData)
		file.Close()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error writing file: %v\n", err)
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
