import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module.js';
import { ConfigService } from './config/config.service.js';
import { logFormat } from './log-format.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          level: 'debug',
          format: logFormat(),
        }),
      ],
    }),
  });
  await app.init();
  const config: ConfigService = app.get(ConfigService);

  if (config.enableShutdownHooks) {
    app.enableShutdownHooks();
  }

  await app.listen(config.serverPort, config.serverBindAddress);
}

bootstrap();
