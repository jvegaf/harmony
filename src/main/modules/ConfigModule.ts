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

    // AIDEV-NOTE: Migrate existing configs to add new properties
    this.migrateConfig();
  }

  /**
   * Migrate existing configs to add new properties that may be missing
   * AIDEV-NOTE: electron-store only applies defaults to top-level keys,
   * so we need to manually ensure nested properties exist
   */
  private migrateConfig(): void {
    const defaults = this.getDefaultConfig();

    // Migrate traktorConfig.autoSync if missing
    const traktorConfig = this.config.get('traktorConfig');
    if (traktorConfig && !traktorConfig.autoSync) {
      logger.info('[ConfigModule] Migrating traktorConfig to add autoSync');
      this.config.set('traktorConfig', {
        ...traktorConfig,
        autoSync: defaults.traktorConfig.autoSync,
      });
    }
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
      // AIDEV-NOTE: Default search engines for context menu. Users can add custom ones via Settings > General.
      searchEngines: [
        {
          id: 'default-beatport',
          name: 'Beatport',
          urlTemplate: 'https://www.beatport.com/search/tracks?q={query}',
          isDefault: true,
        },
        {
          id: 'default-traxsource',
          name: 'TraxxSource',
          urlTemplate: 'https://www.traxsource.com/search/tracks?term={query}',
          isDefault: true,
        },
        {
          id: 'default-google',
          name: 'Google',
          urlTemplate: 'https://www.google.com/search?q={query}',
          isDefault: true,
        },
      ],
      // AIDEV-NOTE: Traktor NML integration configuration, persisted to settings
      traktorConfig: {
        nmlPath: '',
        syncStrategy: 'smart_merge',
        cueStrategy: 'SMART_MERGE',
        syncOnStartup: false,
        autoBackup: true,
        autoSync: {
          enabled: false,
          direction: 'bidirectional',
          onStartup: true,
          onLibraryChange: true,
          debounceMs: 5000, // 5 seconds debounce for library changes
        },
      },
      // AIDEV-NOTE: Duplicate finder configuration, persisted to settings
      duplicateFinderConfig: {
        criteria: {
          title: true,
          artist: true,
          duration: true,
        },
        durationToleranceSeconds: 2,
        similarityThreshold: 0.85,
      },
    };

    return config;
  }
}
