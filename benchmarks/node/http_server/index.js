const http = require('http');

const server = http.createServer((req, res) => {
  const url = req.url;
  
  if (url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: "Hello, World!",
      status: "ok"
    }));
  } else if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: "healthy"
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const port = 3000;
server.listen(port, () => {
  console.log(`Starting Node.js HTTP server on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  server.close(() => {
    process.exit(0);
  });
}); 