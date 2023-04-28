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
  ShowContextMenu(selected: TrackId[]) {
    ipcRenderer.send('show-context-menu', selected);
  },
  OpenFolder() {
    ipcRenderer.send('open-folder');
  },
  FixTrack(trackId: TrackId) {
    ipcRenderer.send('fix-track', trackId);
  },
  FixTracks(tracks: TrackId[]) {
    ipcRenderer.send('fix-tracks', tracks);
  },
  PersistTrack(track: Track) {
    ipcRenderer.send('persist', track);
  },
  FixAll() {
    ipcRenderer.send('fix-all');
  },
  GetTrack(trackId: TrackId) {
    ipcRenderer.sendSync('get-track', trackId);
  },
  GetAll() {
    ipcRenderer.sendSync('get-all');
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Log(...args: any[]) {
    ipcRenderer.send('log', ...args);
  },
  async FindArtWork(track: Track) {
    ipcRenderer.invoke('find-artwork', track);
  },
  SaveArtWork(artTrack: any) {
    ipcRenderer.send('save-artwork', artTrack);
  },
  /* ELECTRON STORE APIs */
  set(key: string, val: unknown) {
    ipcRenderer.send('set', key, val);
  },
  get(key: string) {
    return ipcRenderer.sendSync('get', key);
  },
});