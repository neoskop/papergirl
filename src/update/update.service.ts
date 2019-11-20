import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { ncp } from 'ncp';
import * as path from 'path';
import { ConfigService } from '../config/config.service';
import { NginxService } from './nginx/nginx.service';
import { S3Service } from './s3/s3.service';

@Injectable()
export class UpdateService {
  private dirBlack: string;
  private dirRed: string;

  constructor(
    private readonly s3service: S3Service,
    private readonly nginxService: NginxService,
    private readonly config: ConfigService,
  ) {
    this.dirBlack = path.join(
      this.config.nginxRootDir,
      this.config.nginxDirBlack,
    );
    this.dirRed = path.join(this.config.nginxRootDir, this.config.nginxDirRed);
  }

  public async perform() {
    try {
      const currentRoot = await this.nginxService.getActiveRootDir();

      if (!currentRoot.endsWith(this.config.nginxDirBlack)) {
        await fs.promises.rmdir(this.dirBlack, { recursive: true });
        await new Promise(done => {
          ncp(this.dirRed, this.dirBlack, err => {
            if (err) {
              throw err;
            } else {
              done();
            }
          });
        });
      }
    } catch (err) {
      Logger.debug(err.message);
    }

    await this.nginxService.switchRootDir(this.dirBlack);
    await fs.promises.rmdir(this.dirRed, { recursive: true });
    await fs.promises.mkdir(this.dirRed);
    await this.s3service.download(this.dirRed);
    Logger.debug('Download complete');
    await this.nginxService.switchRootDir(this.dirRed);
  }
}
