/**
 * Base module for modules that need access to the BrowserWindow.
 * Other modules should extend this class.
 */

import Module from './BaseModule';

export default class ModuleWindow extends Module {
  protected window: Electron.BrowserWindow;

  constructor(window: Electron.BrowserWindow) {
    super();
    this.window = window;
  }

  getWindow(): Electron.BrowserWindow {
    return this.window;
  }
}
