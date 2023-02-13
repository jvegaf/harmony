import React from "react";
import type { Track, TrackId } from "../../shared/types/emusik";
import AppContext from "../context/AppContext";

export default function useAppState() {
  const { trackDetail, setTrackDetail, tracksLoaded, setTracksLoaded } = React.useContext(AppContext);

  const onOpenFolder = React.useCallback(() => window.Main.OpenFolder(), []);

  const onFixTracks = React.useCallback((selected: TrackId[]) => window.Main.FixTracks(selected), []);

  const closeDetail = React.useCallback(() => setTrackDetail(null), [setTrackDetail]);

  const saveChanges = React.useCallback((track: Track) => window.Main.PersistTrack(track), []);

  const onFixTrack = React.useCallback((trackId: TrackId) => window.Main.FixTrack(trackId), []);

  const onFixAllTracks = React.useCallback(() => window.Main.FixAll(), []);

  const onFindArtwork = React.useCallback((trackId: TrackId) => window.Main.FindArtWork(trackId), []);

  const playTrack = (track: Track) => setTrackPlaying(track);

  const updateTrackDetail = (track: Track) => setTrackDetail(track.id);

  return {
    trackPlaying,
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
