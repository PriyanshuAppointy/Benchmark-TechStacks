// Simple argument parser
const args = process.argv.slice(2).reduce((acc: Record<string, string>, arg: string) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const filePath = args.file || 'test_data/medium.txt';
const iterations = parseInt(args.iterations || '1000', 10);

async function main() {
  // Check if file exists
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const startTime = process.hrtime.bigint();

  // Read the file multiple times
  for (let i = 0; i < iterations; i++) {
    await file.text();
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