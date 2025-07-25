const fs = require('fs/promises');
const path = require('path');

// Simple arg parser
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const OUTPUT_PATH = args.output || path.join(__dirname, '../../../test_data/temp_output.txt');
const ITERATIONS = parseInt(args.iterations || '1000', 10);
const DATA_SIZE = parseInt(args.size || '1024', 10);

async function run() {
  // Create test data
  const testData = Buffer.alloc(DATA_SIZE);
  for (let i = 0; i < DATA_SIZE; i++) {
    testData[i] = i % 256;
  }

  const startTime = process.hrtime.bigint();

  // Write the data multiple times
  for (let i = 0; i < ITERATIONS; i++) {
    await fs.writeFile(OUTPUT_PATH, testData);
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const opsPerSecond = (ITERATIONS / totalTimeMs) * 1000;

  // Output JSON result to stdout
  console.log(JSON.stringify({
    operations: ITERATIONS,
    totalTimeMs: totalTimeMs,
    operationsPerSecond: opsPerSecond,
  }));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
}); 