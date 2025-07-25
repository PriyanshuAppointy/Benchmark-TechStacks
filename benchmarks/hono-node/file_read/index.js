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

const filePath = args.file || path.join('test_data', 'medium.txt');
const iterations = parseInt(args.iterations || '1000', 10);

async function main() {
  // Check if file exists
  try {
    await fs.access(filePath);
  } catch (err) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const startTime = process.hrtime.bigint();

  // Read the file multiple times
  for (let i = 0; i < iterations; i++) {
    await fs.readFile(filePath, 'utf8');
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const opsPerSecond = (iterations / totalTimeMs) * 1000;

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