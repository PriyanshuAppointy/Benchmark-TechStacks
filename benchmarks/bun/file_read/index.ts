// Simple argument parser
const args = process.argv.slice(2).reduce((acc: Record<string, string>, arg: string) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const FILE_PATH = args.file || 'test_data/medium.txt';
const ITERATIONS = parseInt(args.iterations || '1000', 10);

async function run() {
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < ITERATIONS; i++) {
    await Bun.file(FILE_PATH).text();
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