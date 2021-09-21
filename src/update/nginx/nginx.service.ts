import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { ConfigService } from '../../config/config.service';
import { Meta } from '../../meta/meta.interface';
import { ColorPathService } from '../color-path.service';
import { EventEmitter2 } from 'eventemitter2';
import { ConfigReadEvent } from './events/config-read.event';

@Injectable()
export class NginxService implements OnApplicationBootstrap {
  constructor(
    private config: ConfigService,
    private readonly colorPathService: ColorPathService,
    private eventEmitter: EventEmitter2,
  ) {}

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
    Logger.debug(`Processing the following config:`);
    console.dir(meta, { colors: true });
    await this.eventEmitter.emitAsync('config.read', new ConfigReadEvent(meta));
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

    Logger.debug(
      `Active root dir of NGINX is ${this.colorPathService.colorize(match[1])}`,
    );
    return match[1];
  }

  public async switchRootDir(path: string) {
    await fs.promises.writeFile(
      join(this.config.nginxConfigDir, 'root.conf'),
      `root ${path};`,
    );
    await this.reload();
    Logger.debug(
      `Switched NGINX root dir to ${this.colorPathService.colorize(path)}`,
    );
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
      } else {
        throw err;
      }
    }
  }
}
