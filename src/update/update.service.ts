import { Injectable, Logger } from '@nestjs/common';
import { NginxService } from './nginx/nginx.service';
import { S3Service } from './s3/s3.service';

@Injectable()
export class UpdateService {
  constructor(
    private readonly s3service: S3Service,
    private readonly nginxService: NginxService,
  ) {}

  public async perform() {
    const download = this.s3service.download();
    // await fs.promises.unlink('target/dir');
    // await fs.promises.copyFile('/some/dir', 'target/dir');
    this.nginxService.switchRoot('target/dir');
    await download;
    Logger.debug('Download complete');
    this.nginxService.switchRoot('/some/dir');
  }
}
