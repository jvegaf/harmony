import React from 'react';
import { Track, TrackId } from '../../shared/types/emusik';
import AppContext from '../context/AppContext';

export default function useAppState() {
  const { trackPlaying, setTrackPlaying, trackDetail, setTrackDetail, tracksLoaded, setTracksLoaded } =
    React.useContext(AppContext);

  const onOpenFolder = React.useCallback(() => window.Main.OpenFolder(), []);

  const onFixTracks = React.useCallback((selected: TrackId[]) => window.Main.FixTracks(selected), []);

  const closeDetail = React.useCallback(() => setTrackDetail(null), [setTrackDetail]);

  const saveChanges = React.useCallback((track: Track) => window.Main.PersistTrack(track), []);

  const onFixTrack = React.useCallback((trackId: TrackId) => window.Main.FixTrack(trackId), []);

  const onFixAllTracks = React.useCallback(() => window.Main.FixAll(), []);

  const onFindArtwork = React.useCallback((trackId: TrackId) => window.Main.FindArtwork(trackId), []);

  const updateTrackPlaying = (trackId: TrackId) => setTrackPlaying(trackId);

  const updateTrackDetail = (trackId: TrackId) => setTrackDetail(trackId);

  return {
    trackPlaying,
    updateTrackPlaying,
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
