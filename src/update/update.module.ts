import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { HealthModule } from '../health/health.module.js';
import { MetaModule } from '../meta/meta.module.js';
import { ColorPathService } from './color-path.service.js';
import { NginxService } from './nginx/nginx.service.js';
import { S3Service } from './s3/s3.service.js';
import { UpdateService } from './update.service.js';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheConfigListener } from './nginx/listeners/cache-config.listener.js';
import { ImageProcessingConfigListener } from './nginx/listeners/image-processing-config.listener.js';
import { RedirectsConfigListener } from './nginx/listeners/redirects-config.listener.js';
import { SecurityConfigListener } from './nginx/listeners/security-config.listener.js';
import { TrailingSlashConfigListener } from './nginx/listeners/trailing-slash-config.listener.js';
import { MultisiteConfigListener } from './nginx/listeners/multisite-config-listener.js';
import { LegacyRootConfigListener } from './nginx/listeners/legacy-root-config.listener.js';
import { NginxConfigFileService } from './nginx/nginx-config-file.service.js';
import { AlertModule } from '../alert/alert.module.js';

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
    MultisiteConfigListener,
    LegacyRootConfigListener,
    NginxConfigFileService,
    Logger,
  ],
  imports: [
    ConfigModule,
    HealthModule,
    MetaModule,
    EventEmitterModule.forRoot(),
    AlertModule,
  ],
  exports: [UpdateService, ColorPathService],
})
export class UpdateModule {}
