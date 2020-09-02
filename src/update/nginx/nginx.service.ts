import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { ConfigService } from '../../config/config.service';
import { Meta } from '../../meta/meta.interface';

@Injectable()
export class NginxService implements OnApplicationBootstrap {
  constructor(private config: ConfigService) {}

  public async onApplicationBootstrap() {
    try {
      await fs.promises.access(this.config.nginxConfigDir, fs.constants.W_OK);
    } catch (err) {
      if (err.code === 'ENOENT') {
        Logger.debug(`Config dir ${this.config.nginxConfigDir} does not exist`);
      } else if (err.code === 'EACCES') {
        throw new Error(
          `Config dir ${this.config.nginxConfigDir} is not writable`,
        );
      } else {
        throw err;
      }
    }
  }

  public async configure(meta: Meta) {
    const configFilePath = join(this.config.nginxConfigDir, 'security.conf');
    let configLines = [];

    if (meta && meta.security) {
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

    await fs.promises.writeFile(
      configFilePath,
      configLines.length > 0 ? `${configLines.join(';\n')};` : '',
    );
  }

  public async getActiveRootDir(): Promise<string> {
    const configFilePath = join(this.config.nginxConfigDir, 'root.conf');
    const configFileContents = (
      await fs.promises.readFile(configFilePath)
    ).toString();
    const match = /root (.+?);/.exec(configFileContents);

    if (!match) {
      throw new Error(
        `Root path is not correctly specified in ${configFilePath}`,
      );
    }

    Logger.debug(`Active root dir of NGINX is ${match[1]}`);
    return match[1];
  }

  public async switchRootDir(path: string) {
    await fs.promises.writeFile(
      join(this.config.nginxConfigDir, 'root.conf'),
      `root ${path};`,
    );
    await this.reload();
    Logger.debug(`Switched NGINX root dir to ${path}`);
  }

  private async reload() {
    const pid = Number(await fs.promises.readFile(this.config.nginxPidPath));

    try {
      process.kill(pid, 'SIGHUP');
    } catch (err) {
      if (err.code === 'EPERM') {
        throw new Error(
          `Sending a signal to NGINX is not permitted - is it running with UID ${process.getuid()}?`,
        );
      }
    }
  }
}
