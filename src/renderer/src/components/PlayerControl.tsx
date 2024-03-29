import { useState, useEffect } from 'react';
import usePlayerStore from '../stores/usePlayerStore';
import useLibraryStore from '../stores/useLibraryStore';
import classes from './PlayerControl.module.css';
import { PlayIcon } from '../elements/PlayIcon';
import { PauseIcon } from '../elements/PauseIcon';
import { PrevIcon } from '../elements/PrevIcon';
import { NextIcon } from '../elements/NextIcon';
import TrackProgress from './TrackProgress';
import { Track } from '@preload/emusik';
import { PlayerStatus } from '@preload/emusik-player';

export function PlayerControl() {
  const getTrackFromId = useLibraryStore(state => state.getTrackFromId);
  const playingTrack = usePlayerStore(state => state.playingTrack);
  const playerStatus = usePlayerStore(state => state.playerStatus);
  const togglePlayPause = usePlayerStore(state => state.api.togglePlayPause);
  const [trackPlaying, setTrackPlaying] = useState<Track | null>(null);

  useEffect(() => {
    if (playingTrack.length) {
      const track = getTrackFromId(playingTrack);
      if (!track) return;
      setTrackPlaying(track);
    }
  }, [playingTrack]);

  return (
    <div className={classes.playerRoot}>
      <div className={classes.playerControls}>
        <button
          className={classes.playerButton}
          // onClick={() => togglePlayPause()}
          disabled={playerStatus === PlayerStatus.STOP}
        >
          <PrevIcon />
        </button>
        <button
          className={classes.playerButton}
          onClick={() => togglePlayPause()}
          disabled={playerStatus === PlayerStatus.STOP}
        >
          {playerStatus === PlayerStatus.PLAY ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          className={classes.playerButton}
          // onClick={() => togglePlayPause()}
          disabled={playerStatus === PlayerStatus.STOP}
        >
          <NextIcon />
        </button>
      </div>

      <div className={classes.playerInfo}>
        <div className={classes.infoBox}>
          {trackPlaying && (
            <>
              <div className={classes.playerInfoTitle}>{trackPlaying.title}</div>
              <div className={classes.playerInfoArtist}>{trackPlaying?.artist}</div>
              <div className={classes.playerProgress}>
                <TrackProgress trackPlaying={trackPlaying} />
              </div>
            </>
          )}
        </div>
      </div>
      <div className={classes.playerSearch}>Search</div>
    </div>
  );
}
