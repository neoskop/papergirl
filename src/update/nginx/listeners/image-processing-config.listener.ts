import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service.js';
import { Meta } from '../../../meta/interfaces/meta.interface.js';
import { NginxConfigFileService } from '../nginx-config-file.service.js';
import { ConfigListener } from './config.listener.js';

@Injectable()
export class ImageProcessingConfigListener extends ConfigListener {
  constructor(
    protected readonly config: ConfigService,
    protected readonly nginxConfigFileService: NginxConfigFileService,
  ) {
    super(config, nginxConfigFileService, 'image_processing.conf');
  }

  protected getConfigLines(meta: Meta): string[] {
    const defaults = {
      quality: 85,
      imageType: 'original',
    };
    const args = Object.assign(defaults, meta.imageProcessing);

    return [
      `location ~* "^/(?<path>.+)-(?<width>\\d+)x(?<height>\\d+)\\.(?<ext>(jpg|jpeg|png|svg|svgz|gif|webp))$" {
        resolver 127.0.0.1:53 ipv6=off;
        set $upstream papergirl-image-proxy:8565;
        proxy_pass http://$upstream/rs,s:\${width}x\${height},m:fill,g:auto/q:${args.quality}/o:${args.imageType}?image=http://${this.config.serviceName}:8081/$path.$ext;
        proxy_hide_header cache-control;
        add_header Cache-Controll "public";
        expires 1y;
        access_log off;
        add_header Vary Accept;
        add_header Pragma "public";
    }`,
      `location ~* "^/(?<path>.+)-(?<width>\\d+)w\\.(?<ext>(jpg|jpeg|png|svg|svgz|gif|webp))$" {
      resolver 127.0.0.1:53 ipv6=off;
      set $upstream papergirl-image-proxy:8565;
      proxy_pass http://$upstream/rs,s:\${width},m:fill,g:auto/q:${args.quality}/o:${args.imageType}?image=http://${this.config.serviceName}:8081/$path.$ext;
      proxy_hide_header cache-control;
      add_header Vary Accept;
      add_header Cache-Controll "public";
      expires 1y;
      access_log off;
      add_header Pragma "public";
  }`,
      `location ~* "^/(?<path>.+)-(?<height>\\d+)h\\.(?<ext>(jpg|jpeg|png|svg|gif|webp))$" {
    resolver 127.0.0.1:53 ipv6=off;
    set $upstream papergirl-image-proxy:8565;
    proxy_pass http://$upstream/rs,s:x\${height},m:fill,g:auto/q:${args.quality}/o:${args.imageType}?image=http://${this.config.serviceName}:8081/$path.$ext;
    proxy_hide_header cache-control;
    add_header Cache-Controll "public";
    expires 1y;
    access_log off;
    add_header Vary Accept;
    add_header Pragma "public";
}`,
    ];
  }

  protected shouldCreateConfigFile(meta: Meta): boolean {
    return meta.imageProcessing?.enabled;
  }
}
