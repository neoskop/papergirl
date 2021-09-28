import * as Joi from '@hapi/joi';
import { Injectable, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { S3ClientConfig } from '@aws-sdk/client-s3';

export interface EnvConfig {
  [key: string]: string;
}

@Injectable()
export class ConfigService {
  private envConfig: EnvConfig;

  constructor(eventEmitter: EventEmitter2) {
    const filePath = `config/${process.env.CONFIG || 'local'}.env`;
    this.readConfigFile(filePath);
    chokidar
      .watch(filePath, { followSymlinks: true, atomic: true })
      .on('change', () => {
        try {
          this.readConfigFile(filePath);
          eventEmitter.emit('config.reloaded');
        } catch (err) {
          Logger.error(`Could not reload Papergirl config: ${err}`);
        }
      });
  }

  private readConfigFile(filePath: string) {
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
      SERVICE_NAME: Joi.string().default('papergirl'),
      QUEUE_URI: Joi.string().required(),
      QUEUE_SUBJECT: Joi.string().default('papergirl'),
      S3_ENDPOINT: Joi.string().required(),
      S3_REGION: Joi.string().default('us-east-1'),
      S3_PORT: Joi.number().default(9000),
      S3_USESSL: Joi.boolean().default(false),
      S3_ACCESSKEY: Joi.string().required(),
      S3_SECRETKEY: Joi.string().required(),
      S3_BUCKETNAME: Joi.string().default('papergirl'),
      CONCURRENCY: Joi.string().default(10),
      NGINX_ROOT_DIR: Joi.string().required(),
      NGINX_DIR_BLACK: Joi.string().default('black'),
      NGINX_DIR_RED: Joi.string().default('red'),
      NGINX_PID_PATH: Joi.string().required(),
      NGINX_CONFIG_DIR: Joi.string().required(),
      NGINX_SITES_DIR: Joi.string().required(),
      NGINX_REDIRECTS_DIR: Joi.string().required(),
    });

    const { error, value: validatedEnvConfig } =
      envVarsSchema.validate(envConfig);
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

  get s3ClientOptions(): S3ClientConfig {
    return {
      credentials: {
        accessKeyId: this.envConfig.S3_ACCESSKEY,
        secretAccessKey: this.envConfig.S3_SECRETKEY,
      },
      endpoint: `${Boolean(this.envConfig.S3_USESSL) ? 'https' : 'http'}://${
        this.envConfig.S3_ENDPOINT
      }:${this.envConfig.S3_PORT}`,
      region: this.envConfig.S3_REGION,
      tls: Boolean(this.envConfig.S3_USESSL),
    };
  }

  get s3AccessKey(): string {
    return this.envConfig.S3_ACCESSKEY;
  }

  get S3SecretKey(): string {
    return this.envConfig.S3_SECRETKEY;
  }

  get s3Region(): string {
    return this.envConfig.S3_REGION;
  }

  get s3BucketName(): string {
    return this.envConfig.S3_BUCKETNAME;
  }

  get concurrency(): number {
    return Number(this.envConfig.CONCURRENCY);
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

  get serviceName(): string {
    return this.envConfig.SERVICE_NAME;
  }

  get nginxRootDir(): string {
    return this.envConfig.NGINX_ROOT_DIR;
  }

  get nginxPidPath(): string {
    return this.envConfig.NGINX_PID_PATH;
  }

  get nginxConfigDir(): string {
    return this.envConfig.NGINX_CONFIG_DIR;
  }

  get nginxSitesDir(): string {
    return this.envConfig.NGINX_SITES_DIR;
  }

  get nginxRedirectsDir(): string {
    return this.envConfig.NGINX_REDIRECTS_DIR;
  }

  get nginxDirBlack(): string {
    return this.envConfig.NGINX_DIR_BLACK;
  }

  get nginxDirRed(): string {
    return this.envConfig.NGINX_DIR_RED;
  }
}
