import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { Meta } from '../../../meta/interfaces/meta.interface';
import { ConfigListener } from './config.listener';

@Injectable()
export class TrailingSlashConfigListener extends ConfigListener {
  constructor(config: ConfigService) {
    super(config, 'trailing_slash.conf');
  }

  protected getConfigLines(meta: Meta): string[] {
    return [
      `location ~ (?<no_slash>.+)/$ {
    return 301 $thescheme://$host$no_slash;
}`,
    ];
  }

  protected shouldCreateConfigFile(meta: Meta): boolean {
    return meta.removeTrailingSlash;
  }
}
