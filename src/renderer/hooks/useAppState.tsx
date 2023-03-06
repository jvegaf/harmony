import React from "react";
import { PlayerContextType } from "renderer/@types/emusik";
import PlayerContext from "renderer/context/PlayerContext";
import type { Track, TrackId } from "../../shared/types/emusik";
import AppContext from "../context/AppContext";

export default function useAppState() {
  const { tracksLoaded, setTracksLoaded } = React.useContext(AppContext);
  const { setTrackPlaying, setIsPlaying, setPlayingId } = React.useContext(PlayerContext) as PlayerContextType;

  const onOpenFolder = React.useCallback(() => window.Main.OpenFolder(), []);

  const onFixTracks = React.useCallback((selected: Track[]) => window.Main.FixTracks(selected), []);

  const saveChanges = React.useCallback((track: Track) => window.Main.PersistTrack(track), []);

  const onFixTrack = React.useCallback((trackId: TrackId) => window.Main.FixTrack(trackId), []);

  const onFixAllTracks = React.useCallback(() => window.Main.FixAll(), []);

  const onFindArtwork = React.useCallback((track: Track) => window.Main.FindArtWork(track), []);

  const playTrack = (track: Track) => {
    setTrackPlaying(track);
    setIsPlaying(true);
    setPlayingId(track.id);
  };

  return {
    playTrack,
    onFixTrack,
    onFixTracks,
    onFixAllTracks,
    onFindArtwork,
    saveChanges,
    onOpenFolder,
    tracksLoaded,
    setTracksLoaded,
  };
}
