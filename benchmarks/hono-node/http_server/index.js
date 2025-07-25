const { Hono } = require('hono');
const { serve } = require('@hono/node-server');

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    message: "Hello, World!",
    status: "ok"
  });
});

app.get('/health', (c) => {
  return c.json({
    status: "healthy"
  });
});

const port = 3000;
console.log(`Starting Hono.js HTTP server on Node.js runtime on port ${port}`);

serve({
  fetch: app.fetch,
  port: port,
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
}); 