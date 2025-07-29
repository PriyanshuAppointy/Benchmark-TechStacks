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

const OUTPUT_PATH = args.output || path.join(__dirname, '../../../test_data/temp_output_lines.txt');
const ITERATIONS = parseInt(args.iterations || '10', 10);
const LINE_COUNT = parseInt(args.lines || '1000000', 10);

const sampleTexts = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa.",
];

async function run() {
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < ITERATIONS; i++) {
    let content = '';
    
    for (let j = 0; j < LINE_COUNT; j++) {
      const textIndex = j % sampleTexts.length;
      const lineNumber = String(j + 1).padStart(7, '0');
      content += `Line ${lineNumber}: ${sampleTexts[textIndex]}\n`;
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