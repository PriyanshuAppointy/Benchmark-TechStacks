/// <reference types="bun-types" />

// Simple argument parser
const parseArgs = process.argv.slice(2).reduce((acc: Record<string, string>, arg: string) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const outputPath = parseArgs.output || 'test_data/temp_output_lines.json';
const iterations = parseInt(parseArgs.iterations || '10', 10);
const lineCount = parseInt(parseArgs.lines || '1000000', 10);

const sampleCategories = ["test", "benchmark", "data", "sample", "mock"];
const samplePriorities = ["low", "medium", "high", "critical"];
const sampleTags = [
  ["benchmark", "test"],
  ["data", "sample"],
  ["mock", "test", "data"],
  ["performance", "benchmark"],
  ["json", "test"]
];

interface SampleItem {
  id: number;
  name: string;
  description: string;
  category: string;
  priority: string;
  tags: string[];
  timestamp: string;
  value: number;
  active: boolean;
}

async function run() {
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    let content = '';
    
    for (let j = 0; j < lineCount; j++) {
      const item: SampleItem = {
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

    await Bun.write(outputPath, content);
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const opsPerSecond = (iterations / totalTimeMs) * 1000;

  // Clean up temp file
  try {
    await Bun.write(outputPath, '');
  } catch (err) {
    // Ignore cleanup errors
  }

  // Output JSON result to stdout
  console.log(JSON.stringify({
    operations: iterations,
    totalTimeMs: totalTimeMs,
    operationsPerSecond: opsPerSecond,
    linesPerIteration: lineCount,
  }));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
}); 