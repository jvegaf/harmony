/**
 * Worker-safe logger
 *
 * AIDEV-NOTE: This logger automatically detects execution context and routes logs appropriately:
 * - Main thread: uses console.* (electron-log is loaded separately by modules)
 * - Worker thread: sends log messages to parent via parentPort (electron-log unavailable)
 *
 * Why this is needed:
 * - electron-log imports 'electron' module which is unavailable in worker_threads
 * - In production (packaged app), worker_threads run as pure Node.js processes
 * - This abstraction allows provider/client code to be worker-safe without manual checks
 *
 * Why console.* in main thread:
 * - The tagger providers/clients are called from both main thread AND worker threads
 * - In main thread, they're called by IPCTaggerModule which already uses electron-log for orchestration
 * - In workers, console.* output goes to the parent console which is already logged by electron-log
 * - Using console.* avoids bundling electron-log into worker chunks entirely
 *
 * Usage:
 *   import log from './worker-logger';
 *   log.info('Message', data);
 */

import { isMainThread, parentPort } from 'worker_threads';

interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

let logger: Logger;

if (isMainThread) {
  // Main thread: use console (electron-log captures console.* by default)
  logger = console;
} else {
  // Worker thread: send logs via parentPort to main thread
  // AIDEV-NOTE: Messages are received by TaggerWorkerManager and forwarded to electron-log
  logger = {
    info: (message: string, ...args: any[]) => {
      parentPort?.postMessage({ type: 'log', level: 'info', message, args });
    },
    warn: (message: string, ...args: any[]) => {
      parentPort?.postMessage({ type: 'log', level: 'warn', message, args });
    },
    error: (message: string, ...args: any[]) => {
      parentPort?.postMessage({ type: 'log', level: 'error', message, args });
    },
  };
}

export default logger;
