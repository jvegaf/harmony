/**
 * Module in charge of pausing the player when going into sleep
 */

import electron from 'electron';

import channels from '../../preload/lib/ipc-channels';

import ModuleWindow from './BaseWindowModule';

export default class PowerMonitorModule extends ModuleWindow {
  async load(): Promise<void> {
    const { powerMonitor } = electron;
    const { window } = this;

    powerMonitor.on('suspend', () => {
      window.webContents.send(channels.PLAYBACK_PAUSE);
    });
  }
}
