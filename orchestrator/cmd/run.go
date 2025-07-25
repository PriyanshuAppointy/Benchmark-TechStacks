package cmd

import (
	"fmt"
	"strings"

	"performance-benchmark-suite/orchestrator/config"
	"performance-benchmark-suite/orchestrator/report"
	"performance-benchmark-suite/orchestrator/runner"

	"github.com/spf13/cobra"
)

var (
	technologies   string
	tests          string
	outputDir      string
	rpsDuration    string
	rpsConnections int
)

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Run performance benchmarks",
	Long: `Run performance benchmarks for specified technologies and test types.

Examples:
  benchmark-cli run --tech=all --test=all
  benchmark-cli run --tech=go,bun --test=file_read,json_write
  benchmark-cli run --tech=node --test=http_server --rps-duration=30s`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Load configuration
		cfg, err := config.LoadConfig("")
		if err != nil {
			return fmt.Errorf("failed to load configuration: %v", err)
		}

		// Parse technologies
		techList := parseList(technologies)
		if len(techList) == 0 {
			return fmt.Errorf("no technologies specified")
		}

		// Parse tests
		testList := parseList(tests)
		if len(testList) == 0 {
			return fmt.Errorf("no tests specified")
		}

		// Validate technologies
		validTechs := cfg.ListTechnologies()
		for _, tech := range techList {
			if tech == "all" {
				techList = validTechs
				break
			}
			if !cfg.ValidateTechnology(tech) {
				return fmt.Errorf("invalid technology: %s", tech)
			}
		}

		// Validate tests
		for _, test := range testList {
			if test == "all" {
				// Get all tests from all technologies
				testList = []string{}
				for _, tech := range validTechs {
					if tests, err := cfg.ListBenchmarks(tech); err == nil {
						testList = append(testList, tests...)
					}
				}
				break
			}
		}

		// Remove duplicates
		techList = removeDuplicates(techList)
		testList = removeDuplicates(testList)

		fmt.Printf("Running benchmarks for technologies: %v\n", techList)
		fmt.Printf("Running tests: %v\n", testList)

		// Create runner
		benchmarkRunner, err := runner.NewRunner()
		if err != nil {
			return fmt.Errorf("failed to create runner: %v", err)
		}

		// Run benchmarks
		var results []report.BenchmarkResult
		for _, tech := range techList {
			for _, test := range testList {
				// Check if this technology supports this test
				if !cfg.ValidateBenchmark(tech, test) {
					fmt.Printf("Skipping %s - %s (not supported)\n", tech, test)
					continue
				}

				fmt.Printf("\nRunning %s - %s...\n", tech, test)

				params := make(map[string]string)
				if test == "http_server" {
					params["duration"] = rpsDuration
					params["connections"] = fmt.Sprintf("%d", rpsConnections)
				}

				result, err := benchmarkRunner.RunBenchmark(tech, test, params)
				if err != nil {
					fmt.Printf("Error running %s - %s: %v\n", tech, test, err)
					continue
				}

				results = append(results, *result)
			}
		}

		// Generate report
		if len(results) > 0 {
			generator := report.NewGenerator()
			reportPath, err := generator.GenerateReport(results, outputDir)
			if err != nil {
				return fmt.Errorf("failed to generate report: %v", err)
			}
			fmt.Printf("\nReport generated: %s\n", reportPath)
		}

		return nil
	},
}

func init() {
	runCmd.Flags().StringVarP(&technologies, "tech", "t", "all", "Comma-separated list of technologies to test (use 'all' for all available)")
	runCmd.Flags().StringVarP(&tests, "test", "e", "all", "Comma-separated list of tests to run (use 'all' for all available)")
	runCmd.Flags().StringVarP(&outputDir, "output-dir", "o", "./reports", "Directory to save the report")
	runCmd.Flags().StringVar(&rpsDuration, "rps-duration", "15s", "Duration for RPS test")
	runCmd.Flags().IntVar(&rpsConnections, "rps-connections", 100, "Number of concurrent connections for RPS test")
}

func parseList(input string) []string {
	if input == "" {
		return []string{}
	}
	return strings.Split(input, ",")
}

func removeDuplicates(list []string) []string {
	seen := make(map[string]bool)
	result := []string{}
	for _, item := range list {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	return result
}
