import log from 'electron-log';

const rendererLogger = log.scope('renderer');
const logger = log.scope('main');

export { logger, rendererLogger };

/**
 * Custom implementation of timers helpers for benchmarking
 */
const TIMERS: Record<string, number> = {};

function time(id: string) {
  if (TIMERS[id] !== undefined) {
    log.warn(`Time "${id}" is already in use, ignoring`);
  } else {
    TIMERS[id] = Date.now();
  }
}

function timeEnd(id: string) {
  if (TIMERS[id] === undefined) {
    log.warn(`Time "${id}" is not initialized, ignoring`);
  } else {
    const start = TIMERS[id];
    const now = Date.now();
    delete TIMERS[id];
    log.info(`${id}: ${now - start}ms`);
  }
}

export const loggerExtras = {
  time,
  timeEnd,
};
