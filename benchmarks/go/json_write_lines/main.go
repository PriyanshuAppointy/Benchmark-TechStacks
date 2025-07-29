package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type SampleItem struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	Priority    string   `json:"priority"`
	Tags        []string `json:"tags"`
	Timestamp   string   `json:"timestamp"`
	Value       int      `json:"value"`
	Active      bool     `json:"active"`
}

func main() {
	var outputPath string
	var iterations int
	var lineCount int

	flag.StringVar(&outputPath, "output", "", "Path for output JSON lines file")
	flag.IntVar(&iterations, "iterations", 10, "Number of iterations to write")
	flag.IntVar(&lineCount, "lines", 1000000, "Number of JSON lines to write")
	flag.Parse()

	// Default output path if not provided
	if outputPath == "" {
		outputPath = filepath.Join("test_data", "temp_output_lines.json")
	}

	// Sample data for JSON objects
	sampleCategories := []string{"test", "benchmark", "data", "sample", "mock"}
	samplePriorities := []string{"low", "medium", "high", "critical"}
	sampleTags := [][]string{
		{"benchmark", "test"},
		{"data", "sample"},
		{"mock", "test", "data"},
		{"performance", "benchmark"},
		{"json", "test"},
	}

	startTime := time.Now()

	// Write the JSON lines multiple times
	for i := 0; i < iterations; i++ {
		file, err := os.Create(outputPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating file: %v\n", err)
			os.Exit(1)
		}

		writer := bufio.NewWriter(file)

		for j := 0; j < lineCount; j++ {
			item := SampleItem{
				ID:          j + 1,
				Name:        fmt.Sprintf("Item_%07d", j+1),
				Description: fmt.Sprintf("Sample item %d for benchmarking JSON line operations", j+1),
				Category:    sampleCategories[j%len(sampleCategories)],
				Priority:    samplePriorities[j%len(samplePriorities)],
				Tags:        sampleTags[j%len(sampleTags)],
				Timestamp:   time.Now().Add(time.Duration(j) * time.Second).Format(time.RFC3339),
				Value:       j * 100,
				Active:      j%3 == 0,
			}

			jsonBytes, err := json.Marshal(item)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error marshaling JSON: %v\n", err)
				file.Close()
				os.Exit(1)
			}

			_, err = writer.Write(jsonBytes)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error writing JSON line: %v\n", err)
				file.Close()
				os.Exit(1)
			}

			_, err = writer.WriteString("\n")
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error writing newline: %v\n", err)
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
