"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
const port = 3000;
async function bootstrap() {
    try {
        console.log('Starting NestJS with Fastify server...');
        // Create NestJS application with Fastify adapter
        const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter({ logger: false }));
        // Configure CORS for Fastify
        app.enableCors();
        console.log(`Starting NestJS with Fastify server on port ${port}`);
        await app.listen(port, '0.0.0.0');
        console.log(`NestJS with Fastify server started successfully on port ${port}`);
        // For CI environments, run for a maximum time instead of waiting indefinitely  
        const maxRunTime = 5 * 60 * 1000; // 5 minutes
        const timeoutId = setTimeout(() => {
            console.log('Maximum run time reached, shutting down');
            process.exit(0);
        }, maxRunTime);
        // Handle graceful shutdown
        const gracefulShutdown = async () => {
            console.log('Server shutting down...');
            clearTimeout(timeoutId);
            try {
                await app.close();
                console.log('Server stopped gracefully');
                process.exit(0);
            }
            catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
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
    }
    catch (error) {
        console.error('Error starting NestJS server:', error);
        process.exit(1);
    }
}
bootstrap();
