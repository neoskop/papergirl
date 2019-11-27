import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class NginxService implements OnApplicationBootstrap {
  constructor(private config: ConfigService) {}

  public async onApplicationBootstrap() {
    try {
      await fs.promises.access(
        this.config.nginxConfigFilePath,
        fs.constants.W_OK,
      );
    } catch (err) {
      if (err.code === 'ENOENT') {
        Logger.debug(
          `Config file ${this.config.nginxConfigFilePath} does not exist`,
        );
      } else if (err.code === 'EACCES') {
        throw new Error(
          `Config file ${this.config.nginxConfigFilePath} is not writable`,
        );
      } else {
        throw err;
      }
    }
  }

  public async getActiveRootDir(): Promise<string> {
    const configFileContents = (
      await fs.promises.readFile(this.config.nginxConfigFilePath)
    ).toString();
    const match = /root (.+?);/.exec(configFileContents);

    if (!match) {
      throw new Error(
        `Root path is not correctly specified in ${this.config.nginxConfigFilePath}`,
      );
    }

    Logger.debug(`Active root dir of NGINX is ${match[1]}`);
    return match[1];
  }

  public async switchRootDir(path: string) {
    await fs.promises.writeFile(
      this.config.nginxConfigFilePath,
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
