import { IconPlayerSkipBackFilled, IconPlayerPlayFilled, IconPlayerSkipForwardFilled } from '@tabler/icons-react';
import { PlayerStatus } from '../../../../preload/types/harmony';
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';
import styles from './PlayerControls.module.css';
import ControlButton from '../../elements/Button/ControlButton';
import VolumeControl from '../VolumeControl/VolumeControl';
import PlayerInfo from '../PlayerInfo/PlayerInfo';
import usePlayingTrack from '../../hooks/usePlayingTrack';

function PlayerControls() {
  const trackPlaying = usePlayingTrack();
  const playerAPI = usePlayerAPI();
  const { playerStatus } = usePlayerStore();
  const ICON_SIZE = 16;

  return (
    <div className={styles.controls}>
      <div className={styles.trackInfo}>
        <PlayerInfo track={trackPlaying} />
      </div>
      <div className={styles.playerControls}>
        <ControlButton onClick={() => playerAPI.previous()}>
          <IconPlayerSkipBackFilled size={ICON_SIZE} />
        </ControlButton>
        <ControlButton onClick={() => playerAPI.togglePlayPause()}>
          <IconPlayerPlayFilled size={ICON_SIZE} />
        </ControlButton>
        <ControlButton onClick={() => playerAPI.next()}>
          <IconPlayerSkipForwardFilled size={ICON_SIZE} />
        </ControlButton>
        <VolumeControl />
      </div>
    </div>
  );
}

export default PlayerControls;
