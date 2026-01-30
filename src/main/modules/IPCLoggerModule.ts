import { app, ipcMain } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { logger, rendererLogger } from '../lib/log/logger';

import ModuleWindow from './BaseWindowModule';
import { LogProps, LogLevel } from '../../preload/types/harmony';
import { getLogsFromFile } from '../lib/log/log-reader';
import path from 'node:path';

class IPCLoggerModule extends ModuleWindow {
  async load(): Promise<void> {
    ipcMain.removeAllListeners(channels.LOGGER);
    ipcMain.on(channels.LOGGER, (_e, props: LogProps) => {
      const { level, params } = props;
      switch (level) {
        case LogLevel.INFO:
          rendererLogger.info(params);
          break;
        case LogLevel.WARN:
          rendererLogger.warn(params);
          break;
        case LogLevel.ERROR:
          rendererLogger.error(params);
          break;
        case LogLevel.DEBUG:
          rendererLogger.debug(params);
          break;
        default:
          rendererLogger.info(params);
          break;
      }
    });

    ipcMain.handle(channels.APP_GET_LOGS, async _ => {
      logger.info('Fetching application logs');
      const pathUserData = app.getPath('userData');
      const logPath = path.join(pathUserData, 'logs/main.log');
      const logs = await getLogsFromFile(logPath);
      logger.info(`Fetched ${logs.length} log entries`);
      return logs;
    });
  }
}

export default IPCLoggerModule;
