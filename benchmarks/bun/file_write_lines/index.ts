/// <reference types="bun-types" />

// Simple argument parser
const parseArgs = process.argv.slice(2).reduce((acc: Record<string, string>, arg: string) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const outputPath = parseArgs.output || 'test_data/temp_output_lines.txt';
const iterations = parseInt(parseArgs.iterations || '10', 10);
const lineCount = parseInt(parseArgs.lines || '1000000', 10);

const sampleTexts = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa.",
];

async function run() {
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    let content = '';
    
    for (let j = 0; j < lineCount; j++) {
      const textIndex = j % sampleTexts.length;
      const lineNumber = String(j + 1).padStart(7, '0');
      content += `Line ${lineNumber}: ${sampleTexts[textIndex]}\n`;
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