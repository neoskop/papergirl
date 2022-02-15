import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { join } from 'path';
import { ConfigService } from '../../../config/config.service';
import { ConfigReadEvent } from '../events/config-read.event';
import { NginxConfigFile } from '../nginx-config-file/nginx-config-file';
import * as fs from 'fs';
import { Site } from '../../../meta/interfaces/site.interface';
import { RootChangedEvent } from '../events/root-changed.event';
import { NginxConfigFileService } from '../nginx-config-file.service';

@Injectable()
export class MultisiteConfigListener {
  constructor(
    protected readonly config: ConfigService,
    protected readonly nginxConfigFileService: NginxConfigFileService,
  ) {}

  @OnEvent('config.read')
  async handleConfig(event: ConfigReadEvent) {
    await this.clearSitesDirectory();

    if (event.meta.multisite?.enabled) {
      await Promise.all(
        event.meta.multisite.sites.map((site) =>
          this.writeSiteConfig(event.rootPath, site, `/${site.name}/`),
        ),
      );
    } else {
      await this.writeSiteConfig(event.rootPath, {
        name: 'default',
        hostnames: ['_'],
        default: true,
      });
    }
  }

  @OnEvent('root.changed')
  async handleRootChange(event: RootChangedEvent) {
    const files = await fs.promises.readdir(this.config.nginxSitesDir);

    for (const file of files) {
      const config = await fs.promises.readFile(
        join(this.config.nginxSitesDir, file),
        'utf8',
      );
      var result = config.replace(
        new RegExp(
          `(?<=root )(${join(
            this.config.nginxRootDir,
            this.config.nginxDirBlack,
          )}|${join(
            this.config.nginxRootDir,
            this.config.nginxDirRed,
          )})(?=.*;)`,
        ),
        event.rootPath,
      );
      await fs.promises.writeFile(
        join(this.config.nginxSitesDir, file),
        result,
        'utf8',
      );
    }
  }

  private async clearSitesDirectory() {
    const files = await fs.promises.readdir(this.config.nginxSitesDir);

    for (const file of files) {
      await fs.promises.unlink(join(this.config.nginxSitesDir, file));
    }
  }

  private async writeSiteConfig(
    rootPath: string,
    site: Site,
    prefix: string = '',
  ) {
    const configFilePath = join(this.config.nginxSitesDir, `${site.name}.conf`);
    const configFile = new NginxConfigFile(configFilePath);
    configFile.addLines(this.getSiteConfig(rootPath, site, prefix));
    await this.nginxConfigFileService.write(configFile);
  }

  private getSiteConfig(rootPath: string, site: Site, prefix: string): string {
    return `server {
      listen       8081${site.default ? ' default_server' : ''};
      server_name  ${site.hostnames.join(' ')};
      port_in_redirect off;
      server_name_in_redirect off;
      error_page 500 502 503 504 /50x.html;
      error_page 404 /404;
      root ${rootPath}${prefix};

      include ${this.config.nginxRedirectsDir}/${site.name}.conf;
      include ${this.config.nginxConfigDir}/*.conf;

      location / {
          try_files $uri $uri.html $uri/index.html $uri/index.htm =404;
      }

      location = /50x.html {
          root   /usr/share/nginx/html;
      }
    }`;
  }
}
