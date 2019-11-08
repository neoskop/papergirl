import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { QueueHealthIndicator } from './queue.health';
import { S3HealthIndicator } from './s3.health';
import { TerminusOptionsService } from './terminus-options.service';

@Module({
  imports: [
    ConfigModule,
    TerminusModule.forRootAsync({
      useClass: TerminusOptionsService,
      imports: [HealthModule, ConfigModule],
      inject: [QueueHealthIndicator, S3HealthIndicator, ConfigService],
    }),
  ],
  providers: [TerminusOptionsService, QueueHealthIndicator, S3HealthIndicator],
  exports: [QueueHealthIndicator, S3HealthIndicator, TerminusOptionsService],
})
export class HealthModule {}
