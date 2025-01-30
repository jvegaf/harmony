import {
  IconPlayerSkipBackFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipForwardFilled,
  IconSettings,
} from '@tabler/icons-react';
import { PlayerStatus } from '../../../../preload/types/harmony';
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';
import styles from './PlayerControls.module.css';
import ControlButton from '../../elements/Button/ControlButton';
import VolumeControl from '../VolumeControl/VolumeControl';
import PlayerInfo from '../PlayerInfo/PlayerInfo';
import usePlayingTrack from '../../hooks/usePlayingTrack';
import { useNavigate } from 'react-router-dom';

function PlayerControls() {
  const trackPlaying = usePlayingTrack();
  const playerAPI = usePlayerAPI();
  const navigate = useNavigate();
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
          <IconPlayerPlayFilled
            style={{ color: playerStatus === PlayerStatus.PLAY ? '#d30e21' : '#e6e6e6' }}
            size={ICON_SIZE}
          />
        </ControlButton>
        <ControlButton onClick={() => playerAPI.next()}>
          <IconPlayerSkipForwardFilled size={ICON_SIZE} />
        </ControlButton>
        <VolumeControl />
        <ControlButton onClick={() => navigate('/settings')}>
          <IconSettings size={ICON_SIZE} />
        </ControlButton>
      </div>
    </div>
  );
}

export default PlayerControls;
