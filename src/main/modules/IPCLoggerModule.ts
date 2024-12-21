import { ipcMain } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { rendererLogger } from '../lib/log/logger';

import ModuleWindow from './BaseWindowModule';
import { LogProps, LogLevel } from '../../preload/types/emusik';

class IPCLoggerModule extends ModuleWindow {
  async load(): Promise<void> {
    ipcMain.removeAllListeners(channels.LOGGER);
    ipcMain.on(channels.LOGGER, (_e, props: LogProps) => {
      const { level, message } = props;
      switch (level) {
        case LogLevel.INFO:
          rendererLogger.info(message);
          break;
        case LogLevel.WARN:
          rendererLogger.warn(message);
          break;
        case LogLevel.ERROR:
          rendererLogger.error(message);
          break;
        case LogLevel.DEBUG:
          rendererLogger.debug(message);
          break;
        default:
          rendererLogger.info(message);
          break;
      }
    });
  }
}

export default IPCLoggerModule;
