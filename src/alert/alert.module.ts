import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { AlertService } from './alert.service.js';

@Module({
  providers: [AlertService, Logger],
  imports: [ConfigModule],
  exports: [AlertService],
})
export class AlertModule {}
