import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { HealthModule } from '../health/health.module';
import { MetaModule } from '../meta/meta.module';
import { NginxService } from './nginx/nginx.service';
import { S3Service } from './s3/s3.service';
import { UpdateService } from './update.service';

@Module({
  providers: [UpdateService, S3Service, NginxService],
  imports: [ConfigModule, HealthModule, MetaModule],
  exports: [UpdateService],
})
export class UpdateModule {}
