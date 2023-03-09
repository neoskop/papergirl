import { Injectable, Logger } from '@nestjs/common';
import { NginxConfigFile } from './nginx-config-file/nginx-config-file.js';
import chalk from 'chalk';
import * as fs from 'fs';

@Injectable()
export class NginxConfigFileService {
  constructor(private readonly logger: Logger) {}

  public async write(configFile: NginxConfigFile) {
    this.logger.debug(`Writing ${chalk.bold(configFile.configFilePath)}`);
    await fs.promises.writeFile(
      configFile.configFilePath,
      configFile.getData(),
    );
  }

  public async delete(configFile: NginxConfigFile) {
    if (
      await fs.promises
        .access(configFile.configFilePath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false)
    ) {
      this.logger.debug(`Deleting ${chalk.bold(configFile.configFilePath)}`);
      await fs.promises.unlink(configFile.configFilePath);
    } else {
      this.logger.debug(
        `File ${chalk.bold(configFile.configFilePath)} does not exist`,
      );
    }
  }
}
