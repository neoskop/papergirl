import { OnEvent } from '@nestjs/event-emitter';
import { join } from 'path';
import { ConfigService } from '../../../config/config.service.js';
import { Meta } from '../../../meta/interfaces/meta.interface.js';
import { ConfigReadEvent } from '../events/config-read.event.js';
import { NginxConfigFileService } from '../nginx-config-file.service.js';
import { NginxConfigFile } from '../nginx-config-file/nginx-config-file.js';

export abstract class ConfigListener {
  private readonly configFilePath: string;

  constructor(
    protected readonly config: ConfigService,
    protected readonly nginxConfigFileService: NginxConfigFileService,
    fileName: string,
  ) {
    this.configFilePath = join(this.config.nginxConfigDir, fileName);
  }

  @OnEvent('config.read')
  async handleConfig(event: ConfigReadEvent) {
    const configFile = new NginxConfigFile(this.configFilePath);

    if (this.shouldCreateConfigFile(event.meta)) {
      const configLines = this.getConfigLines(event.meta);
      configFile.addLines(...configLines);
      await this.nginxConfigFileService.write(configFile);
    } else {
      await this.nginxConfigFileService.delete(configFile);
    }
  }

  protected abstract getConfigLines(meta: Meta): string[];
  protected abstract shouldCreateConfigFile(meta: Meta): boolean;
}
