import { serve } from "bun";

const server = serve({
  port: 3000,
  fetch(req: Request) {
    const url = new URL(req.url);
    
    if (url.pathname === "/") {
      return new Response(JSON.stringify({
        message: "Hello, World!",
        status: "ok"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "healthy"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Starting Bun HTTP server on port ${server.port}`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
}); 