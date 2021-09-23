import { OnEvent } from '@nestjs/event-emitter';
import { join } from 'path';
import { ConfigService } from '../../../config/config.service';
import { Meta } from '../../../meta/meta.interface';
import { ConfigReadEvent } from '../events/config-read.event';
import { NginxConfigFile } from '../nginx-config-file/nginx-config-file';

export abstract class ConfigListener {
  private readonly configFilePath: string;

  constructor(protected readonly config: ConfigService, fileName: string) {
    this.configFilePath = join(this.config.nginxConfigDir, fileName);
  }

  @OnEvent('config.read')
  async handleConfig(event: ConfigReadEvent) {
    const configFile = new NginxConfigFile(this.configFilePath);

    if (this.shouldCreateConfigFile(event.meta)) {
      const configLines = this.getConfigLines(event.meta);
      configFile.addLines(...configLines);
      await configFile.write();
    } else {
      await configFile.delete();
    }
  }

  protected abstract getConfigLines(meta: Meta): string[];
  protected abstract shouldCreateConfigFile(meta: Meta): boolean;
}
