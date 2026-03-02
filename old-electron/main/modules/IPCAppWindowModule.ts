import { app, ipcMain } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { logger } from '../lib/log/logger';

import ModuleWindow from './BaseWindowModule';

/**
 * Module in charge of handling window control IPC events (minimize, maximize, close, restart)
 */
class IPCAppWindowModule extends ModuleWindow {
  async load(): Promise<void> {
    ipcMain.removeAllListeners(channels.APP_MAXIMIZE);
    ipcMain.removeAllListeners(channels.APP_MINIMIZE);
    ipcMain.removeAllListeners(channels.APP_CLOSE);
    ipcMain.removeAllListeners(channels.APP_RESTART);

    ipcMain.on(channels.APP_MAXIMIZE, () => {
      logger.info('Toggling maximize window');
      this.window.isMaximized() ? this.window.unmaximize() : this.window.maximize();
    });

    ipcMain.on(channels.APP_MINIMIZE, () => {
      logger.info('Minimizing window');
      this.window.minimize();
    });

    ipcMain.on(channels.APP_CLOSE, () => {
      logger.info('Closing window');
      this.window.close();
    });

    ipcMain.on(channels.APP_RESTART, () => {
      logger.info('Restarting application');
      app.relaunch();
      app.exit(0);
    });
  }
}

export default IPCAppWindowModule;
