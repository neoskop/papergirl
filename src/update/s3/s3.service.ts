import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { Client } from 'minio';
import * as path from 'path';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class S3Service {
  private s3Client: Client;

  constructor(private readonly config: ConfigService) {
    this.s3Client = new Client(this.config.s3ClientOptions);
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

    Logger.debug('Start download files');
    const objectsStream = this.s3Client.listObjectsV2(
      this.config.s3BucketName,
      '',
      true,
      '',
    );
    objectsStream.on('data', async obj => {
      const filePath = path.join(targetDir, obj.name);
      Logger.debug(`Writing ${filePath}`);
      await this.s3Client.fGetObject(
        this.config.s3BucketName,
        obj.name,
        filePath,
      );
    });
    objectsStream.on('error', e => {
      Logger.error(e);
    });
    return new Promise(done => objectsStream.on('end', done));
  }
}
