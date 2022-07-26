import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { ConfigService } from '../../config/config.service';
import { Meta } from '../../meta/interfaces/meta.interface';
import { ColorPathService } from '../color-path.service';
import EventEmitter2 from 'eventemitter2';
import { RootChangedEvent } from './events/root-changed.event';
import { ConfigReadEvent } from './events/config-read.event';
import * as k8s from '@kubernetes/client-node';
import { Writable } from 'stream';

@Injectable()
export class NginxService implements OnApplicationBootstrap {
  public currentRootPath: string;

  constructor(
    private config: ConfigService,
    private readonly colorPathService: ColorPathService,
    private eventEmitter: EventEmitter2,
    private readonly logger: Logger,
  ) {
    this.currentRootPath = join(this.config.nginxRootDir, config.nginxDirBlack);
  }

  public async onApplicationBootstrap() {
    try {
      await fs.promises.access(this.config.nginxConfigDir, fs.constants.W_OK);
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.logger.debug(
          `Config dir ${this.config.nginxConfigDir} does not exist`,
        );
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
    this.logger.debug({ message: 'Processing config', meta });
    await this.eventEmitter.emitAsync(
      'config.read',
      new ConfigReadEvent(meta, this.currentRootPath),
    );

    await new Promise<void>(async (resolve, reject) => {
      try {
        const kc = new k8s.KubeConfig();
        kc.loadFromCluster();
        const outputStream = new Writable();
        let output = '';
        outputStream._write = function (chunk, encoding, done) {
          output += chunk.toString();
          done();
        };

        const exec = new k8s.Exec(kc);
        await exec.exec(
          process.env.MY_POD_NAMESPACE,
          process.env.MY_POD_NAME,
          'nginx',
          ['nginx', '-t'],
          outputStream,
          outputStream,
          null,
          false,
          (status) => {
            if (status.status === 'Success') {
              this.logger.debug({
                message: 'NGINX config test succeeded',
                output: output.split('\n'),
              });
              resolve();
            } else {
              reject(`NGINX config test failed: ${output}`);
            }
          },
        );
      } catch (err) {
        console.dir(err, { colors: true, depth: 4 });
        this.logger.error(`Checking NGINX config failed: ${err.message}`);
        resolve();
      }
    });
  }

  public async switchRootDir(dir: string) {
    this.currentRootPath = dir;
    await this.eventEmitter.emitAsync(
      'root.changed',
      new RootChangedEvent(this.currentRootPath),
    );
    await this.reload();
    this.logger.debug(
      `Switched NGINX root dir base path to ${this.colorPathService.colorize(
        dir,
      )}`,
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
