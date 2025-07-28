const express = require('express');
const next = require('next');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ 
  dev,
  dir: path.join(__dirname, '..')
});
const handle = app.getRequestHandler();

const port = 3000;

app.prepare().then(() => {
  const server = express();

  // Add specific routes for benchmark endpoints
  server.get('/', (req, res) => {
    res.json({
      message: "Hello, World!",
      status: "ok"
    });
  });

  server.get('/health', (req, res) => {
    res.json({
      status: "healthy"
    });
  });

  // Handle all other routes with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  console.log(`Starting Next.js with Express server on port ${port}`);

  const httpServer = server.listen(port, (err) => {
    if (err) {
      console.error('Error starting server:', err);
      process.exit(1);
    }
    console.log(`Next.js with Express server started successfully on port ${port}`);
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
    
    httpServer.close(() => {
      console.log('Server stopped gracefully');
      process.exit(0);
    });
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
}).catch((err) => {
  console.error('Error during Next.js preparation:', err);
  process.exit(1);
}); 