import { create } from 'zustand';
import log from 'electron-log/renderer';
import { Track, TrackId } from 'src/preload/emusik';
import { FileWithPath } from '@mantine/dropzone';
import useAppStore from './useAppStore';

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
  nextTrack: (prevId: TrackId) => TrackId;
  previousTrack: (prevId: TrackId) => TrackId;
}

const useLibraryStore = create<LibraryState>(set => ({
  tracks: [],
  sorted: [],
  isSorted: false,
  setSorted: sorted => set({ sorted, isSorted: true }),
  addTrack: track => set(state => ({ tracks: [...state.tracks, track] })),
  updateTrack: track => {
    set(state => ({ tracks: state.tracks.map(t => (t.id === track.id ? track : t)) }));
    const updateMessage = useAppStore.getState().updateMessage;
    updateMessage(`Track updated:      ${track.artist} - ${track.title} `);
  },
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
  nextTrack: id => {
    const tracks = useLibraryStore.getState().tracks;
    const idx = tracks.findIndex(t => t.id === id);
    if (tracks.length <= idx + 1) return tracks[0].id;
    return tracks[idx + 1].id;
  },
  previousTrack: id => {
    const tracks = useLibraryStore.getState().tracks;
    const idx = tracks.findIndex(t => t.id === id);
    if (idx === 0) return tracks[tracks.length - 1].id;
    return tracks[idx - 1].id;
  },
}));

export default useLibraryStore;
