import { contextBridge, ipcRenderer } from 'electron';
import { Track, TrackId } from 'shared/types/emusik';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing: () => ipcRenderer.send('ipc-example', 'ping'),
    openFolder: () => ipcRenderer.invoke('open-folder'),
    showContextMenu: (trackId: TrackId) => ipcRenderer.send('show-context-menu', trackId),
    fixTrack: (track: Track) => ipcRenderer.invoke('fix-track', track),
    fixTracks: (tracks: Track[]) => ipcRenderer.invoke('fix-tracks', tracks),
    persistTrack: (track: Track) => ipcRenderer.send('persist', track),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(channel: string, func: (...args: any[]) => void) {
      const validChannels = ['ipc-example', 'play-command', 'view-detail-command', 'fix-track-command'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (_event, ...args) => func(...args));
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    once(channel: string, func: (...args: any[]) => void) {
      const validChannels = ['ipc-example'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (_event, ...args) => func(...args));
      }
    },
  },
});
