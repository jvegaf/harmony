// Native
import { join } from 'path';

// Packages
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainEvent,
  Menu,
  MenuItemConstructorOptions,
  PopupOptions
} from 'electron';
import isDev from 'electron-is-dev';
import { GetFilesFrom } from './services/fileManager';
import FixTags, { FixTracks } from './services/tagger/Tagger';
import { GetTracks } from './services/track/trackManager';
import PersistTrack from './services/tag/nodeId3Saver';
import { Track, TrackId } from './types/emusik';

const height = 600;
const width = 800;

let win: BrowserWindow | null = null;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width,
    height,
    show: true,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js')
    }
  });

  const port = process.env.PORT || 3000;
  const url = isDev ? `http://localhost:${port}` : join(__dirname, '../src/out/index.html');

  // and load the index.html of the app.
  if (isDev) {
    win?.loadURL(url);
  } else {
    win?.loadFile(url);
  }
  // Open the DevTools.
  win.webContents.openDevTools();

  // For AppBar
  // ipcMain.on('minimize', () => {
  //   // eslint-disable-next-line no-unused-expressions
  //   window.isMinimized() ? window.restore() : window.minimize();
  //   // or alternatively: win.isVisible() ? win.hide() : win.show()
  // });
  // ipcMain.on('maximize', () => {
  //   // eslint-disable-next-line no-unused-expressions
  //   window.isMaximized() ? window.restore() : window.maximize();
  // });

  // ipcMain.on('close', () => {
  //   window.close();
  // });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// listen the channel `message` and resend the received message to the renderer process
// ipcMain.on('message', (event: IpcMainEvent, message: any) => {
//   console.log(message);
//   setTimeout(() => event.sender.send('message', 'hi from electron'), 500);
// });

ipcMain.on('show-context-menu', (event: IpcMainEvent, selected: TrackId[]) => {
  const templateSingle = [
    {
      label: 'View Details',
      click: () => {
        event.sender.send('view-detail-command', selected[0]);
      }
    },
    {
      label: 'Play Track',
      click: () => {
        event.sender.send('play-command', selected[0]);
      }
    },
    { type: 'separator' },
    {
      label: 'Fix Track',
      click: () => {
        event.sender.send('fix-track-command', selected[0]);
      }
    }
  ] as MenuItemConstructorOptions[];

  const templateMultiple = [
    {
      label: `Fix this ${selected.length} Tracks`,
      click: () => {
        event.sender.send('fix-tracks-command', selected);
      }
    }
  ] as MenuItemConstructorOptions[];

  const template = selected.length > 1 ? templateMultiple : templateSingle;

  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender) as PopupOptions);
});

ipcMain.on('persist', (_, track) => PersistTrack(track));

ipcMain.handle('open-folder', async () => {
  const resultPath = await dialog.showOpenDialog(win as BrowserWindow, {
    properties: ['openDirectory']
  });

  if (resultPath.canceled) return null;

  const files = await GetFilesFrom(resultPath.filePaths[0]);
  const tracks: Track[] = await GetTracks(files);
  return tracks;
});

ipcMain.handle('fix-track', async (_, track) => {
  const updated = await FixTags(track);
  return updated;
});

ipcMain.handle('fix-tracks', async (_, tracks) => {
  const fixed = await FixTracks(tracks);
  return fixed;
});
