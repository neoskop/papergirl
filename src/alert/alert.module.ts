import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { AlertService } from './alert.service';

@Module({
  providers: [AlertService, Logger],
  imports: [ConfigModule],
  exports: [AlertService],
})
export class AlertModule {}
