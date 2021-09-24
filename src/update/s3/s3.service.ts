import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { eachLimit } from 'async';
import * as fs from 'fs';
import { Client } from 'minio';
import * as path from 'path';
import { ConfigService } from '../../config/config.service';
import * as crypto from 'crypto';
import { ColorPathService } from '../color-path.service';
import chalk = require('chalk');

@Injectable()
export class S3Service implements OnModuleInit {
  private s3Client: Client;

  constructor(
    private readonly config: ConfigService,
    private readonly colorPathService: ColorPathService,
  ) {
    this.s3Client = new Client(this.config.s3ClientOptions);
  }

  public async onModuleInit() {
    if (!(await this.s3Client.bucketExists(this.config.s3BucketName))) {
      Logger.debug(`Creating bucket '${this.config.s3BucketName}'`);

      try {
        await this.s3Client.makeBucket(
          this.config.s3BucketName,
          this.config.s3Region,
        );
      } catch (err) {
        Logger.error(
          `Creation of bucket '${this.config.s3BucketName}' failed: ${err.message}`,
        );
      }
    }
  }

  private async directoryIsWritable(directory: string): Promise<boolean> {
    try {
      await fs.promises.access(directory, fs.constants.W_OK);
    } catch (err) {
      if (err.code === 'EACCES') {
        return false;
      } else {
        throw err;
      }
    }

    return true;
  }

  public async download(targetDir: string, oldDir: string): Promise<void> {
    await this.checkTargetDirectoryExists(targetDir);

    if (!(await this.s3Client.bucketExists(this.config.s3BucketName))) {
      throw new Error(`Bucket ${this.config.s3BucketName} does not exist.`);
    }

    Logger.debug('Start download of files');
    const objectsStream = this.s3Client.extensions.listObjectsV2WithMetadata(
      this.config.s3BucketName,
      '',
      true,
      '',
    );
    return new Promise((resolve, reject) => {
      const files = [];
      objectsStream.on('data', (obj) => {
        files.push({
          path: path.join(targetDir, '' + obj.name),
          oldPath: path.join(oldDir, '' + obj.name),
          name: '' + obj.name,
          lastModified: obj.lastModified,
          hash: obj.metadata?.hash,
        });
      });
      objectsStream.on('error', (err) => {
        reject(`Listing files failed: ${err}`);
      });
      objectsStream.on('end', () => {
        eachLimit(
          files,
          5,
          async (file) => {
            if (!file.name.endsWith('/')) {
              const baseDir = path.dirname(file.path);
              try {
                await fs.promises.access(baseDir);
              } catch (error) {
                Logger.debug(
                  `Creating directory ${this.colorPathService.colorize(
                    baseDir,
                  )}`,
                );
                await fs.promises.mkdir(baseDir, { recursive: true });
              }
              if (
                await this.downloadIsNeeded(
                  file.oldPath,
                  file.lastModified,
                  file.hash,
                )
              ) {
                await this.downloadFile(
                  file.path,
                  file.name,
                  file.lastModified,
                );
              } else {
                await this.takeOldFile(file.oldPath, file.path);
              }
            }
          },
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          },
        );
      });
    });
  }

  private async takeOldFile(src: string, target: string) {
    Logger.debug(
      `Copying ${this.colorPathService.colorize(
        src,
      )} to ${this.colorPathService.colorize(target)}`,
    );
    await fs.promises.copyFile(src, target);
    const stat = await fs.promises.stat(src);
    await fs.promises.utimes(target, stat.atime, stat.mtime);
  }

  private async checkTargetDirectoryExists(targetDir: string) {
    try {
      if (!(await this.directoryIsWritable(targetDir))) {
        throw new Error(
          `Directory ${this.colorPathService.colorize(
            targetDir,
          )} is not writable`,
        );
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        Logger.debug(
          `Directory ${this.colorPathService.colorize(
            targetDir,
          )} does not exist - creating it.`,
        );
        const parentDir = path.resolve(targetDir, '..');

        if (!(await this.directoryIsWritable(parentDir))) {
          throw new Error(
            `Parent directory of ${this.colorPathService.colorize(
              targetDir,
            )} (${parentDir}) is not writable`,
          );
        } else {
          await fs.promises.mkdir(targetDir, { recursive: true });
        }
      }
    }
  }

  private async getHashOfLocalFile(file: string): Promise<string> {
    return new Promise((resolve) => {
      const hash = crypto.createHash('sha256');
      hash.setEncoding('hex');
      const input = fs.createReadStream(file);

      input.on('end', () => {
        hash.end();
        resolve(hash.read());
        input.close();
      });

      input.pipe(hash);
    });
  }

  private async downloadIsNeeded(
    fullPath: string,
    lastModified: Date,
    hash?: string,
  ): Promise<boolean> {
    try {
      await fs.promises.access(fullPath);
    } catch (err) {
      return true;
    }

    let checkType: string;
    let result: boolean;

    if (hash) {
      const localHash = await this.getHashOfLocalFile(fullPath);
      checkType = '#️⃣';
      result = localHash !== hash;
      return result;
    } else {
      const localLastModified = await this.getLastModifiedDateOfFile(fullPath);
      checkType = '⏱ ';
      result = lastModified.getTime() !== localLastModified.getTime();
    }

    Logger.debug(
      `Checking ${checkType} of ${this.colorPathService.colorize(fullPath)}: ${
        result ? chalk.yellowBright('Stale') : chalk.blueBright('Up to date')
      }`,
    );
    return result;
  }

  private async getLastModifiedDateOfFile(fullPath: string) {
    return (await fs.promises.stat(fullPath)).mtime;
  }

  private async downloadFile(
    fullPath: string,
    name: string,
    lastModified: Date,
  ) {
    Logger.debug(`Downloading ${this.colorPathService.colorize(fullPath)}`);
    try {
      await this.s3Client.fGetObject(this.config.s3BucketName, name, fullPath);
      await fs.promises.utimes(fullPath, lastModified, lastModified);
    } catch (err) {
      if (err.message?.match(/Not Found/i)) {
        Logger.warn(
          `Couldn't download ${this.colorPathService.colorize(
            fullPath,
          )} since it does not exist (anymore?!)`,
        );
      } else {
        throw new Error(
          `Downloading of ${this.colorPathService.colorize(
            fullPath,
          )} failed: ${err}`,
        );
      }
    }
  }
}
