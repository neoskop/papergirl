import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();
  const config: ConfigService = app.get(ConfigService);

  if (config.enableShutdownHooks) {
    app.enableShutdownHooks();
  }

  await app.listen(config.serverPort, config.serverBindAddress);
}

bootstrap();
