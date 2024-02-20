import {create} from 'zustand';
import type {Track} from '../../electron/types';
import {OPEN_FOLDER} from '../../electron/lib/ipc/channels';
import log from 'electron-log/renderer';

interface LibraryState {
  tracks: Track[];
  addTrack: (track: Track) => void;
  onOpen: () => void;
}

const useLibraryStore = create<LibraryState>(set => ({
  tracks: [],
  addTrack: track => set(state => ({tracks: [...state.tracks, track]})),
  onOpen: async () => {
    const newTracks = await window.ipcRenderer.invoke(OPEN_FOLDER);
    log.info('total tracks', newTracks.length);
    set({tracks: newTracks});
  },
}));

export default useLibraryStore;
