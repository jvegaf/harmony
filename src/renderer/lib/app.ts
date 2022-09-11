import path from 'path';
import { app, getCurrentWindow } from '@electron/remote';
import teeny from 'teeny-conf';

export const browserWindows = {
  main: getCurrentWindow(),
};

export const pathUserData = app.getPath('userData');

/**
 * Config
 */
export const config = new teeny(path.join(pathUserData, 'config.json'));
