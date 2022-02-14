import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { Meta } from '../../../meta/interfaces/meta.interface';
import { ConfigListener } from './config.listener';

@Injectable()
export class SecurityConfigListener extends ConfigListener {
  constructor(config: ConfigService) {
    super(config, 'security.conf');
  }

  protected getConfigLines(meta: Meta): string[] {
    let configLines = [];

    if (meta.security) {
      if (meta.security.standardHeaders) {
        configLines = configLines.concat([
          'add_header X-Frame-Options SAMEORIGIN',
          'add_header X-XSS-Protection "1; mode=block"',
          'add_header X-Content-Type-Options nosniff',
          'add_header Referrer-Policy strict-origin-when-cross-origin',
        ]);
      }

      if (meta.security.hideVersion) {
        configLines.push('server_tokens off');
      }

      const csp = meta.security.csp;
      const nonceRegex = /'nonce-(.+?)'/;

      if (csp) {
        const staticNonce = (csp.match(nonceRegex) || [null])[1];

        if (staticNonce) {
          configLines = configLines.concat([
            'set_secure_random_alphanum $cspNonce 32',
            `add_header Content-Security-Policy "${csp.replace(
              nonceRegex,
              "'nonce-$cspNonce'",
            )}"`,
            `sub_filter '${staticNonce}' $cspNonce`,
            'sub_filter_once off',
          ]);
        } else {
          configLines.push(`add_header Content-Security-Policy "${csp}"`);
        }
      }
    }
    return configLines.map((line) => `${line};`);
  }

  protected shouldCreateConfigFile(_meta: Meta): boolean {
    return true;
  }
}
