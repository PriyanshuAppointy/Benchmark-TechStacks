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

const OUTPUT_PATH = args.output || path.join(__dirname, '../../../test_data/temp_output_lines.json');
const ITERATIONS = parseInt(args.iterations || '10', 10);
const LINE_COUNT = parseInt(args.lines || '1000000', 10);

const sampleCategories = ["test", "benchmark", "data", "sample", "mock"];
const samplePriorities = ["low", "medium", "high", "critical"];
const sampleTags = [
  ["benchmark", "test"],
  ["data", "sample"],
  ["mock", "test", "data"],
  ["performance", "benchmark"],
  ["json", "test"]
];

async function run() {
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < ITERATIONS; i++) {
    let content = '';
    
    for (let j = 0; j < LINE_COUNT; j++) {
      const item = {
        id: j + 1,
        name: `Item_${String(j + 1).padStart(7, '0')}`,
        description: `Sample item ${j + 1} for benchmarking JSON line operations`,
        category: sampleCategories[j % sampleCategories.length],
        priority: samplePriorities[j % samplePriorities.length],
        tags: sampleTags[j % sampleTags.length],
        timestamp: new Date(Date.now() + j * 1000).toISOString(),
        value: j * 100,
        active: j % 3 === 0
      };
      
      content += JSON.stringify(item) + '\n';
    }

    await fs.writeFile(OUTPUT_PATH, content);
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const opsPerSecond = (ITERATIONS / totalTimeMs) * 1000;

  // Clean up temp file
  try {
    await fs.unlink(OUTPUT_PATH);
  } catch (err) {
    // Ignore cleanup errors
  }

  // Output JSON result to stdout
  console.log(JSON.stringify({
    operations: ITERATIONS,
    totalTimeMs: totalTimeMs,
    operationsPerSecond: opsPerSecond,
    linesPerIteration: LINE_COUNT,
  }));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
}); 