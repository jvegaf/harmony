import { app, shell, BrowserWindow } from 'electron';
import { installExtension, REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

import log from 'electron-log';

import ApplicationMenuModule from './modules/ApplicationMenuModule';
import ConfigModule from './modules/ConfigModule';
import ContextMenuModule from './modules/ContextMenuModule';
import DatabaseModule from './modules/DatabaseModule';
import DialogsModule from './modules/DialogsModule';
import DockMenuModule from './modules/DockMenuDarwinModule';
import IPCCoverModule from './modules/IPCCoverModule';
import IPCLibraryModule from './modules/IPCLibraryModule';
import IPCLoggerModule from './modules/IPCLoggerModule';
import IPCPlaylistModule from './modules/IPCPlaylistModule';
import IPCTaggerModule from './modules/IPCTaggerModule';
import IPCAudioAnalysisModule from './modules/IPCAudioAnalysisModule';
import IPCTraktorModule from './modules/IPCTraktorModule';
import PowerModule from './modules/PowerMonitorModule';
import SleepBlockerModule from './modules/SleepBlockerModule';
import ThumbarModule from './modules/ThumbarModule';
import * as ModulesManager from './lib/modules-manager';

import icon from '../../resources/icon.png?asset';

log.initialize();
log.info('Starting Harmony...');

let mainWindow: BrowserWindow | null;

async function initModules(window: BrowserWindow): Promise<void> {
  const configModule = new ConfigModule();
  await ModulesManager.init(configModule).catch(log.error);

  await ModulesManager.init(
    new DatabaseModule(window),
    new PowerModule(window),
    new ApplicationMenuModule(window),
    new ThumbarModule(window),
    new DockMenuModule(window),
    new SleepBlockerModule(window),
    new DialogsModule(window),
    // Modules used to handle IPC APIs
    new ContextMenuModule(window, configModule),
    new IPCCoverModule(window),
    new IPCLibraryModule(window),
    new IPCPlaylistModule(window),
    new IPCTaggerModule(window),
    new IPCAudioAnalysisModule(window),
    new IPCTraktorModule(window, configModule),
    new IPCLoggerModule(window),
  ).catch(log.error);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  if (is.dev) {
    installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
      .then(([redux, react]) => log.info(`Added Extensions:  ${redux.name}, ${react.name}`))
      .catch(err => log.error('An error occurred: ', err));
  }
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.jvegaf.harmony');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  mainWindow = new BrowserWindow({
    title: 'Harmony',
    minWidth: 1366,
    minHeight: 768,
    width: 1366,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    // expose window controls in Windows/Linux
    ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
    },
  });

  initModules(mainWindow);

  mainWindow.on('ready-to-show', () => {
    // is.dev && mainWindow?.webContents.openDevTools({ mode: 'detach' });
    is.dev && mainWindow?.webContents.openDevTools();
    mainWindow?.maximize();

    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
});

// app.on('activate', function () {
// 	// On macOS it's common to re-create a window in the app when the
// 	// dock icon is clicked and there are no other windows open.
// 	if (BrowserWindow.getAllWindows().length === 0) createWindow();
// });

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
