import { HealthCheckError } from '@godaddy/terminus';
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { connect } from 'ts-nats';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  async isHealthy(
    key: string,
    queueUri: string,
  ): Promise<HealthIndicatorResult> {
    let isHealthy: boolean = false;
    let data: any;

    try {
      const client = await connect(queueUri);

      if (client !== null) {
        isHealthy = true;
        client.close();
      }
    } catch (err) {
      data = { message: err.message };
    }

    const result = this.getStatus(key, isHealthy, data);

    if (isHealthy) {
      return result;
    }

    throw new HealthCheckError('Health check of NATS server failed', result);
  }
}
