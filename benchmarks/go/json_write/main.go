package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type TestData struct {
	ID       int                    `json:"id"`
	Name     string                 `json:"name"`
	Tags     []string               `json:"tags"`
	Metadata map[string]interface{} `json:"metadata"`
}

func main() {
	var outputPath string
	var iterations int
	var dataSize int

	flag.StringVar(&outputPath, "output", "", "Path for output JSON file")
	flag.IntVar(&iterations, "iterations", 1000, "Number of iterations to write")
	flag.IntVar(&dataSize, "size", 100, "Number of items in the JSON array")
	flag.Parse()

	// Default output path if not provided
	if outputPath == "" {
		outputPath = filepath.Join("test_data", "temp_output.json")
	}

	// Create test data
	testData := make([]TestData, dataSize)
	for i := 0; i < dataSize; i++ {
		testData[i] = TestData{
			ID:   i,
			Name: fmt.Sprintf("Item_%d", i),
			Tags: []string{"tag1", "tag2", "tag3"},
			Metadata: map[string]interface{}{
				"created": time.Now().Unix(),
				"version": "1.0",
				"active":  true,
			},
		}
	}

	startTime := time.Now()

	// Serialize and write JSON multiple times
	for i := 0; i < iterations; i++ {
		// Serialize to JSON
		jsonData, err := json.MarshalIndent(testData, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error marshaling JSON: %v\n", err)
			os.Exit(1)
		}

		// Write to file
		file, err := os.Create(outputPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating file: %v\n", err)
			os.Exit(1)
		}

		_, err = file.Write(jsonData)
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
