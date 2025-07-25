// Simple argument parser
const args = process.argv.slice(2).reduce((acc: Record<string, string>, arg: string) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const MODE = args.mode || 'single';
const WORKLOAD = parseInt(args.workload || '1000000', 10);

async function run() {
  const startTime = process.hrtime.bigint();

  if (MODE === 'single') {
    // Single-threaded execution - simple hash computation
    let acc = 0;
    for (let i = 0; i < WORKLOAD; i++) {
      const data = `data_${i}`;
      const hash = Bun.hash(data);
      // Convert hash to number if it's a bigint
      acc ^= typeof hash === "bigint" ? Number(hash) : hash;
    }
    // Use acc so it is not optimized away
    if (Number.isNaN(acc)) process.exit(1);
  } else if (MODE === 'multi') {
    // Multi-threaded execution using Web Workers
    const numCPU = navigator.hardwareConcurrency || 4;
    const workPerCPU = Math.floor(WORKLOAD / numCPU);
    
    const workers = [];
    for (let cpu = 0; cpu < numCPU; cpu++) {
      const start = cpu * workPerCPU;
      const end = cpu === numCPU - 1 ? WORKLOAD : start + workPerCPU;
      
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        data: { start, end }
      });
      
      workers.push(new Promise((resolve, reject) => {
        worker.onmessage = resolve;
        worker.onerror = reject;
      }));
    }
    
    await Promise.all(workers);
  } else {
    console.error(`Invalid mode: ${MODE}. Use 'single' or 'multi'`);
    process.exit(1);
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const opsPerSecond = (WORKLOAD / totalTimeMs) * 1000;

  // Output JSON result to stdout
  console.log(JSON.stringify({
    operations: WORKLOAD,
    totalTimeMs: totalTimeMs,
    operationsPerSecond: opsPerSecond,
    mode: MODE,
  }));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
}); 