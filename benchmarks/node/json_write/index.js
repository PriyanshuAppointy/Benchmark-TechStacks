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

const OUTPUT_PATH = args.output || path.join(__dirname, '../../../test_data/temp_output.json');
const ITERATIONS = parseInt(args.iterations || '1000', 10);
const DATA_SIZE = parseInt(args.size || '100', 10);

async function run() {
  // Create test data
  const testData = [];
  for (let i = 0; i < DATA_SIZE; i++) {
    testData.push({
      id: i,
      name: `Item_${i}`,
      tags: ['tag1', 'tag2', 'tag3'],
      metadata: {
        created: Date.now(),
        version: '1.0',
        active: true,
      },
    });
  }

  const startTime = process.hrtime.bigint();

  // Serialize and write JSON multiple times
  for (let i = 0; i < ITERATIONS; i++) {
    const jsonData = JSON.stringify(testData, null, 2);
    await fs.writeFile(OUTPUT_PATH, jsonData);
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