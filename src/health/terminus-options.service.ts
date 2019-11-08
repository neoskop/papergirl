import { Injectable } from '@nestjs/common';
import {
  TerminusEndpoint,
  TerminusModuleOptions,
  TerminusOptionsFactory,
} from '@nestjs/terminus';
import { ConfigService } from '../config/config.service';
import { QueueHealthIndicator } from './queue.health';
import { S3HealthIndicator } from './s3.health';

@Injectable()
export class TerminusOptionsService implements TerminusOptionsFactory {
  constructor(
    private readonly queueHealthIndicator: QueueHealthIndicator,
    private readonly s3HealthIndicator: S3HealthIndicator,
    private readonly config: ConfigService,
  ) {}

  createTerminusOptions(): TerminusModuleOptions {
    const healthEndpoint: TerminusEndpoint = {
      url: '/health',
      healthIndicators: [
        async () =>
          this.queueHealthIndicator.isHealthy('queue', this.config.queueUri),
        async () =>
          this.s3HealthIndicator.isHealthy(
            's3',
            this.config.s3ClientOptions,
            this.config.s3BucketName,
          ),
      ],
    };
    return {
      endpoints: [healthEndpoint],
    };
  }
}
