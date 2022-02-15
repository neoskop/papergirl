import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { UpdateModule } from '../update/update.module';
import { NotificationService } from './notification.service';

@Module({
  providers: [NotificationService, Logger],
  imports: [ConfigModule, UpdateModule],
})
export class NotificationModule {}
