package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func main() {
	var filePath string
	var iterations int

	flag.StringVar(&filePath, "file", "", "Path to the file to read line by line")
	flag.IntVar(&iterations, "iterations", 10, "Number of iterations to read the file")
	flag.Parse()

	// Default file path if not provided
	if filePath == "" {
		filePath = filepath.Join("test_data", "xlarge_lines.txt")
	}

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "File not found: %s\n", filePath)
		os.Exit(1)
	}

	startTime := time.Now()
	totalLines := 0

	// Read the file line by line multiple times
	for i := 0; i < iterations; i++ {
		file, err := os.Open(filePath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error opening file: %v\n", err)
			os.Exit(1)
		}

		scanner := bufio.NewScanner(file)
		lineCount := 0
		for scanner.Scan() {
			_ = scanner.Text() // Read each line
			lineCount++
		}

		if err := scanner.Err(); err != nil {
			fmt.Fprintf(os.Stderr, "Error reading file: %v\n", err)
			file.Close()
			os.Exit(1)
		}

		file.Close()

		if i == 0 {
			totalLines = lineCount
		}
	}

	endTime := time.Now()
	totalTime := endTime.Sub(startTime)
	totalTimeMs := float64(totalTime.Nanoseconds()) / 1e6
	operationsPerSecond := (float64(iterations) / totalTimeMs) * 1000

	// Output JSON result to stdout
	fmt.Printf(`{"operations": %d, "totalTimeMs": %.2f, "operationsPerSecond": %.2f, "linesPerFile": %d}`,
		iterations, totalTimeMs, operationsPerSecond, totalLines)
}
