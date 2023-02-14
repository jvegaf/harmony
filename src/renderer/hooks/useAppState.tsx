import React from "react";
import { PlayerContextType } from "renderer/@types/emusik";
import PlayerContext from "renderer/context/PlayerContext";
import type { Track, TrackId } from "../../shared/types/emusik";
import AppContext from "../context/AppContext";

export default function useAppState() {
  const { trackDetail, setTrackDetail, tracksLoaded, setTracksLoaded } = React.useContext(AppContext);
  const { setTrackPlaying, setIsPlaying, setPlayingId } = React.useContext(PlayerContext) as PlayerContextType;

  const onOpenFolder = React.useCallback(() => window.Main.OpenFolder(), []);

  const onFixTracks = React.useCallback((selected: TrackId[]) => window.Main.FixTracks(selected), []);

  const closeDetail = React.useCallback(() => setTrackDetail(null), [setTrackDetail]);

  const saveChanges = React.useCallback((track: Track) => window.Main.PersistTrack(track), []);

  const onFixTrack = React.useCallback((trackId: TrackId) => window.Main.FixTrack(trackId), []);

  const onFixAllTracks = React.useCallback(() => window.Main.FixAll(), []);

  const onFindArtwork = React.useCallback((track: Track) => window.Main.FindArtWork(track), []);

  const playTrack = (track: Track) => {
    setTrackPlaying(track);
    setIsPlaying(true);
    setPlayingId(track.id);
  };

  const updateTrackDetail = (track: Track) => setTrackDetail(track.id);

  return {
    playTrack,
    trackDetail,
    updateTrackDetail,
    onFixTrack,
    onFixTracks,
    onFixAllTracks,
    onFindArtwork,
    saveChanges,
    closeDetail,
    onOpenFolder,
    tracksLoaded,
    setTracksLoaded,
  };
}
