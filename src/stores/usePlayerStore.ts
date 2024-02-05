import { create } from "zustand";
import { TrackId } from "../../electron/types";

type PlayerState = {
  playingTrack: TrackId | null;
  playTrack: (trackId: TrackId) => void;
};

const usePlayerStore = create<PlayerState>((set) => ({
  playingTrack: null,
  playTrack: (trackId: TrackId) => set({ playingTrack: trackId }),
}));

export default usePlayerStore;
