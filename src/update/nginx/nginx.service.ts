import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NginxService {
  switchRoot(path: string) {
    Logger.debug(`Change root path in NGINX config file to ${path}`);
    Logger.debug('Send SIGHUP to NGINX process');
  }
}
