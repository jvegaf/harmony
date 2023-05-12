// eslint-disable-next-line import/no-extraneous-dependencies
import { contextBridge, ipcRenderer } from 'electron';
import {
  FIND_ARTWORK,
  FIX_TRACKS,
  OPEN_FOLDER,
  PERSIST,
  SAVE_ARTWORK,
  SHOW_CONTEXT_MENU,
} from 'src/shared/types/channels';
import { Track, TrackId } from 'src/shared/types/emusik';

contextBridge.exposeInMainWorld('ipc', {
  /*  ELECTRON IPC APIs */
  send(channel: string, args: unknown) {
    ipcRenderer.send(channel, args);
  },
  receive(channel: string, callBack: (...args: unknown[]) => void) {
    ipcRenderer.once(channel, (_event, ...args) => {
      callBack(...args);
    });
  },
  showContextMenu: (selected: TrackId[]) => ipcRenderer.send(SHOW_CONTEXT_MENU, selected),
  openFolder: () => ipcRenderer.send(OPEN_FOLDER),
  fixTracks: (tracks: TrackId[]) => ipcRenderer.send(FIX_TRACKS, tracks),
  persistTrack: (track: Track) => ipcRenderer.send(PERSIST, track),
  findArtWork: async (track: Track) => ipcRenderer.invoke(FIND_ARTWORK, track),
  saveArtWork: (artTrack: any) => ipcRenderer.send(SAVE_ARTWORK, artTrack),
  /* ELECTRON STORE APIs */
  set(key: string, val: unknown) {
    ipcRenderer.send('set', key, val);
  },
  get(key: string) {
    return ipcRenderer.sendSync('get', key);
  },
});