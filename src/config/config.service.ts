import * as Joi from '@hapi/joi';
import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { ClientOptions } from 'minio';

export interface EnvConfig {
  [key: string]: string;
}

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor(filePath: string) {
    const config = dotenv.parse(fs.readFileSync(filePath));
    this.envConfig = this.validateInput(config);
  }

  private validateInput(envConfig: EnvConfig): EnvConfig {
    const envVarsSchema: Joi.ObjectSchema = Joi.object({
      NODE_ENV: Joi.string()
        .valid('development', 'production', 'test', 'provision')
        .default('development'),
      ENABLE_SHUTDOWN_HOOKS: Joi.boolean().default(false),
      SERVER_PORT: Joi.number().default(8080),
      SERVER_BIND_ADDRESS: Joi.string()
        .valid(/([\d]{1,3}\.){3}[\d]{1,3}/)
        .default('0.0.0.0'),
      QUEUE_URI: Joi.string().required(),
      QUEUE_SUBJECT: Joi.string().default('papergirl'),
      S3_ENDPOINT: Joi.string().required(),
      S3_PORT: Joi.number().default(9000),
      S3_USESSL: Joi.boolean().default(false),
      S3_ACCESSKEY: Joi.string().required(),
      S3_SECRETKEY: Joi.string().required(),
      S3_BUCKETNAME: Joi.string().default('papergirl'),
      NGINX_ROOT_DIR: Joi.string().required(),
      NGINX_PID_PATH: Joi.string().required(),
    });

    const { error, value: validatedEnvConfig } = envVarsSchema.validate(
      envConfig,
    );
    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }
    return validatedEnvConfig;
  }

  get queueUri(): string {
    return this.envConfig.QUEUE_URI;
  }

  get queueSource(): string {
    return this.envConfig.QUEUE_SOURCE;
  }

  get queueSubject(): string {
    return this.envConfig.QUEUE_SUBJECT;
  }

  get s3ClientOptions(): ClientOptions {
    return {
      endPoint: this.envConfig.S3_ENDPOINT,
      port: Number(this.envConfig.S3_PORT),
      useSSL: Boolean(this.envConfig.S3_USESSL),
      accessKey: this.envConfig.S3_ACCESSKEY,
      secretKey: this.envConfig.S3_SECRETKEY,
    };
  }

  get s3BucketName(): string {
    return this.envConfig.S3_BUCKETNAME;
  }

  get enableShutdownHooks(): boolean {
    return Boolean(this.envConfig.enableShutdownHooks);
  }

  get serverPort(): number {
    return Number(this.envConfig.SERVER_PORT);
  }

  get serverBindAddress(): string {
    return this.envConfig.SERVER_BIND_ADDRESS;
  }

  get nginxRootDir(): string {
    return this.envConfig.NGINX_ROOT_DIR;
  }

  get nginxPidPath(): string {
    return this.envConfig.NGINX_PID_PATH;
  }
}
