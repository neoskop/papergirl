import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { Meta } from '../../../meta/interfaces/meta.interface';
import { ConfigListener } from './config.listener';

@Injectable()
export class LegacyRootConfigListener extends ConfigListener {
  constructor(config: ConfigService) {
    super(config, 'root.conf');
  }

  protected getConfigLines(_: Meta): string[] {
    return [];
  }

  protected shouldCreateConfigFile(_: Meta): boolean {
    return false;
  }
}
