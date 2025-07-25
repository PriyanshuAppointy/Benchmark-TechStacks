#!/bin/bash

set -e

echo "🚀 Setting up Performance Benchmark Suite..."

# Check if required tools are installed
echo "📋 Checking required tools..."

check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install $1 first."
        exit 1
    else
        echo "✅ $1 is installed: $(command -v $1)"
    fi
}

check_tool "go"
check_tool "node"
check_tool "bun"

# Build the orchestrator
echo "🔨 Building orchestrator..."
cd orchestrator
go mod tidy
go build -o benchmark-cli
echo "✅ Orchestrator built successfully"

# Generate test data
echo "📁 Generating test data..."
cd ..
node scripts/generate_test_data.js

# Create reports directory
echo "📊 Creating reports directory..."
mkdir -p reports

echo ""
echo "🎉 Setup complete! You can now run benchmarks with:"
echo "   ./orchestrator/benchmark-cli run --tech=all --test=all"
echo ""
echo "Available commands:"
echo "   ./orchestrator/benchmark-cli run --help"
echo "" 