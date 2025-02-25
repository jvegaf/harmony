/**
 * Example of Module, other modules should extent this class
 */

import os from 'os';

import log from 'electron-log';

export default class Module {
  protected loaded: boolean;
  protected platforms: NodeJS.Platform[];

  constructor() {
    this.loaded = false;
    this.platforms = ['win32', 'linux', 'darwin'];
  }

  // To not be overriden
  async init(): Promise<void> {
    if (this.loaded) throw new TypeError(`Module ${this.constructor.name} is already loaded`);

    if (this.platforms.includes(os.platform())) {
      await this.load().catch(err => {
        throw err;
      });
      this.loaded = true;
      log.info(`Loaded ${this.constructor.name}`);
    } else {
      log.info(`Skipping load of ${this.constructor.name} (supported platform: ${this.platforms.join(', ')})`);
    }
  }

  // Can (now) be an asynchronous method
  async load(): Promise<void> {
    throw new TypeError(`Module ${this.constructor.name} should have a load() method`);
    // Do whatever you want here :)
  }
}
