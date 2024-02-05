import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import useLibraryStore from "../stores/useLibraryStore";
import { TrackList } from "../components/TrackList";
import usePlayerStore from "../stores/usePlayerStore";

export function HomeView() {
  const navigate = useNavigate();
  const tracks = useLibraryStore((state) => state.tracks);
  const playTrack = usePlayerStore((state) => state.playTrack);

  useEffect(() => {
    if (!tracks.length) {
      navigate("/welcome");
    }
  }, [tracks, navigate]);

  return (
    <div>
      <TrackList tracks={tracks} playTrack={playTrack} />
    </div>
  );
}
