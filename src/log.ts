import winston from 'winston';

// export const logFiles = ['error.log', 'combined.log'];

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  // transports: [
  //   // Write all logs with importance level of `error` or less to `error.log`
  //   new winston.transports.File({ filename: 'error.log', level: 'error' }),
  //   // Write all logs with importance level of `info` or less to `combined.log`
  //   new winston.transports.File({ filename: 'combined.log' }),
  // ],
});

export function logFormat() {
  let max = 20;
  return winston.format(info => {
    if (info.message.toString().length > max) {
      max = info.message.toString().length;
    }

    if (info.source) {
      info.message = info.message.toString().padEnd(max) + ` [${info.source}]`;
    }

    return info;
  })();
}

// Not sure if we'll use `NODE_ENV` long term but for now...
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(logFormat(), winston.format.colorize(), winston.format.simple()),
    }),
  );
}

export default logger;

export interface Logger {
  info(message: string, meta: { source: string }): void;
  warn(message: string, meta: { source: string }): void;
}
