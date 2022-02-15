import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '../config/config.service';
import { ReadinessService } from '../health/readiness.service';
import { MetaService } from '../meta/meta.service';
import { NginxService } from './nginx/nginx.service';
import { S3Service } from './s3/s3.service';
import { ColorPathService } from './color-path.service';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigReloadedEvent } from '../config/config-reloaded.event';
import { Meta } from 'src/meta/interfaces/meta.interface';

@Injectable()
export class UpdateService implements OnApplicationBootstrap {
  private dirBlack: string;
  private dirRed: string;
  private workingConfig: Meta;

  constructor(
    private readonly s3service: S3Service,
    private readonly nginxService: NginxService,
    private readonly config: ConfigService,
    private readonly readinessService: ReadinessService,
    private readonly metaService: MetaService,
    private readonly colorPathService: ColorPathService,
    private readonly logger: Logger,
  ) {
    this.dirBlack = path.join(
      this.config.nginxRootDir,
      this.config.nginxDirBlack,
    );
    this.dirRed = path.join(this.config.nginxRootDir, this.config.nginxDirRed);
  }

  async onApplicationBootstrap() {
    try {
      await this.perform(true);
      this.readinessService.setReady();
    } catch (err) {
      this.logger.error(`The initial setup failed: ${err.message || err}`);
    }
  }

  @OnEvent('config.reloaded')
  async onConfigReload(event: ConfigReloadedEvent) {
    this.logger.log(
      'Perfoming an update since the service config was reloaded',
    );

    try {
      await this.perform();
    } catch (err) {
      this.logger.error(
        `Update failed during config reload: ${err.message || err}`,
      );
    }
  }

  private async copyDir(src: string, dest: string) {
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    await fs.promises.mkdir(dest);

    for (let entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
        const stat = await fs.promises.stat(srcPath);
        await fs.promises.utimes(destPath, stat.atime, stat.mtime);
      }
    }
  }

  public async perform(initialBuild: boolean = false) {
    if (!initialBuild) {
      this.logger.debug(
        `Replacing ${this.colorPathService.colorize(
          this.dirBlack,
        )} with ${this.colorPathService.colorize(this.dirRed)}`,
      );
      await fs.promises.rm(this.dirBlack, { recursive: true });
      await this.copyDir(this.dirRed, this.dirBlack);
      await this.nginxService.switchRootDir(this.dirBlack);
    }

    try {
      await fs.promises.rm(this.dirRed, { recursive: true });
      await fs.promises.mkdir(this.dirRed);
      await this.s3service.download(this.dirRed, this.dirBlack);
      this.logger.debug('Download complete');
      const meta = await this.metaService.parse(this.dirRed);
      await this.nginxService.configure(meta);
      await this.nginxService.switchRootDir(this.dirRed);
      this.workingConfig = meta;
    } catch (err) {
      if (this.workingConfig) {
        this.logger.debug(`Rolling back to last working configuration`);
        await this.nginxService.configure(this.workingConfig);
      }

      throw err;
    }
  }
}
