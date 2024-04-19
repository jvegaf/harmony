import { create } from 'zustand';
import log from 'electron-log/renderer';
import { Track, TrackId } from 'src/preload/emusik';
import { FileWithPath } from '@mantine/dropzone';

interface LibraryState {
  tracks: Track[];
  sorted: Track[];
  isSorted: boolean;
  setSorted: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  updateTrack: (track: Track) => void;
  onOpen: () => void;
  onDrag: (files: FileWithPath[]) => void;
  getTrackFromId: (id: TrackId) => Track | undefined;
  fixTracks: (trackIds: TrackId[]) => void;
  updateTags: (track: Track) => void;
  removeTracks: (trackIds: TrackId[]) => void;
}

const useLibraryStore = create<LibraryState>(set => ({
  tracks: [],
  sorted: [],
  isSorted: false,
  setSorted: sorted => set({ sorted, isSorted: true }),
  addTrack: track => set(state => ({ tracks: [...state.tracks, track] })),
  updateTrack: track => set(state => ({ tracks: state.tracks.map(t => (t.id === track.id ? track : t)) })),
  onOpen: async () => {
    const newTracks = await window.Main.openFolder();
    log.info('total tracks', newTracks.length);
    set({ tracks: newTracks });
  },
  onDrag: async files => {
    const newTracks = await window.Main.openFiles(files.map(f => f.path!));
    log.info('total tracks', newTracks.length);
    set({ tracks: newTracks });
  },
  getTrackFromId: id => {
    return useLibraryStore.getState().tracks.find(track => track.id === id);
  },
  fixTracks: trackIds => {
    trackIds.forEach(id => {
      const track = useLibraryStore.getState().getTrackFromId(id);
      if (!track) return;
      window.Main.fixTrack(track);
    });
  },

  updateTags: track => {
    window.Main.persistTrack(track);

    set({ tracks: useLibraryStore.getState().tracks.map(t => (t.id === track.id ? track : t)) });
  },
  removeTracks: trackIds => {
    trackIds.forEach(id => {
      const track = useLibraryStore.getState().getTrackFromId(id);
      if (!track) return;
      set(state => ({ tracks: state.tracks.filter(t => t.id !== id) }));
      window.Main.removeTrack(track);
    });
  },
}));

export default useLibraryStore;