package main

import (
	"fmt"
	"os"

	"performance-benchmark-suite/orchestrator/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
