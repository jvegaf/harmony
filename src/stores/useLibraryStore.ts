import { create } from 'zustand'
import { Track } from '../../electron/types'

interface LibraryState {
  tracks: Track[];
  addTrack: (track: Track) => void;
}

const useLibraryStore = create<LibraryState>((set) => ({
  tracks: [],
  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
}))

export default useLibraryStore
