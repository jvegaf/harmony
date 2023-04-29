// eslint-disable-next-line import/no-extraneous-dependencies
import { contextBridge, ipcRenderer } from 'electron';
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
  showContextMenu: (selected: TrackId[]) => ipcRenderer.send('show-context-menu', selected),
  openFolder: () => ipcRenderer.send('open-folder'),
  fixTrack: (trackId: TrackId) => ipcRenderer.send('fix-track', trackId),
  fixTracks: (tracks: TrackId[]) => ipcRenderer.send('fix-tracks', tracks),
  persistTrack: (track: Track) => ipcRenderer.send('persist', track),
  fixAll: () => ipcRenderer.send('fix-all'),
  getTrack: (trackId: TrackId) => ipcRenderer.sendSync('get-track', trackId),
  getAll: () => ipcRenderer.sendSync('get-all'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (...args: any[]) => ipcRenderer.send('log', ...args),
  findArtWork: async (track: Track) => ipcRenderer.invoke('find-artwork', track),
  saveArtWork: (artTrack: any) => ipcRenderer.send('save-artwork', artTrack),
  /* ELECTRON STORE APIs */
  set(key: string, val: unknown) {
    ipcRenderer.send('set', key, val);
  },
  get(key: string) {
    return ipcRenderer.sendSync('get', key);
  },
});