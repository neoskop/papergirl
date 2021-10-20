import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { join } from 'path';
import { ConfigService } from '../../../config/config.service';
import { ConfigReadEvent } from '../events/config-read.event';
import { NginxConfigFile } from '../nginx-config-file/nginx-config-file';
import * as fs from 'fs';
import { Site } from 'src/meta/site.interface';

@Injectable()
export class MultisiteConfigListener {
  constructor(private readonly config: ConfigService) {}

  @OnEvent('config.read')
  async handleConfig(event: ConfigReadEvent) {
    await this.clearSitesDirectory();

    if (event.meta.multisite?.enabled) {
      await Promise.all(
        event.meta.multisite.sites.map((site) =>
          this.writeSiteConfig(site, `/${site.name}/`),
        ),
      );
    } else {
      await this.writeSiteConfig({
        name: 'default',
        hostnames: ['_'],
        default: true,
      });
    }
  }

  private async clearSitesDirectory() {
    const files = await fs.promises.readdir(this.config.nginxSitesDir);

    for (const file of files) {
      await fs.promises.unlink(join(this.config.nginxSitesDir, file));
    }
  }

  private async writeSiteConfig(site: Site, prefix: string = '') {
    const configFilePath = join(this.config.nginxSitesDir, `${site.name}.conf`);
    const configFile = new NginxConfigFile(configFilePath);
    configFile.addLines(this.getSiteConfig(site, prefix));
    await configFile.write();
  }

  private getSiteConfig(site: Site, prefix: string): string {
    return `server {
      listen       8081${site.default ? ' default_server' : ''};
      server_name  ${site.hostnames.join(' ')};
      port_in_redirect off;
      server_name_in_redirect off;
      error_page 500 502 503 504 /50x.html;
      error_page 404 /404/index.html;

      include ${this.config.nginxConfigDir}/*.conf;
      include ${this.config.nginxRedirectsDir}/${site.name}.conf;

      location / {
          try_files ${prefix}$uri ${prefix}$uri.html ${prefix}$uri/index.html ${prefix}$uri/index.htm =404;
      }
      
      location = /50x.html {
          root   /usr/share/nginx/html;
      }
    }`;
  }
}
