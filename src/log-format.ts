import { Format } from 'logform';
import { inspect } from 'util';
import { format } from 'winston';
import * as chalk from 'chalk';
import safeStringify from 'fast-safe-stringify';

const nestLikeColorScheme: Record<string, chalk.Chalk> = {
  info: chalk.greenBright,
  error: chalk.red,
  warn: chalk.yellow,
  debug: chalk.magentaBright,
  verbose: chalk.cyanBright,
};

export const logFormat = (): Format =>
  format.printf(({ context, level, timestamp, message, ms, ...meta }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const color =
      nestLikeColorScheme[level] || ((text: string): string => text);

    const stringifiedMeta = safeStringify(meta);
    const formattedMeta = inspect(JSON.parse(stringifiedMeta), {
      colors: true,
      depth: 4,
    });

    return (
      `[${chalk.yellow(level.toUpperCase())}] ` +
      ('undefined' !== typeof context
        ? `${chalk.yellow('[' + context + ']')} `
        : '') +
      `${color(message)} - ` +
      `${formattedMeta}` +
      ('undefined' !== typeof ms ? ` ${chalk.yellow(ms)}` : '')
    );
  });
