import { Injectable, Logger } from '@nestjs/common';
import { IncomingWebhook } from '@slack/webhook';
import stripAnsi = require('strip-ansi');
import { ConfigService } from '../config/config.service';

@Injectable()
export class AlertService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: Logger,
  ) {}

  public async alert(text: string) {
    if (!this.config.slackWebhookUrl) {
      return;
    }

    const webhook = new IncomingWebhook(this.config.slackWebhookUrl);

    try {
      await webhook.send({
        attachments: [
          {
            color: 'danger',
            pretext:
              'Papergirl experienced a critical error. We could gather the following details:',
            fields: [
              {
                title: 'Pod name',
                value: process.env.MY_POD_NAME,
              },
              {
                title: 'Pod namespace',
                value: process.env.MY_POD_NAMESPACE,
              },
            ].concat(
              Object.keys(this.config.slackWebhookMetaData).map((title) => ({
                title,
                value: this.config.slackWebhookMetaData[title],
              })),
            ),
            text: stripAnsi(text),
          },
        ],
      });
    } catch (err) {
      this.logger.error({ message: 'Sending of Slack alert failed', err });
    }
  }
}
