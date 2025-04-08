import TrackProgress from '../TrackProgress/TrackProgress';
import Cover from '../Cover/Cover';
import usePlayingTrack from '../../hooks/usePlayingTrack';
import classes from './PlayerBar.module.css';
import PlayerInfo from '../PlayerInfo/PlayerInfo';
import PlayerControls from '../PlayerControls/PlayerControls';
import VolumeControl from '../VolumeControl/VolumeControl';
import WavePlayer from './WavePlayer';

export function PlayerBar() {
  const trackPlaying = usePlayingTrack();

  return (
    <div className={classes.playerRoot}>
      <div className={classes.playerCover}>
        <Cover track={trackPlaying} />
      </div>
      <div className={classes.playerControls}>
        <PlayerControls />
      </div>
      <div className={classes.playerWaveform}>
        <WavePlayer />
      </div>
    </div>
  );
}
