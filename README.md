# Performance Benchmark Suite

A comprehensive benchmarking framework for comparing performance across different technologies (Go, Bun, Node.js) and various test types (RPS, File I/O, JSON operations, concurrency).

## Architecture

- **Orchestrator**: Go CLI tool that manages test execution, monitoring, and report generation
- **Benchmark Suites**: Technology-specific implementations (Go, Bun, Node.js)
- **Configuration**: YAML-based configuration for easy extensibility
- **Shared Resources**: Common test data and utilities

## Features

- **Configuration-Driven**: Add new technologies by simply updating a YAML file
- **Modular Design**: Easy to add new technologies or test types
- **Real-time Monitoring**: CPU and memory usage tracking during tests
- **Standardized Output**: JSON-based results for easy parsing and visualization
- **Reproducible Results**: System metadata and tool versions included in reports

## Quick Start

1. **Setup the environment:**
   ```bash
   # Run the setup script (recommended)
   ./scripts/setup.sh
   
   # Or manually:
   cd orchestrator
   go mod tidy
   go build -o benchmark-cli
   cd ..
   node scripts/generate_test_data.js
   ```

2. **Run benchmarks:**
   ```bash
   # Run all tests for all technologies
   ./orchestrator/benchmark-cli run --tech=all --test=all
   
   # Run specific tests for specific technologies
   ./orchestrator/benchmark-cli run --tech=go,bun --test=file_read,json_write
   
   # Run with custom parameters
   ./orchestrator/benchmark-cli run --tech=node --test=http_server --rps-duration=30s
   ```

3. **View results:**
   Results are saved as timestamped JSON files in the `reports/` directory.

## Project Structure

```
/performance-benchmark-suite
├── orchestrator/                 # Go CLI Tool
│   ├── config/                  # Configuration management
│   ├── runner/                  # Benchmark execution logic
│   └── report/                  # Report generation
├── benchmarks/                   # Technology-specific implementations
│   ├── go/                      # Go benchmarks
│   ├── bun/                     # Bun + TypeScript benchmarks
│   └── node/                    # Node.js benchmarks
├── config/                       # Technology configuration
│   └── technologies.yaml        # Technology definitions
├── test_data/                   # Shared test data
├── reports/                     # Generated reports
└── scripts/                     # Utility scripts
```

## Configuration

The framework uses a YAML configuration file (`config/technologies.yaml`) to define technologies and their benchmarks. This makes it easy to add new technologies without modifying the orchestrator code.

Example configuration:
```yaml
python:
  name: "Python"
  version_command: ["python", "--version"]
  benchmarks:
    file_read:
      command: ["python", "benchmarks/python/file_read/main.py"]
      type: "benchmark"
      default_params:
        file: "test_data/medium.txt"
        iterations: "1000"
```

## Adding New Technologies

1. **Create benchmark implementations:**
   - Create a new directory under `benchmarks/` (e.g., `benchmarks/python/`)
   - Implement benchmark scripts following the standardized input/output format
   - Each script should accept parameters via command-line arguments
   - Each script should output JSON results to stdout

2. **Update configuration:**
   - Add the new technology to `config/technologies.yaml`
   - Define the version command and benchmark commands
   - Specify default parameters for each benchmark type

That's it! The orchestrator will automatically detect and support the new technology.

## Adding New Test Types

1. Create test directories under each technology
2. Implement benchmark scripts with standardized JSON output
3. Add test configuration to `config/technologies.yaml`
4. The orchestrator will automatically support the new test type

## Test Data

The framework includes automatically generated test data files of various sizes:

- **Text files**: `small.txt` (1KB), `medium.txt` (1MB), `large.txt` (10MB)
- **JSON files**: `small.json` (1KB), `medium.json` (1MB), `large.json` (10MB)

To regenerate test data:
```bash
node scripts/generate_test_data.js
```

## License

MIT 