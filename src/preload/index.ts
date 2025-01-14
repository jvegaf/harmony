import { app, contextBridge, ipcRenderer, shell } from 'electron';
import { ElectronAPI, electronAPI } from '@electron-toolkit/preload';
import channels from './lib/ipc-channels';
import { Track, Playlist, LogLevel, TrackId, CtxMenuPayload, UpdateRatingPayload } from './types/harmony';
import parseUri from './lib/utils-uri';

const api = {
  app: {
    ready: () => ipcRenderer.send(channels.APP_READY),
    restart: () => ipcRenderer.send(channels.APP_RESTART),
    clone: () => ipcRenderer.send(channels.APP_CLOSE),
  },
  db: {
    tracks: {
      getAll: () => ipcRenderer.invoke(channels.TRACK_ALL),
      insertMultiple: (tracks: Track[]) => ipcRenderer.invoke(channels.TRACKS_ADD, tracks),
      update: (track: Track) => ipcRenderer.invoke(channels.TRACK_UPDATE, track),
      remove: (trackIDs: TrackId[]) => ipcRenderer.invoke(channels.TRACKS_REMOVE, trackIDs),
      findByID: (tracksIDs: string[]) => ipcRenderer.invoke(channels.TRACKS_BY_ID, tracksIDs),
      findByPath: (paths: string[]) => ipcRenderer.invoke(channels.TRACKS_BY_PATH, paths),
      findOnlyByID: (trackID: string) => ipcRenderer.invoke(channels.TRACK_BY_ID, trackID),
      findOnlyByPath: (path: string) => ipcRenderer.invoke(channels.TRACK_BY_PATH, path),
    },
    playlists: {
      getAll: () => ipcRenderer.invoke(channels.PLAYLIST_ALL),
      insert: (playlist: Playlist) => ipcRenderer.invoke(channels.PLAYLIST_ADD, playlist),
      rename: (playlistID: string, name: string) => ipcRenderer.invoke(channels.PLAYLIST_RENAME, playlistID, name),
      remove: (playlistID: string) => ipcRenderer.invoke(channels.PLAYLIST_REMOVE, playlistID),
      findByID: (playlistIDs: string[]) => ipcRenderer.invoke(channels.PLAYLISTS_BY_ID, playlistIDs),
      findOnlyByID: (playlistID: string) => ipcRenderer.invoke(channels.PLAYLIST_BY_ID, playlistID),
      setTracks: (playlistID: string, tracks: Track[]) =>
        ipcRenderer.invoke(channels.PLAYLIST_SET_TRACKS, playlistID, tracks),
    },
    reset: () => ipcRenderer.invoke(channels.DB_RESET),
  },
  library: {
    parseUri,
    fixTags: async (track: Track) => ipcRenderer.invoke(channels.FIX_TAGS, track),
    scanPaths: async (paths: string[]) => ipcRenderer.invoke(channels.LIBRARY_LOOKUP, paths),
    importTracks: async (tracks: Track[]) => ipcRenderer.invoke(channels.LIBRARY_IMPORT_TRACKS, tracks),
    updateRating: (payload: UpdateRatingPayload) => ipcRenderer.send(channels.TRACK_UPDATE_RATING, payload),
    updateMetadata: async (track: Track) => ipcRenderer.send(channels.TRACK_UPDATE_METADATA, track),
  },
  dialog: {
    open: async (opts: Electron.OpenDialogOptions) => ipcRenderer.invoke(channels.DIALOG_OPEN, opts),
    msgbox: async (opts: Electron.MessageBoxOptions) => ipcRenderer.invoke(channels.DIALOG_MESSAGE_BOX, opts),
  },
  covers: {
    getCoverAsBase64: (track: Track) => ipcRenderer.invoke(channels.COVER_GET, track.path),
  },
  logger: {
    info: (...params: any[]) => ipcRenderer.send(channels.LOGGER, { level: LogLevel.INFO, params }),
    warn: (...params: any[]) => ipcRenderer.send(channels.LOGGER, { level: LogLevel.WARN, params }),
    error: (...params: any[]) => ipcRenderer.send(channels.LOGGER, { level: LogLevel.ERROR, params }),
    debug: (...params: any[]) => ipcRenderer.send(channels.LOGGER, { level: LogLevel.DEBUG, params }),
  },
  menu: {
    show: (payload: CtxMenuPayload) => ipcRenderer.send(channels.MENU_SHOW, payload),
  },
  shell: {
    openExternal: shell.openExternal,
    openUserDataDirectory: () => shell.openPath(app.getPath('userData')),
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('ElectronAPI', electronAPI);
    contextBridge.exposeInMainWorld('Main', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.ElectronAPI = electronAPI;
  // @ts-ignore (define in dts)
  window.Main = api;
}

declare global {
  interface Window {
    ElectronAPI: ElectronAPI;
    Main: typeof api;
  }
}
