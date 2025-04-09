import TrackProgress from '../TrackProgress/TrackProgress';
import Cover from '../Cover/Cover';
import usePlayingTrack from '../../hooks/usePlayingTrack';
import classes from './PlayerBar.module.css';
import PlayerInfo from '../PlayerInfo/PlayerInfo';
import PlayerControls from '../PlayerControls/PlayerControls';
import VolumeControl from '../VolumeControl/VolumeControl';
import WavePlayer from './WavePlayer';
import { useRouteLoaderData } from 'react-router-dom';
import { RootLoaderData } from '../../views/Root';

export function PlayerBar() {
  const trackPlaying = usePlayingTrack();
  const { appConfig } = useRouteLoaderData('root') as RootLoaderData;

  return (
    <div className={classes.playerRoot}>
      <div className={classes.playerCover}>
        <Cover track={trackPlaying} />
      </div>
      <div className={classes.playerControls}>
        <PlayerControls />
      </div>
      <div className={classes.playerWaveform}>
        <WavePlayer preCuePos={appConfig.audioPreCuePosition} />
      </div>
    </div>
  );
}
