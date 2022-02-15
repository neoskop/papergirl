import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '../../../config/config.service';
import { Meta } from '../../../meta/interfaces/meta.interface';
import { ConfigReadEvent } from '../events/config-read.event';
import * as fs from 'fs';
import { join } from 'path';
import { Redirect } from 'src/meta/interfaces/redirect.interface';
import { NginxConfigFile } from '../nginx-config-file/nginx-config-file';
import { NginxConfigFileService } from '../nginx-config-file.service';

@Injectable()
export class RedirectsConfigListener {
  constructor(
    private readonly config: ConfigService,
    private readonly nginxConfigFileService: NginxConfigFileService,
    private readonly logger: Logger,
  ) {}

  @OnEvent('config.read')
  async handleConfig(event: ConfigReadEvent) {
    await this.clearRedirectsDirectory();

    if (event.meta.multisite?.enabled) {
      await Promise.all(
        event.meta.multisite.sites.map((site) =>
          this.writeRedirectConfig(
            site.name,
            event.meta.redirects?.filter(
              (redirect) =>
                redirect.site === site.name || (site.default && !redirect.site),
            ),
          ),
        ),
      );
    } else {
      await this.writeRedirectConfig('default', event.meta.redirects);
    }
  }

  private async writeRedirectConfig(name: string, redirects: Redirect[]) {
    const configFilePath = join(this.config.nginxRedirectsDir, `${name}.conf`);
    const configFile = new NginxConfigFile(configFilePath);
    configFile.addLines(...this.getConfigLines(redirects));
    await this.nginxConfigFileService.write(configFile);
  }

  private async clearRedirectsDirectory() {
    await this.nginxConfigFileService.delete(
      new NginxConfigFile(join(this.config.nginxConfigDir, 'redirects.conf')),
    );
    const files = await fs.promises.readdir(this.config.nginxRedirectsDir);

    for (const file of files) {
      await fs.promises.unlink(join(this.config.nginxRedirectsDir, file));
    }
  }

  protected getConfigLines(redirects?: Redirect[]): string[] {
    let createdLocations = new Set();
    return (redirects || [])
      .map((redirect) => {
        if (createdLocations.has(redirect.from)) {
          this.logger.debug(
            `Ignoring duplicate location ${redirect.from} in redirects`,
          );
          return null;
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
      })
      .filter((line) => line !== null);
  }

  protected shouldCreateConfigFile(meta: Meta): boolean {
    return meta.redirects && meta.redirects.length > 0;
  }
}
