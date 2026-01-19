/**
 * Essential module for creating/loading the app config
 */

import { app, ipcMain } from 'electron';
import Store from 'electron-store';
import { cpus } from 'os';

import channels from '../../preload/lib/ipc-channels';

import Module from './BaseModule';
import { Config } from '@preload/types/harmony';
import { logger } from '../lib/log/logger';

export default class ConfigModule extends Module {
  private config: Store<Config>;

  constructor() {
    super();

    logger.debug(`Using "${app.getPath('userData')}" as config path`);

    this.config = new Store<Config>({
      name: 'harmony-settings',
      defaults: this.getDefaultConfig(),
    });
  }

  async load(): Promise<void> {
    ipcMain.on(channels.CONFIG_GET_ALL, event => {
      event.returnValue = this.config.store;
    });

    ipcMain.handle(channels.CONFIG_GET_ALL, (): Config => this.config.store);

    ipcMain.handle(channels.CONFIG_GET, <T extends keyof Config>(_e: Electron.Event, key: T): Config[T] => {
      logger.debug('Config get', key);
      return this.config.get(key);
    });

    ipcMain.handle(
      channels.CONFIG_SET,
      <T extends keyof Config>(_e: Electron.Event, key: T, value: Config[T]): void => {
        logger.debug('Config set', key, value);
        this.config.set(key, value);
      },
    );
  }

  getConfig(): Store<Config> {
    const config = this.config;

    if (config === undefined) {
      throw new Error('Config is not defined, has it been loaded?');
    }

    return config;
  }

  getDefaultConfig(): Config {
    const config: Config = {
      audioVolume: 1,
      audioOutputDevice: 'default',
      audioMuted: false,
      sleepBlocker: false,
      displayNotifications: true,
      audioPreCuePosition: 120,
      audioAnalysisWorkers: Math.max(1, cpus().length - 1),
      tracklistSort: {
        colId: 'path',
        mode: 'desc',
      },
    };

    return config;
  }
}
