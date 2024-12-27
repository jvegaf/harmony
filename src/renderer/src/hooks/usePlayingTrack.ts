import { Track } from '../../../preload/types/emusik';
import usePlayerStore from '../stores/usePlayerStore';

export default function usePlayingTrack(): Track | null {
  return usePlayerStore(state => {
    return state.playingTrack;
  });
}
