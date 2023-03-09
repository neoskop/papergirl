import { Injectable } from '@nestjs/common';
import chalk from 'chalk';
import * as path from 'path';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class ColorPathService {
  private dirBlack: string;
  private dirRed: string;

  constructor(private readonly config: ConfigService) {
    this.dirBlack = path.join(
      this.config.nginxRootDir,
      this.config.nginxDirBlack,
    );
    this.dirRed = path.join(this.config.nginxRootDir, this.config.nginxDirRed);
  }

  public colorize(fullPath: string) {
    if (fullPath.startsWith(this.dirBlack)) {
      return chalk.bgWhite.black.bold(fullPath.slice(this.dirBlack.length - 5));
    } else if (fullPath.startsWith(this.dirRed)) {
      return chalk.red.bold(fullPath.slice(this.dirRed.length - 3));
    } else {
      return chalk.bold(fullPath);
    }
  }
}
