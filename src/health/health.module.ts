import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '../config/config.module.js';
import { HealthController } from './health.controller.js';
import { ProbeController } from './probe.controller.js';
import { QueueHealthIndicator } from './queue.health.js';
import { ReadinessService } from './readiness.service.js';
import { S3HealthIndicator } from './s3.health.js';

@Module({
  imports: [ConfigModule, TerminusModule],
  providers: [QueueHealthIndicator, S3HealthIndicator, ReadinessService],
  exports: [QueueHealthIndicator, S3HealthIndicator, ReadinessService],
  controllers: [ProbeController, HealthController],
})
export class HealthModule {}
