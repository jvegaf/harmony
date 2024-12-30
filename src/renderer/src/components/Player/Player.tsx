import TrackProgress from '../TrackProgress/TrackProgress';
import Cover from '../Cover/Cover';
import usePlayingTrack from '../../hooks/usePlayingTrack';
import classes from './Player.module.css';
import PlayerInfo from '../PlayerInfo/PlayerInfo';
import PlayerControls from '../PlayerControls/PlayerControls';

export function PlayerComponent() {
  const trackPlaying = usePlayingTrack();

  return (
    <div className={classes.playerRoot}>
      <div className={classes.playerInfo}>
        <div className={classes.playerCover}>
          <Cover track={trackPlaying} />
        </div>
        <PlayerInfo track={trackPlaying} />
      </div>

      <div className={classes.playerControls}>
        <PlayerControls />
      </div>
      <div className={classes.playerProgress}>
        <TrackProgress trackPlaying={trackPlaying} />
      </div>
      <div className={classes.playerVolume}>volume</div>
    </div>
  );
}
