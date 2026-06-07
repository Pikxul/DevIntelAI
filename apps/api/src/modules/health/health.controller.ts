import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectQueue('pipeline') private readonly pipelineQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic API liveness check' })
  getLiveness() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }

  @Get('db')
  @ApiOperation({ summary: 'Check database connection readiness' })
  async checkDb() {
    try {
      await this.connection.query('SELECT 1');
      return { status: 'OK', database: 'connected', timestamp: new Date().toISOString() };
    } catch (err) {
      throw new HttpException({
        status: 'DOWN',
        database: 'disconnected',
        error: err.message,
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('redis')
  @ApiOperation({ summary: 'Check Redis connection readiness' })
  async checkRedis() {
    try {
      const client = (this.pipelineQueue as any).client;
      await client.ping();
      return { status: 'OK', redis: 'connected', timestamp: new Date().toISOString() };
    } catch (err) {
      throw new HttpException({
        status: 'DOWN',
        redis: 'disconnected',
        error: err.message,
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
