import { Logger, Module } from '@nestjs/common';
import { AlertModule } from '../alert/alert.module.js';
import { ConfigModule } from '../config/config.module.js';
import { UpdateModule } from '../update/update.module.js';
import { NotificationService } from './notification.service.js';

@Module({
  providers: [NotificationService, Logger],
  imports: [ConfigModule, UpdateModule, AlertModule],
})
export class NotificationModule {}
