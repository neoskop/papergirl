import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { eachLimit } from 'async';
import * as fs from 'fs';
import { paginateListObjectsV2, S3Client, S3 } from '@aws-sdk/client-s3';
import * as path from 'path';
import { ConfigService } from '../../config/config.service';
import * as crypto from 'crypto';
import { ColorPathService } from '../color-path.service';
import chalk from 'chalk';
import { pipeline } from 'stream/promises';

type FileMeta = {
  path: string;
  oldPath: string;
  name: string;
  lastModified: Date;
  etag?: string;
};

@Injectable()
export class S3Service implements OnModuleInit {
  private s3Client: S3Client;
  private s3: S3;

  constructor(
    private readonly config: ConfigService,
    private readonly colorPathService: ColorPathService,
    private readonly logger: Logger,
  ) {
    this.s3Client = new S3Client(this.config.s3ClientOptions);
    this.s3 = new S3(this.config.s3ClientOptions);
  }
  private async bucketExists(): Promise<boolean> {
    const buckets = (await this.s3.listBuckets({})).Buckets;
    return (
      buckets.find((bucket) => bucket.Name === this.config.s3BucketName) !==
      undefined
    );
  }

  public async onModuleInit() {
    if (!(await this.bucketExists())) {
      this.logger.debug(`Creating bucket '${this.config.s3BucketName}'`);
      try {
        await this.s3.createBucket({ Bucket: this.config.s3BucketName });
      } catch (err) {
        this.logger.error(
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

  private async getAllS3Files(
    targetDir: string,
    oldDir: string,
  ): Promise<FileMeta[]> {
    const result = [];
    for await (const data of paginateListObjectsV2(
      { client: this.s3Client },
      { Bucket: this.config.s3BucketName },
    )) {
      result.push(
        ...(data.Contents ?? []).map((obj) => ({
          path: path.join(targetDir, '' + obj.Key),
          oldPath: path.join(oldDir, '' + obj.Key),
          name: '' + obj.Key,
          lastModified: obj.LastModified,
          etag: obj.ETag.replace(/['"]+/g, ''),
        })),
      );
    }
    return result;
  }

  public async download(targetDir: string, oldDir: string): Promise<void> {
    await this.checkTargetDirectoryExists(targetDir);

    if (!(await this.bucketExists())) {
      throw new Error(`Bucket ${this.config.s3BucketName} does not exist.`);
    }

    this.logger.debug('Start download of files');
    const startTime = process.hrtime();
    const files = await this.getAllS3Files(targetDir, oldDir);
    await new Promise<void>((resolve, reject) => {
      eachLimit(
        files,
        this.config.concurrency,
        this.processFile.bind(this),
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
    const hrtime = process.hrtime(startTime);
    const elapsedSeconds = (hrtime[0] + hrtime[1] / 1e9).toFixed(3);
    this.logger.debug(`Download complete after ${chalk.bold(elapsedSeconds)}s`);
  }

  private async processFile(file: FileMeta) {
    if (!file.name.endsWith('/')) {
      const baseDir = path.dirname(file.path);
      try {
        await fs.promises.access(baseDir);
      } catch (error) {
        this.logger.debug(
          `Creating directory ${this.colorPathService.colorize(baseDir)}`,
        );
        await fs.promises.mkdir(baseDir, { recursive: true });
      }
      if (
        await this.downloadIsNeeded(file.oldPath, file.lastModified, file.etag)
      ) {
        await this.downloadFile(file.path, file.name, file.lastModified);
      } else {
        await this.takeOldFile(file.oldPath, file.path);
      }
    }
  }

  private async takeOldFile(src: string, target: string) {
    this.logger.debug(
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
        this.logger.debug(
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
      const hash = crypto.createHash('md5');
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
    hash: string | undefined,
  ): Promise<boolean> {
    try {
      await fs.promises.access(fullPath);
    } catch (err) {
      return true;
    }

    let checkType: string;
    let result: boolean;

    if (hash !== undefined && hash.length > 0) {
      const localHash = await this.getHashOfLocalFile(fullPath);
      checkType = '#️⃣ ';
      result = localHash !== hash;
    } else {
      const localLastModified = await this.getLastModifiedDateOfFile(fullPath);
      checkType = '⏱ ';
      result = lastModified.getTime() !== localLastModified.getTime();
    }

    this.logger.debug(
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
    count = 0,
  ) {
    this.logger.debug(
      `Downloading ${this.colorPathService.colorize(fullPath)}`,
    );
    try {
      const data = await this.s3.getObject({
        Bucket: this.config.s3BucketName,
        Key: name,
      });
      const destination = fs.createWriteStream(fullPath);
      // @ts-ignore
      const source: Readable | Blob = data.Body;
      await pipeline(source, destination);
      await fs.promises.utimes(fullPath, lastModified, lastModified);
    } catch (err) {
      if (err.message?.match(/Not Found/i)) {
        this.logger.warn(
          `Couldn't download ${this.colorPathService.colorize(
            fullPath,
          )} since it does not exist (anymore?!)`,
        );
      } else {
        if (count >= 2) {
          throw new Error(
            `Downloading of ${this.colorPathService.colorize(
              fullPath,
            )} failed: ${err}`,
          );
        } else {
          this.logger.warn(
            `Retrying download of ${this.colorPathService.colorize(
              fullPath,
            )} since it failed: ${err}`,
          );
          await this.downloadFile(fullPath, name, lastModified, count + 1);
        }
      }
    }
  }
}
