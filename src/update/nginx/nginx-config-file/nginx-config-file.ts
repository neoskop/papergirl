import { Logger } from '@nestjs/common';
import * as chalk from 'chalk';
import * as fs from 'fs';

export class NginxConfigFile {
  private readonly lines: string[] = [];

  constructor(private readonly configFilePath: string) {}

  addLines(...lines: string[]) {
    this.lines.push(...lines);
  }

  public async write() {
    Logger.debug(`Writing ${chalk.bold(this.configFilePath)}`);
    await fs.promises.writeFile(this.configFilePath, this.getData());
  }

  public async delete() {
    if (
      await fs.promises
        .access(this.configFilePath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false)
    ) {
      Logger.debug(`Deleting ${chalk.bold(this.configFilePath)}`);
      await fs.promises.unlink(this.configFilePath);
    } else {
      Logger.debug(`File ${chalk.bold(this.configFilePath)} does not exist`);
    }
  }

  private getData(): string {
    return this.lines.join('\n\n');
  }
}
