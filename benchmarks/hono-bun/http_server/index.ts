import { Hono } from 'hono';
import { serve } from 'bun';

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

const server = serve({
  port: 3000,
  fetch: app.fetch,
});

console.log(`Starting Hono.js HTTP server on Bun runtime on port ${server.port}`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
}); 