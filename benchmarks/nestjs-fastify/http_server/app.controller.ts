import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/')
  getRoot() {
    return {
      message: "Hello, World!",
      status: "ok"
    };
  }

  @Get('/health')
  getHealth() {
    return {
      status: "healthy"
    };
  }

  @Get('/api/test')
  getApiTest() {
    return {
      framework: "NestJS",
      adapter: "Fastify",
      timestamp: new Date().toISOString()
    };
  }
} 