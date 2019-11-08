import { HealthCheckError } from '@godaddy/terminus';
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import * as Minio from 'minio';

@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  async isHealthy(
    key: string,
    clientOptions: Minio.ClientOptions,
    bucketName: string,
  ): Promise<HealthIndicatorResult> {
    let isHealthy: boolean = false;
    let data: any;

    try {
      const client = new Minio.Client(clientOptions);

      if (client !== null) {
        if (bucketName !== null) {
          isHealthy = await client.bucketExists(bucketName);

          if (!isHealthy) {
            data = { message: `Bucket ${bucketName} does not exist` };
          }
        } else {
          await client.listBuckets();
          isHealthy = true;
        }
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
