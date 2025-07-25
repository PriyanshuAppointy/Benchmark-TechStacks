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

// Start server with better error handling
const server = serve({
  fetch: app.fetch,
  port: port,
}, (info) => {
  console.log(`Hono.js server started successfully on port ${info.port}`);
});

// For CI environments, run for a maximum time instead of waiting indefinitely  
const maxRunTime = 5 * 60 * 1000; // 5 minutes
const timeoutId = setTimeout(() => {
  console.log('Maximum run time reached, shutting down');
  process.exit(0);
}, maxRunTime);

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('Server shutting down...');
  clearTimeout(timeoutId);
  
  if (server && server.close) {
    server.close(() => {
      console.log('Server stopped gracefully');
      process.exit(0);
    });
  } else {
    console.log('Server stopped');
    process.exit(0);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 