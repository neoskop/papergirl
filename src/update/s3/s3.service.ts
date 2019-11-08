import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class S3Service {
  constructor(private readonly config: ConfigService) {}

  public download(): Promise<void> {
    Logger.debug('Start download files');
    return Promise.resolve();
  }
}
