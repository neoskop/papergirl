import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class NginxService {
  constructor(private config: ConfigService) {}

  public async switchRoot(path: string) {
    await fs.promises.writeFile(
      '/home/papergirl/nginx/root.conf',
      `root ${path};`,
    );
    await this.reload();
  }

  private async reload() {
    const pid = Number(await fs.promises.readFile(this.config.nginxPidPath));
    process.kill(pid, 'SIGHUP');
  }
}
