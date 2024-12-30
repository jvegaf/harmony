import { app, shell, BrowserWindow } from 'electron';
import { installExtension, REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { mainLogger } from './lib/log/logger';
import ApplicationMenuModule from './modules/ApplicationMenuModule';
import PowerModule from './modules/PowerMonitorModule';
import ThumbarModule from './modules/ThumbarModule';
import DockMenuModule from './modules/DockMenuDarwinModule';
import SleepBlockerModule from './modules/SleepBlockerModule';
import DialogsModule from './modules/DialogsModule';
import IPCCoverModule from './modules/IPCCoverModule';
import IPCLibraryModule from './modules/IPCLibraryModule';
import * as ModulesManager from './lib/modules-manager';
import IPCTaggerModule from './modules/IPCTaggerModule';
import DatabaseModule from './modules/DatabaseModule';
import IPCLoggerModule from './modules/IPCLoggerModule';
import ContextMenuModule from './modules/ContextMenuModule';

mainLogger.info('Starting eMusik...');

let mainWindow: BrowserWindow | null;

function initModules(window: BrowserWindow): void {
  ModulesManager.init(
    new DatabaseModule(window),
    new PowerModule(window),
    new ApplicationMenuModule(window),
    new ThumbarModule(window),
    new DockMenuModule(window),
    new SleepBlockerModule(window),
    new DialogsModule(window),
    // Modules used to handle IPC APIs
    new ContextMenuModule(window),
    new IPCCoverModule(window),
    new IPCLibraryModule(window),
    new IPCTaggerModule(window),
    new IPCLoggerModule(window),
  ).catch(mainLogger.error);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
    .then(([redux, react]) => mainLogger.info(`Added Extensions:  ${redux.name}, ${react.name}`))
    .catch(err => mainLogger.error('An error occurred: ', err));
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.jvegaf.emusik');

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
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
    },
  });

  initModules(mainWindow);

  mainWindow.on('ready-to-show', () => {
    is.dev && mainWindow?.webContents.openDevTools({ mode: 'detach' });
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
