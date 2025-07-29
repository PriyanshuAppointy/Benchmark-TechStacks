/// <reference types="bun-types" />

// Simple argument parser
const parseArgs = process.argv.slice(2).reduce((acc: Record<string, string>, arg: string) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const filePath = parseArgs.file || 'test_data/xlarge_lines.txt';
const iterations = parseInt(parseArgs.iterations || '10', 10);

async function readFileLines(path: string): Promise<number> {
  const file = Bun.file(path);
  const text = await file.text();
  const lines = text.split('\n');
  // Filter out empty lines
  return lines.filter((line: string) => line.trim()).length;
}

async function run() {
  const startTime = process.hrtime.bigint();
  let totalLines = 0;

  for (let i = 0; i < iterations; i++) {
    const lineCount = await readFileLines(filePath);
    if (i === 0) {
      totalLines = lineCount;
    }
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const opsPerSecond = (iterations / totalTimeMs) * 1000;

  // Output JSON result to stdout
  console.log(JSON.stringify({
    operations: iterations,
    totalTimeMs: totalTimeMs,
    operationsPerSecond: opsPerSecond,
    linesPerFile: totalLines,
  }));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
}); 