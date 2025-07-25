package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Technologies map[string]Technology `yaml:"technologies"`
}

type Technology struct {
	Name           string               `yaml:"name"`
	VersionCommand []string             `yaml:"version_command"`
	Benchmarks     map[string]Benchmark `yaml:"benchmarks"`
}

type Benchmark struct {
	Command       []string          `yaml:"command"`
	Type          string            `yaml:"type"`
	Port          int               `yaml:"port,omitempty"`
	DefaultParams map[string]string `yaml:"default_params,omitempty"`
}

var globalConfig *Config

func LoadConfig(configPath string) (*Config, error) {
	if globalConfig != nil {
		return globalConfig, nil
	}

	// If no config path provided, look for default locations
	if configPath == "" {
		// Try relative to current directory
		configPath = "config/technologies.yaml"
		if _, err := os.Stat(configPath); os.IsNotExist(err) {
			// Try relative to project root (two levels up from orchestrator)
			configPath = filepath.Join("..", "..", "config", "technologies.yaml")
		}
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file %s: %v", configPath, err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %v", err)
	}

	globalConfig = &config
	return globalConfig, nil
}

func GetConfig() (*Config, error) {
	if globalConfig == nil {
		return LoadConfig("")
	}
	return globalConfig, nil
}

func (c *Config) GetTechnology(tech string) (*Technology, error) {
	if techConfig, exists := c.Technologies[tech]; exists {
		return &techConfig, nil
	}
	return nil, fmt.Errorf("technology '%s' not found in configuration", tech)
}

func (c *Config) GetBenchmark(tech, benchmark string) (*Benchmark, error) {
	techConfig, err := c.GetTechnology(tech)
	if err != nil {
		return nil, err
	}

	if benchConfig, exists := techConfig.Benchmarks[benchmark]; exists {
		return &benchConfig, nil
	}
	return nil, fmt.Errorf("benchmark '%s' not found for technology '%s'", benchmark, tech)
}

func (c *Config) ListTechnologies() []string {
	techs := make([]string, 0, len(c.Technologies))
	for tech := range c.Technologies {
		techs = append(techs, tech)
	}
	return techs
}

func (c *Config) ListBenchmarks(tech string) ([]string, error) {
	techConfig, err := c.GetTechnology(tech)
	if err != nil {
		return nil, err
	}

	benchmarks := make([]string, 0, len(techConfig.Benchmarks))
	for benchmark := range techConfig.Benchmarks {
		benchmarks = append(benchmarks, benchmark)
	}
	return benchmarks, nil
}

func (c *Config) ValidateTechnology(tech string) bool {
	_, exists := c.Technologies[tech]
	return exists
}

func (c *Config) ValidateBenchmark(tech, benchmark string) bool {
	techConfig, exists := c.Technologies[tech]
	if !exists {
		return false
	}
	_, exists = techConfig.Benchmarks[benchmark]
	return exists
}
