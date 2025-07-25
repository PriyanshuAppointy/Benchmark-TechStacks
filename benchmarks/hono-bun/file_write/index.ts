// Simple argument parser
const args = process.argv.slice(2).reduce((acc: Record<string, string>, arg: string) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const outputPath = args.output || 'test_data/temp_output.txt';
const iterations = parseInt(args.iterations || '1000', 10);
const size = parseInt(args.size || '1024', 10);

async function main() {
  // Generate test data
  const testData = 'x'.repeat(size);

  const startTime = process.hrtime.bigint();

  // Write the file multiple times
  for (let i = 0; i < iterations; i++) {
    await Bun.write(outputPath, testData);
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const opsPerSecond = (iterations / totalTimeMs) * 1000;

  // Clean up
  try {
    await Bun.file(outputPath).exists() && await require('fs').promises.unlink(outputPath);
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