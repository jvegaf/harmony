import useLibraryStore from "../stores/useLibraryStore";
import { TrackList } from "../components/TrackList";
import usePlayerStore from "../stores/usePlayerStore";

export function HomeView() {
  const tracks = useLibraryStore((state) => state.tracks);
  const playTrack = usePlayerStore((state) => state.playTrack);

  return (
    <div>
      <TrackList tracks={tracks} playTrack={playTrack} />
    </div>
  );
}
