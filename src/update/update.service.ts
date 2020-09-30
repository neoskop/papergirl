import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as fs from 'fs';
import { ncp } from 'ncp';
import * as path from 'path';
import { ConfigService } from '../config/config.service';
import { ReadinessService } from '../health/readiness.service';
import { MetaService } from '../meta/meta.service';
import { NginxService } from './nginx/nginx.service';
import { S3Service } from './s3/s3.service';

@Injectable()
export class UpdateService implements OnApplicationBootstrap {
  private dirBlack: string;
  private dirRed: string;

  constructor(
    private readonly s3service: S3Service,
    private readonly nginxService: NginxService,
    private readonly config: ConfigService,
    private readonly readinessService: ReadinessService,
    private readonly metaService: MetaService,
  ) {
    this.dirBlack = path.join(
      this.config.nginxRootDir,
      this.config.nginxDirBlack,
    );
    this.dirRed = path.join(this.config.nginxRootDir, this.config.nginxDirRed);
  }

  async onApplicationBootstrap() {
    await this.perform();
    this.readinessService.setReady();
  }

  public async perform() {
    try {
      const currentRoot = await this.nginxService.getActiveRootDir();

      if (!currentRoot.endsWith(this.config.nginxDirBlack)) {
        await fs.promises.rmdir(this.dirBlack, { recursive: true });
        await new Promise((done) => {
          ncp(this.dirRed, this.dirBlack, (err) => {
            if (err) {
              throw err;
            } else {
              done();
            }
          });
        });
      }

      await this.nginxService.switchRootDir(this.dirBlack);
      await fs.promises.rmdir(this.dirRed, { recursive: true });
      await fs.promises.mkdir(this.dirRed);
      await this.s3service.download(this.dirRed);
      Logger.debug('Download complete');
      const meta = await this.metaService.parse(this.dirRed);
      await this.nginxService.configure(meta);
      await this.nginxService.switchRootDir(this.dirRed);
    } catch (err) {
      Logger.error(err.message || err);
    }
  }
}
