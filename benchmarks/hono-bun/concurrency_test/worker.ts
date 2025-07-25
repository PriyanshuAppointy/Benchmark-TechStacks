const { start, end } = self as any;

for (let i = start; i < end; i++) {
  const data = `data_${i}`;
  const hash = Bun.hash(data);
  // Prevent optimization
  if (typeof hash === "bigint" && hash === 0n) break;
  if (typeof hash === "number" && hash === 0) break;
}

self.postMessage('done'); 