import TrackProgress from '../TrackProgress/TrackProgress';
import {
  IoPauseCircleOutline,
  IoPlayCircleOutline,
  IoPlaySkipBackCircleOutline,
  IoPlaySkipForwardCircleOutline,
} from 'react-icons/io5';
import { PlayerStatus } from '../../../../preload/types/emusik';
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';
import { useLibraryAPI } from '../../stores/useLibraryStore';
import Cover from '../Cover/Cover';
import usePlayingTrack from '../../hooks/usePlayingTrack';
import classes from './Player.module.css';

export function PlayerComponent() {
  const playerAPI = usePlayerAPI();
  const libraryAPI = useLibraryAPI();
  const { playerStatus } = usePlayerStore();
  const trackPlaying = usePlayingTrack();

  return (
    <div className={classes.playerRoot}>
      <div className={classes.playerControls}>
        <button
          className={classes.playerButton}
          onClick={() => playerAPI.previous()}
          disabled={playerStatus === PlayerStatus.STOP}
        >
          <IoPlaySkipBackCircleOutline />
        </button>
        <button
          className={classes.playerButton}
          onClick={() => playerAPI.playPause()}
          disabled={playerStatus === PlayerStatus.STOP}
        >
          {playerStatus === PlayerStatus.PLAY ? <IoPauseCircleOutline /> : <IoPlayCircleOutline />}
        </button>
        <button
          className={classes.playerButton}
          onClick={() => playerAPI.next()}
          disabled={playerStatus === PlayerStatus.STOP}
        >
          <IoPlaySkipForwardCircleOutline />
        </button>
      </div>

      <div className={classes.playerInfo}>
        <Cover track={trackPlaying} />
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
