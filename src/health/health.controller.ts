import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ConfigService } from '../config/config.service.js';
import { QueueHealthIndicator } from './queue.health.js';
import { S3HealthIndicator } from './s3.health.js';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private readonly queueHealthIndicator: QueueHealthIndicator,
    private readonly s3HealthIndicator: S3HealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  healthCheck() {
    return this.health.check([
      async () =>
        this.queueHealthIndicator.isHealthy('queue', this.config.queueUri),
      async () =>
        this.s3HealthIndicator.isHealthy('s3', this.config.s3ClientOptions),
    ]);
  }
}
