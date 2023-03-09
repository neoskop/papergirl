import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { NotificationModule } from './notification/notification.module.js';
import { UpdateModule } from './update/update.module.js';
import { MetaModule } from './meta/meta.module.js';
import { AlertModule } from './alert/alert.module.js';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    NotificationModule,
    UpdateModule,
    MetaModule,
    AlertModule,
  ],
  providers: [Logger],
})
export class AppModule {}
