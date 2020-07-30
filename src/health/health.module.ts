import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '../config/config.module';
import { HealthController } from './health.controller';
import { ProbeController } from './probe.controller';
import { QueueHealthIndicator } from './queue.health';
import { ReadinessService } from './readiness.service';
import { S3HealthIndicator } from './s3.health';

@Module({
  imports: [ConfigModule, TerminusModule],
  providers: [QueueHealthIndicator, S3HealthIndicator, ReadinessService],
  exports: [QueueHealthIndicator, S3HealthIndicator, ReadinessService],
  controllers: [ProbeController, HealthController],
})
export class HealthModule {}
