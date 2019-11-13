import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { NginxService } from './nginx/nginx.service';
import { S3Service } from './s3/s3.service';

@Injectable()
export class UpdateService {
  constructor(
    private readonly s3service: S3Service,
    private readonly nginxService: NginxService,
    private readonly config: ConfigService,
  ) {}

  public async perform() {
    const download = this.s3service.download();
    // await fs.promises.unlink('target/dir');
    // await fs.promises.copyFile('/some/dir', 'target/dir');
    await this.nginxService.switchRoot(`${this.config.nginxRootDir}/black`);
    await download;
    Logger.debug('Download complete');
    await this.nginxService.switchRoot(`${this.config.nginxRootDir}/red`);
  }
}
