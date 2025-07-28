package report

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"performance-benchmark-suite/orchestrator/config"

	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

type Report struct {
	Metadata Metadata          `json:"metadata"`
	Results  []BenchmarkResult `json:"results"`
}

type Metadata struct {
	ReportGeneratedAt string       `json:"reportGeneratedAt"`
	SystemInfo        SystemInfo   `json:"systemInfo"`
	ToolVersions      ToolVersions `json:"toolVersions"`
}

type SystemInfo struct {
	OS            string  `json:"os"`
	Arch          string  `json:"arch"`
	CPU           string  `json:"cpu"`
	Cores         int     `json:"cores"`
	TotalMemoryMB float64 `json:"totalMemoryMB"`
}

type ToolVersions struct {
	Versions map[string]string `json:"versions"`
}

type BenchmarkResult struct {
	Tech       string            `json:"tech"`
	Test       string            `json:"test"`
	Parameters map[string]string `json:"parameters"`
	Metrics    Metrics           `json:"metrics"`
}

type Metrics struct {
	OperationsPerSecond  float64 `json:"operationsPerSecond,omitempty"`
	TotalTimeMs          float64 `json:"totalTimeMs,omitempty"`
	RequestsPerSecond    float64 `json:"requestsPerSecond,omitempty"`
	LatencyAvgMs         float64 `json:"latencyAvgMs,omitempty"`
	LatencyP50Ms         float64 `json:"latencyP50Ms,omitempty"`
	LatencyP75Ms         float64 `json:"latencyP75Ms,omitempty"`
	LatencyP90Ms         float64 `json:"latencyP90Ms,omitempty"`
	LatencyP95Ms         float64 `json:"latencyP95Ms,omitempty"`
	LatencyP99Ms         float64 `json:"latencyP99Ms,omitempty"`
	ColdStartTimeMs      float64 `json:"coldStartTimeMs,omitempty"`
	MaxConcurrentClients int     `json:"maxConcurrentClients,omitempty"`
	MaxRequestsPerSecond float64 `json:"maxRequestsPerSecond,omitempty"`
	ConcurrencyThreshold float64 `json:"concurrencyThreshold,omitempty"`
	BuildTimeMs          float64 `json:"buildTimeMs,omitempty"`
	MaxMemoryMB          float64 `json:"maxMemoryMB"`
	AvgCPUPercent        float64 `json:"avgCpuPercent"`
}

type Generator struct{}

func NewGenerator() *Generator {
	return &Generator{}
}

func (g *Generator) GenerateReport(results []BenchmarkResult, outputDir string) (string, error) {
	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create output directory: %v", err)
	}

	// Gather system information
	systemInfo, err := g.gatherSystemInfo()
	if err != nil {
		return "", fmt.Errorf("failed to gather system info: %v", err)
	}

	// Gather tool versions
	toolVersions, err := g.gatherToolVersions()
	if err != nil {
		return "", fmt.Errorf("failed to gather tool versions: %v", err)
	}

	// Create the report
	report := Report{
		Metadata: Metadata{
			ReportGeneratedAt: time.Now().UTC().Format(time.RFC3339),
			SystemInfo:        systemInfo,
			ToolVersions:      toolVersions,
		},
		Results: results,
	}

	// Generate filename with timestamp
	timestamp := time.Now().UTC().Format("2006-01-02T15-04-05Z")
	filename := fmt.Sprintf("report_%s.json", timestamp)
	filepath := filepath.Join(outputDir, filename)

	// Write the report
	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to create report file: %v", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(report); err != nil {
		return "", fmt.Errorf("failed to encode report: %v", err)
	}

	return filepath, nil
}

func (g *Generator) gatherSystemInfo() (SystemInfo, error) {
	// Get host info
	hostInfo, err := host.Info()
	if err != nil {
		return SystemInfo{}, err
	}

	// Get memory info
	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return SystemInfo{}, err
	}

	return SystemInfo{
		OS:            hostInfo.Platform,
		Arch:          runtime.GOARCH,
		CPU:           hostInfo.Hostname, // Using hostname as fallback since CPUModel might not be available
		Cores:         runtime.NumCPU(),
		TotalMemoryMB: float64(memInfo.Total) / 1024 / 1024,
	}, nil
}

func (g *Generator) gatherToolVersions() (ToolVersions, error) {
	// Load configuration to get version commands
	cfg, err := config.GetConfig()
	if err != nil {
		return ToolVersions{Versions: make(map[string]string)}, nil
	}

	versions := make(map[string]string)

	// Get versions for all configured technologies
	for techKey, tech := range cfg.Technologies {
		if len(tech.VersionCommand) > 0 {
			if output, err := exec.Command(tech.VersionCommand[0], tech.VersionCommand[1:]...).Output(); err == nil {
				versions[techKey] = strings.TrimSpace(string(output))
			}
		}
	}

	return ToolVersions{Versions: versions}, nil
}
