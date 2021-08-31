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
    Logger.debug(`Processing the following config: ${JSON.stringify(meta)}`);
    await this.configureCache(meta);
    await this.configureSecurity(meta);
    await this.configureTrailingSlashBehaviour(meta);
    await this.configureRedirects(meta);
    await this.configureImageProcessing(meta);
  }

  private async configureCache(meta: Meta) {
    const configFilePath = join(this.config.nginxConfigDir, 'cache.conf');
    if (meta.cache?.headers) {
      const locations = [
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
        locations.push(`location ~* (?!.+-(\\d+x\\d+|\\d+[wh])\\.(jpg|jpeg|gif|png|svg|svgz))(?=.+\\.(jpg|jpeg|gif|png|svg|svgz))^.+$ {
          add_header Cache-Controll "public";
          expires 1y;
          add_header Vary Accept;
          add_header Pragma "public";
          access_log off;
        }`);
        locations.push(`location ~* \\.(?:ico|cur|gz|mp4|ogg|ogv|webm|htc)$ {
          add_header Cache-Controll "public";
          expires 1y;
          add_header Vary Accept;
          add_header Pragma "public";
          access_log off;
        }`);
      } else {
        locations.push(`location ~* \\.(?:jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc)$ {
          add_header Cache-Controll "public";
          expires 1y;
          add_header Vary Accept;
          add_header Pragma "public";
          access_log off;
        }`);
      }

      await fs.promises.writeFile(configFilePath, locations.join('\n\n'));
    } else {
      await this.deleteStaleConfig(configFilePath);
    }
  }

  private async deleteStaleConfig(configFilePath: string) {
    if (
      await fs.promises
        .access(configFilePath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false)
    ) {
      Logger.debug(`Deleting ${configFilePath}`);
      await fs.promises.unlink(configFilePath);
    } else {
      Logger.debug(`File ${configFilePath} does not exist`);
    }
  }

  private async configureTrailingSlashBehaviour(meta: Meta) {
    const configFilePath = join(
      this.config.nginxConfigDir,
      'trailing_slash.conf',
    );
    if (meta.removeTrailingSlash) {
      await fs.promises.writeFile(
        configFilePath,
        `location ~ (?<no_slash>.+)/$ {
        return 301 $thescheme://$host$no_slash;
   }`,
      );
    } else {
      await this.deleteStaleConfig(configFilePath);
    }
  }

  private async configureImageProcessing(meta: Meta) {
    const configFilePath = join(
      this.config.nginxConfigDir,
      'image_processing.conf',
    );
    if (meta.imageProcessing?.enabled) {
      const defaults = {
        quality: 85,
        imageType: 'original',
      };
      const args = Object.assign(defaults, meta.imageProcessing);

      const config = [
        `location ~* "^/(?<path>.+)-(?<width>\\d+)x(?<height>\\d+)\\.(?<ext>(jpg|jpeg|png|svg|svgz|gif))$" {
        resolver 127.0.0.1:53 ipv6=off;
        set $upstream papergirl-image-proxy:8565;
        proxy_pass http://$upstream/rs,s:\${width}x\${height},m:fill,g:auto/q:${args.quality}/o:${args.imageType}?image=http://${this.config.serviceName}:8081/$path.$ext;
        proxy_hide_header cache-control;
        add_header Cache-Controll "public";
        expires 1y;
        access_log off;
        add_header Vary Accept;
        add_header Pragma "public";
    }`,
        `location ~* "^/(?<path>.+)-(?<width>\\d+)w\\.(?<ext>(jpg|jpeg|png|svg|svgz|gif))$" {
      resolver 127.0.0.1:53 ipv6=off;
      set $upstream papergirl-image-proxy:8565;
      proxy_pass http://$upstream/rs,s:\${width},m:fill,g:auto/q:${args.quality}/o:${args.imageType}?image=http://${this.config.serviceName}:8081/$path.$ext;
      proxy_hide_header cache-control;
      add_header Vary Accept;
      add_header Cache-Controll "public";
      expires 1y;
      access_log off;
      add_header Pragma "public";
  }`,
        `location ~* "^/(?<path>.+)-(?<height>\\d+)h\\.(?<ext>(jpg|jpeg|png|svg|gif))$" {
    resolver 127.0.0.1:53 ipv6=off;
    set $upstream papergirl-image-proxy:8565;
    proxy_pass http://$upstream/rs,s:x\${height},m:fill,g:auto/q:${args.quality}/o:${args.imageType}?image=http://${this.config.serviceName}:8081/$path.$ext;
    proxy_hide_header cache-control;
    add_header Cache-Controll "public";
    expires 1y;
    access_log off;
    add_header Vary Accept;
    add_header Pragma "public";
}`,
      ].join('\n\n');
      await fs.promises.writeFile(configFilePath, config);
    } else {
      await this.deleteStaleConfig(configFilePath);
    }
  }

  private async configureSecurity(meta: Meta) {
    const configFilePath = join(this.config.nginxConfigDir, 'security.conf');
    let configLines = [];

    if (meta?.security) {
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

  private async configureRedirects(meta: Meta) {
    const configFilePath = join(this.config.nginxConfigDir, 'redirects.conf');
    let configLines = [];

    if (meta?.redirects) {
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
          return `location ${redirect.regex ? '~*' : '='} ${
            redirect.from
          } { return ${redirect.code || '301'} ${redirect.to}; }`;
        }),
      );
    }

    await fs.promises.writeFile(
      configFilePath,
      configLines.length > 0 ? configLines.join('\n') : '',
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
