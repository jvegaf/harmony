import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      destination: 1,
      colorize: true
    }
  }
});

logger.info('bootstrap log');

export default logger;
