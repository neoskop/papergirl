import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Client, connect, Msg, Payload } from 'ts-nats';
import { ConfigService } from '../config/config.service';
import { UpdateService } from '../update/update.service';
import * as chalk from 'chalk';
import { AlertService } from '../alert/alert.service';

@Injectable()
export class NotificationService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private client: Client;

  constructor(
    private configService: ConfigService,
    private updateService: UpdateService,
    private readonly logger: Logger,
    private readonly alertService: AlertService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.connectToQueue();
  }

  async onApplicationShutdown(_signal?: string): Promise<void> {
    try {
      await this.disconnectFromQueue();
    } catch (err) {
      this.logger.error(err);
    }
  }

  protected async receiveMessage(err: Error, message: Msg) {
    if (err) {
      this.logger.error(`Receiving of message failed: ${err.message}`);
    } else {
      this.logger.debug(`Received a [x]: ${JSON.stringify(message.data)}`);

      try {
        await this.updateService.perform();
      } catch (ex) {
        const text = `The update could not be deployed: ${ex.message || ex}`;
        this.alertService.alert(text);
        this.logger.error(text);
      }
    }
  }

  private async connectToQueue() {
    this.logger.debug(
      `Connecting to ${chalk.bold(this.configService.queueUri)}`,
    );
    this.client = await connect({
      url: this.configService.queueUri,
      maxReconnectAttempts: -1,
      waitOnFirstConnect: true,
      reconnect: true,
      payload: Payload.JSON,
    });
    await this.client.subscribe(
      this.configService.queueSubject,
      this.receiveMessage.bind(this),
    );
  }

  private async disconnectFromQueue(): Promise<void> {
    if (this.client) {
      this.logger.debug('Draining connections to queue');
      await this.client.drain();
    }
  }
}
