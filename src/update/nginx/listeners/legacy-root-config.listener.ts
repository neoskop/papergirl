import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service.js';
import { Meta } from '../../../meta/interfaces/meta.interface.js';
import { NginxConfigFileService } from '../nginx-config-file.service.js';
import { ConfigListener } from './config.listener.js';

@Injectable()
export class LegacyRootConfigListener extends ConfigListener {
  constructor(
    protected readonly config: ConfigService,
    protected readonly nginxConfigFileService: NginxConfigFileService,
  ) {
    super(config, nginxConfigFileService, 'root.conf');
  }

  protected getConfigLines(_: Meta): string[] {
    return [];
  }

  protected shouldCreateConfigFile(_: Meta): boolean {
    return false;
  }
}
