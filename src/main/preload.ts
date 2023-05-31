import { contextBridge, ipcRenderer } from 'electron';
import {
  FIND_ARTWORK,
  FIX_TRACKS,
  OPEN_FOLDER,
  PERSIST,
  SAVE_ARTWORK,
  SHOW_CONTEXT_MENU,
} from '@Shared/types/channels';
import { Track, ArtTrack } from '../shared/types/emusik';

declare global {
  interface Window {
    Main: typeof api;
    ipcRenderer: typeof ipcRenderer;
  }
}
const api = {
  ShowContextMenu: (selected: Track[]) => ipcRenderer.send(SHOW_CONTEXT_MENU, selected),
  OpenFolder: () => ipcRenderer.send(OPEN_FOLDER),
  FixTracks: (tracks: Track[]) => ipcRenderer.send(FIX_TRACKS, tracks),
  PersistTrack: (track: Track) => ipcRenderer.send(PERSIST, track),
  FindArtWork: async (track: Track) => ipcRenderer.invoke(FIND_ARTWORK, track),
  SaveArtWork: (artTrack: ArtTrack) => ipcRenderer.send(SAVE_ARTWORK, artTrack),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(channel: string, func: (...args: any[]) => void) {
    ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(channel: string, func: (...args: any[]) => void) {
    ipcRenderer.once(channel, (_event, ...args) => func(...args));
  },
};

contextBridge.exposeInMainWorld('Main', api);

contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);












