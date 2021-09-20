import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { HealthModule } from '../health/health.module';
import { MetaModule } from '../meta/meta.module';
import { ColorPathService } from './color-path.service';
import { NginxService } from './nginx/nginx.service';
import { S3Service } from './s3/s3.service';
import { UpdateService } from './update.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheConfigListener } from './nginx/listeners/cache-config.listener';
import { ImageProcessingConfigListener } from './nginx/listeners/image-processing-config.listener';
import { RedirectsConfigListener } from './nginx/listeners/redirects-config.listener';
import { SecurityConfigListener } from './nginx/listeners/security-config.listener';
import { TrailingSlashConfigListener } from './nginx/listeners/trailing-slash-config.listener';

@Module({
  providers: [
    UpdateService,
    S3Service,
    NginxService,
    ColorPathService,
    CacheConfigListener,
    ImageProcessingConfigListener,
    RedirectsConfigListener,
    SecurityConfigListener,
    TrailingSlashConfigListener,
  ],
  imports: [
    ConfigModule,
    HealthModule,
    MetaModule,
    EventEmitterModule.forRoot(),
  ],
  exports: [UpdateService, ColorPathService],
})
export class UpdateModule {}
