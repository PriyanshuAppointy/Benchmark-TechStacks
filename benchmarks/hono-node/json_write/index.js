const fs = require('fs').promises;
const path = require('path');

// Simple argument parser
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const outputPath = args.output || path.join('test_data', 'temp_output.json');
const iterations = parseInt(args.iterations || '1000', 10);
const size = parseInt(args.size || '100', 10);

async function main() {
  // Generate test JSON data
  const testData = {
    id: 1,
    name: "test_object",
    data: Array.from({ length: size }, (_, i) => ({
      index: i,
      value: `item_${i}`,
      timestamp: Date.now()
    }))
  };

  const startTime = process.hrtime.bigint();

  // Write JSON file multiple times
  for (let i = 0; i < iterations; i++) {
    await fs.writeFile(outputPath, JSON.stringify(testData));
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const opsPerSecond = (iterations / totalTimeMs) * 1000;

  // Clean up
  try {
    await fs.unlink(outputPath);
  } catch (err) {
    // Ignore cleanup errors
  }

  // Output JSON result to stdout
  console.log(JSON.stringify({
    operations: iterations,
    totalTimeMs: totalTimeMs,
    operationsPerSecond: opsPerSecond,
  }));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 