import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { NotificationModule } from './notification/notification.module';
import { UpdateModule } from './update/update.module';
import { MetaModule } from './meta/meta.module';
import { AlertModule } from './alert/alert.module';

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
