import pino from 'pino';

const mainLogger = pino({
  name: 'Main',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const rendererLogger = pino({
  name: 'Renderer`',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});


export { mainLogger, rendererLogger };

/**
 * Custom implementation of timers helpers for benchmarking
 */
const TIMERS: Record<string, number> = {};

function time(id: string) {
  if (TIMERS[id] !== undefined) {
    mainLogger.warn(`Time "${id}" is already in use, ignoring`);
  } else {
    TIMERS[id] = Date.now();
  }
}

function timeEnd(id: string) {
  if (TIMERS[id] === undefined) {
    mainLogger.warn(`Time "${id}" is not initialized, ignoring`);
  } else {
    const start = TIMERS[id];
    const now = Date.now();
    delete TIMERS[id];
    mainLogger.info(`${id}: ${now - start}ms`);
  }
}

export const loggerExtras = {
  time,
  timeEnd,
};

