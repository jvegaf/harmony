import React from 'react';
import type { Track } from '../../shared/types/emusik';
import PlayerContext from '../context/PlayerContext';
import useLog from './useLog';

export default function usePlayer(){
  const { 
    trackPlaying, 
    setTrackPlaying, 
    isPlaying, 
    setIsPlaying, 
    playingId, 
    setPlayingId 
  } = React.useContext(PlayerContext);
  const log = useLog();

  const playTrack = (track: Track) => {
    setTrackPlaying(track);
    log.info('track en el hook', track.title);
    setPlayingId(track.id);
  };

  const togglePlayPause = () => setIsPlaying(!isPlaying);

  return {
    playingId,
    trackPlaying,
    isPlaying,
    playTrack,
    togglePlayPause,
    setIsPlaying
  };
}
