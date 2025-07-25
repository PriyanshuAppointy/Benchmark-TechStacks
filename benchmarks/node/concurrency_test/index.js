const crypto = require('crypto');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Simple arg parser
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

const MODE = args.mode || 'single';
const WORKLOAD = parseInt(args.workload || '1000000', 10);

if (isMainThread) {
  // Main thread
  async function run() {
    const startTime = process.hrtime.bigint();

    if (MODE === 'single') {
      // Single-threaded execution
      for (let i = 0; i < WORKLOAD; i++) {
        const data = `data_${i}`;
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        // Prevent optimization
        if (hash.length === 0) break;
      }
    } else if (MODE === 'multi') {
      // Multi-threaded execution
      const numCPU = os.cpus().length;
      const workPerCPU = Math.floor(WORKLOAD / numCPU);
      
      const workers = [];
      for (let cpu = 0; cpu < numCPU; cpu++) {
        const start = cpu * workPerCPU;
        const end = cpu === numCPU - 1 ? WORKLOAD : start + workPerCPU;
        
        const worker = new Worker(__filename, {
          workerData: { start, end }
        });
        
        workers.push(new Promise((resolve, reject) => {
          worker.on('message', resolve);
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
          });
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
} else {
  // Worker thread
  const { start, end } = workerData;
  
  for (let i = start; i < end; i++) {
    const data = `data_${i}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    // Prevent optimization
    if (hash.length === 0) break;
  }
  
  parentPort.postMessage('done');
} 