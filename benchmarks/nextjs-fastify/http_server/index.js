const fastify = require('fastify')({ logger: false });
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
  // Register Next.js handler
  fastify.all('/*', async (request, reply) => {
    return handle(request.raw, reply.raw).then(() => {
      reply.sent = true;
    });
  });

  // Add specific routes for benchmark endpoints
  fastify.get('/', async (request, reply) => {
    reply.type('application/json').code(200);
    return {
      message: "Hello, World!",
      status: "ok"
    };
  });

  fastify.get('/health', async (request, reply) => {
    reply.type('application/json').code(200);
    return {
      status: "healthy"
    };
  });

  console.log(`Starting Next.js with Fastify server on port ${port}`);

  fastify.listen({ port }, (err, address) => {
    if (err) {
      console.error('Error starting server:', err);
      process.exit(1);
    }
    console.log(`Next.js with Fastify server started successfully on ${address}`);
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
    
    fastify.close(() => {
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