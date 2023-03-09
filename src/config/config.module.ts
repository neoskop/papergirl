import { Logger, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigService } from './config.service.js';

@Module({
  providers: [ConfigService, Logger],
  exports: [ConfigService],
  imports: [EventEmitterModule.forRoot()],
})
export class ConfigModule {}
