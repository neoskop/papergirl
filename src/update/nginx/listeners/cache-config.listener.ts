import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { Meta } from '../../../meta/meta.interface';
import { ConfigListener } from './config.listener';

@Injectable()
export class CacheConfigListener extends ConfigListener {
  constructor(config: ConfigService) {
    super(config, 'cache.conf');
  }

  protected getConfigLines(meta: Meta): string[] {
    const configLines = [
      `location ~* \\.(?:manifest|appcache|html|xml|json)$ {
          expires -1;
        }`,
      `location ~* (serviceWorker\\.js)$ {
          expires 10m;
          access_log off;
        }`,
      `location ~* \\.(?:css|js|woff|woff2)$ {
          add_header Cache-Controll "public";
          expires 1y;
          add_header Vary Accept;
          add_header Pragma "public";
          access_log off;
        }`,
    ];

    if (meta.imageProcessing?.enabled) {
      configLines.push(
        `location ~* (?!.+-(\\d+x\\d+|\\d+[wh])\\.(jpg|jpeg|gif|png|svg|svgz))(?=.+\\.(jpg|jpeg|gif|png|svg|svgz))^.+$ {
          add_header Cache-Controll "public";
          expires 1y;
          add_header Vary Accept;
          add_header Pragma "public";
          access_log off;
        }`,
        `location ~* \\.(?:ico|cur|gz|mp4|ogg|ogv|webm|htc)$ {
          add_header Cache-Controll "public";
          expires 1y;
          add_header Vary Accept;
          add_header Pragma "public";
          access_log off;
        }`,
      );
    } else {
      configLines.push(`location ~* \\.(?:jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc)$ {
          add_header Cache-Controll "public";
          expires 1y;
          add_header Vary Accept;
          add_header Pragma "public";
          access_log off;
        }`);
    }

    return configLines;
  }
  protected shouldCreateConfigFile(meta: Meta): boolean {
    return meta.cache?.headers;
  }
}
