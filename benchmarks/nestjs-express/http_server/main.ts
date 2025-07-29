import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const port = 3000;

async function bootstrap() {
  try {
    console.log('Starting NestJS with Express server...');
    
    // Create NestJS application with Express adapter (default)
    const app = await NestFactory.create(AppModule);
    
    // Configure Express-specific settings
    app.enableCors();
    
    console.log(`Starting NestJS with Express server on port ${port}`);
    
    await app.listen(port);
    console.log(`NestJS with Express server started successfully on port ${port}`);
    
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
      } catch (error) {
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
    
  } catch (error) {
    console.error('Error starting NestJS server:', error);
    process.exit(1);
  }
}

bootstrap(); 