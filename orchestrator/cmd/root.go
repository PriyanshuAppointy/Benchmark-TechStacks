package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "benchmark-cli",
	Short: "A comprehensive benchmarking framework for comparing performance across different technologies",
	Long: `Performance Benchmark Suite

A CLI tool for running performance benchmarks across different technologies (Go, Bun, Node.js)
and various test types (RPS, File I/O, JSON operations, concurrency).

The tool orchestrates test execution, monitors system resources, and generates comprehensive reports.`,
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	// Add subcommands here
	rootCmd.AddCommand(runCmd)
}

func exitWithError(err error) {
	fmt.Fprintf(os.Stderr, "Error: %v\n", err)
	os.Exit(1)
}
