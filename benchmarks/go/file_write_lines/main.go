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
	var outputPath string
	var iterations int
	var lineCount int

	flag.StringVar(&outputPath, "output", "", "Path for output file")
	flag.IntVar(&iterations, "iterations", 10, "Number of iterations to write")
	flag.IntVar(&lineCount, "lines", 1000000, "Number of lines to write")
	flag.Parse()

	// Default output path if not provided
	if outputPath == "" {
		outputPath = filepath.Join("test_data", "temp_output_lines.txt")
	}

	// Generate sample lines data
	sampleTexts := []string{
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
		"Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
		"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
		"Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
		"Excepteur sint occaecat cupidatat non proident, sunt in culpa.",
	}

	startTime := time.Now()

	// Write the data multiple times
	for i := 0; i < iterations; i++ {
		file, err := os.Create(outputPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating file: %v\n", err)
			os.Exit(1)
		}

		writer := bufio.NewWriter(file)

		for j := 0; j < lineCount; j++ {
			textIndex := j % len(sampleTexts)
			line := fmt.Sprintf("Line %07d: %s\n", j+1, sampleTexts[textIndex])
			_, err := writer.WriteString(line)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error writing line: %v\n", err)
				file.Close()
				os.Exit(1)
			}
		}

		err = writer.Flush()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error flushing writer: %v\n", err)
			file.Close()
			os.Exit(1)
		}

		file.Close()
	}

	endTime := time.Now()
	totalTime := endTime.Sub(startTime)
	totalTimeMs := float64(totalTime.Nanoseconds()) / 1e6
	operationsPerSecond := (float64(iterations) / totalTimeMs) * 1000

	// Clean up temp file
	os.Remove(outputPath)

	// Output JSON result to stdout
	fmt.Printf(`{"operations": %d, "totalTimeMs": %.2f, "operationsPerSecond": %.2f, "linesPerIteration": %d}`,
		iterations, totalTimeMs, operationsPerSecond, lineCount)
}
