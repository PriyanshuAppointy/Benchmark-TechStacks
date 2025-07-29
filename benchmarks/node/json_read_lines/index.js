const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Simple arg parser
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const FILE_PATH = args.file || path.join(__dirname, '../../../test_data/xlarge_lines.json');
const ITERATIONS = parseInt(args.iterations || '10', 10);

async function readJsonLines(filePath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineCount = 0;
    rl.on('line', (line) => {
      if (line.trim()) {
        try {
          JSON.parse(line);
          lineCount++;
        } catch (err) {
          reject(new Error(`Error parsing JSON line ${lineCount + 1}: ${err.message}`));
          return;
        }
      }
    });

    rl.on('close', () => {
      resolve(lineCount);
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  const startTime = process.hrtime.bigint();
  let totalLines = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    const lineCount = await readJsonLines(FILE_PATH);
    if (i === 0) {
      totalLines = lineCount;
    }
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const opsPerSecond = (ITERATIONS / totalTimeMs) * 1000;

  // Output JSON result to stdout
  console.log(JSON.stringify({
    operations: ITERATIONS,
    totalTimeMs: totalTimeMs,
    operationsPerSecond: opsPerSecond,
    linesPerFile: totalLines,
  }));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
}); 