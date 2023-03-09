import { Injectable } from '@nestjs/common';
import deepmerge from 'deepmerge';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import metaTI from './interfaces/meta.interface-ti.js';
import siteTI from './interfaces/site.interface-ti.js';
import redirectTI from './interfaces/redirect.interface-ti.js';
import { createCheckers } from 'ts-interface-checker';
import { Meta } from './interfaces/meta.interface.js';

@Injectable()
export class MetaService {
  private readonly DEFAULT_SETTINGS: Meta = {
    security: {
      standardHeaders: true,
      hideVersion: true,
      csp: "default-src 'none'",
    },
    removeTrailingSlash: true,
    cache: {
      headers: true,
    },
  };

  public async parse(dir: string): Promise<Meta> {
    const configFile = await this.findConfigFile(dir);

    if (!configFile) {
      return this.DEFAULT_SETTINGS;
    }

    const configFileContents = await fs.promises.readFile(configFile);
    const document = yaml.load(configFileContents.toString('utf-8'), {
      json: true,
    });

    if (typeof document !== 'object') {
      throw new Error(`Invalid config file`);
    } else {
      const meta = deepmerge(this.DEFAULT_SETTINGS, document);
      this.validateConfig(meta);
      await fs.promises.unlink(configFile);
      return meta;
    }
  }

  private validateConfig(meta: Meta) {
    const checkers = createCheckers(metaTI, siteTI, redirectTI);
    checkers.Meta.check(meta);
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
