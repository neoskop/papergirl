import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { Meta } from '../../../meta/meta.interface';
import { ConfigListener } from './config.listener';

@Injectable()
export class RedirectsConfigListener extends ConfigListener {
  constructor(config: ConfigService) {
    super(config, 'redirects.conf');
  }

  protected getConfigLines(meta: Meta): string[] {
    let configLines = [];
    let createdLocations = new Set();
    configLines = configLines.concat(
      meta.redirects.map((redirect) => {
        if (createdLocations.has(redirect.from)) {
          Logger.debug(
            `Ignoring duplicate location ${redirect.from} in redirects`,
          );
          return '';
        }
        createdLocations.add(redirect.from);
        const to = redirect.to.includes('?')
          ? redirect.to
          : `${redirect.to}$is_args$args`;
        const absoluteTo = to.match(/^http[s]?:\/\//i)
          ? to
          : `$thescheme://$host${to}`;
        return `location ${redirect.regex ? '~*' : '='} ${
          redirect.from
        } { return ${redirect.code || '301'} ${absoluteTo}; }`;
      }),
    );
    return configLines;
  }

  protected shouldCreateConfigFile(meta: Meta): boolean {
    return meta.redirects && meta.redirects.length > 0;
  }
}
