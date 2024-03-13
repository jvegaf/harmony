import {useState, useEffect} from 'react';
import usePlayerStore from '../stores/usePlayerStore';
import useLibraryStore from '../stores/useLibraryStore';
import type {Track} from '../../electron/types';
import {useGlobalAudioPlayer} from 'react-use-audio-player';
import classes from './Player.module.css';

export function Player() {
  const getTrackFromId = useLibraryStore(state => state.getTrackFromId);
  const playingTrack = usePlayerStore(state => state.playingTrack);
  const [trackPlaying, setTrackPlaying] = useState<Track | null>(null);
  const {load, togglePlayPause, playing} = useGlobalAudioPlayer();

  useEffect(() => {
    if (playingTrack) {
      const track = getTrackFromId(playingTrack);
      if (!track) return;
      setTrackPlaying(track);
      load(`file://${track.path}`, {autoplay: true});
    }
  }, [playingTrack]);

  return (
    <div className={classes.playerRoot}>
      <div className={classes.playerControls}>
        <button
          className={classes.playerButton}
          onClick={() => togglePlayPause()}
          disabled={!playingTrack}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className={classes.playerInfo}>
        <div className={classes.playerInfoTitle}>{trackPlaying?.title}</div>
        <div className={classes.playerInfoArtist}>{trackPlaying?.artist}</div>
      </div>
      <div className={classes.playerSearch}>Search</div>
    </div>
  );
}
