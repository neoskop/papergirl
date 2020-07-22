import { Injectable } from '@nestjs/common';
import * as deepmerge from 'deepmerge';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { Meta } from './meta.interface';

@Injectable()
export class MetaService {
  public async parse(dir: string): Promise<Meta> {
    const configFile = await this.findConfigFile(dir);

    if (!configFile) {
      return null;
    }

    const configFileContents = await fs.promises.readFile(configFile);
    const document = yaml.safeLoad(configFileContents.toString('utf-8'), {
      json: true,
    });

    if (typeof document !== 'object') {
      throw new Error(`Invalid config file`);
    } else {
      await fs.promises.unlink(configFile);
      return deepmerge(
        {
          security: {
            standardHeaders: true,
            hideVersion: true,
            csp: "default-src 'none'",
          },
        },
        document,
      );
    }
  }

  private async findConfigFile(dir: string): Promise<string> {
    const files = await fs.promises.readdir(dir);

    for (const file of files) {
      if (file.match(/papergirl\.(json|yaml|yml)/)) {
        return path.join(dir, file);
      }
    }

    return null;
  }
}
