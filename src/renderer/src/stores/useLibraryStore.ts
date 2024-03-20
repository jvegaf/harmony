import { create } from 'zustand';
import log from 'electron-log/renderer';
import { Track, TrackId } from 'src/preload/emusik';

interface LibraryState {
  tracks: Track[];
  addTrack: (track: Track) => void;
  onOpen: () => void;
  getTrackFromId: (id: TrackId) => Track | undefined;
}

const useLibraryStore = create<LibraryState>(set => ({
  tracks: [],
  addTrack: track => set(state => ({ tracks: [...state.tracks, track] })),
  onOpen: async () => {
    const newTracks = await window.Main.openFolder();
    log.info('total tracks', newTracks.length);
    set({ tracks: newTracks });
  },
  getTrackFromId: id => {
    return useLibraryStore.getState().tracks.find(track => track.id === id);
  },
}));

export default useLibraryStore;
