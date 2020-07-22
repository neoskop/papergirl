import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { eachLimit } from 'async';
import * as fs from 'fs';
import { Client } from 'minio';
import * as path from 'path';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class S3Service implements OnApplicationBootstrap {
  private s3Client: Client;

  constructor(private readonly config: ConfigService) {
    this.s3Client = new Client(this.config.s3ClientOptions);
  }

  public async onApplicationBootstrap() {
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

  public async download(targetDir: string): Promise<void> {
    try {
      if (!(await this.directoryIsWritable(targetDir))) {
        throw new Error(`Directory ${targetDir} is not writable`);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        Logger.debug(`Directory ${targetDir} does not exist - creating it.`);
        const parentDir = path.resolve(targetDir, '..');

        if (!(await this.directoryIsWritable(parentDir))) {
          throw new Error(
            `Parent directory of ${targetDir} (${parentDir}) is not writable`,
          );
        } else {
          await fs.promises.mkdir(targetDir, { recursive: true });
        }
      }
    }

    if (!(await this.s3Client.bucketExists(this.config.s3BucketName))) {
      throw new Error(`Bucket ${this.config.s3BucketName} does not exist.`);
    }

    Logger.debug('Start download files');
    const objectsStream = this.s3Client.listObjectsV2(
      this.config.s3BucketName,
      '',
      true,
      '',
    );
    return new Promise((resolve, reject) => {
      const files = [];
      objectsStream.on('data', async (obj) => {
        files.push({ path: path.join(targetDir, obj.name), name: obj.name });
      });
      objectsStream.on('error', (err) => {
        reject(err);
      });
      objectsStream.on('end', async () => {
        eachLimit(
          files,
          5,
          async (file) => {
            Logger.debug(`Writing ${file.path}`);
            await this.s3Client.fGetObject(
              this.config.s3BucketName,
              file.name,
              file.path,
            );
          },
          resolve,
        );
      });
    });
  }
}
