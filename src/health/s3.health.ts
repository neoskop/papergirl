import { S3, S3ClientConfig } from '@aws-sdk/client-s3';
import { HealthCheckError } from '@godaddy/terminus';
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  async isHealthy(
    key: string,
    clientOptions: S3ClientConfig,
    bucketName?: string,
  ): Promise<HealthIndicatorResult> {
    let isHealthy = false;
    let data: any;

    try {
      const client = new S3(clientOptions);

      if (client !== null) {
        if (bucketName) {
          isHealthy =
            (await client.listBuckets({})).Buckets.find(
              (bucket) => bucket.Name === bucketName,
            ) !== null;

          if (!isHealthy) {
            data = { message: `Bucket ${bucketName} does not exist` };
          }
        } else {
          await client.listBuckets({});
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
