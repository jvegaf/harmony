import React from 'react';
import { PlayerContextType } from 'renderer/@types/emusik';
import PlayerContext from 'renderer/context/PlayerContext';
import { ArtsTrackDTO, Track, TrackId } from '../../shared/types/emusik';
import AppContext from '../context/AppContext';

export default function useAppState() {
  const { tracksLoaded, setTracksLoaded } = React.useContext(AppContext);
  const { setTrackPlaying, setIsPlaying, setPlayingId } = React.useContext(PlayerContext) as PlayerContextType;
  const [artsFetched, setArtsFetched] = React.useState<ArtsTrackDTO | null>(null);

  const onOpenFolder = React.useCallback(() => window.Main.OpenFolder(), []);

  const onFixTracks = React.useCallback((selected: Track[]) => window.Main.FixTracks(selected), []);

  const saveChanges = React.useCallback((track: Track) => window.Main.PersistTrack(track), []);

  const onFixTrack = React.useCallback((trackId: TrackId) => window.Main.FixTrack(trackId), []);

  const onFixAllTracks = React.useCallback(() => window.Main.FixAll(), []);

  const playTrack = (trackId: TrackId) => {
    const track = window.Main.GetTrack(trackId);
    setTrackPlaying(track);
    setIsPlaying(true);
    setPlayingId(trackId);
  };

  return {
    playTrack,
    onFixTrack,
    onFixTracks,
    onFixAllTracks,
    saveChanges,
    onOpenFolder,
    tracksLoaded,
    setTracksLoaded,
    artsFetched,
    setArtsFetched,
  };
}
