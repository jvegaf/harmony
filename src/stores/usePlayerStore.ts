import { create } from 'zustand'
import { Track } from '../../electron/types'

type PlayerState = {
  playingTrack: Track | null
  playTrack: (track: Track | null) => void
}


const usePlayerStore = create<PlayerState>((set) => ({
  playingTrack: null,
  playTrack: (track) => set({ playingTrack: track }),
}))

export default usePlayerStore
