import {
  IconPlayerSkipBackFilled,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerSkipForwardFilled,
} from '@tabler/icons-react';
import { PlayerStatus } from '../../../../preload/types/emusik';
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';
import styles from './PlayerControls.module.css';

function PlayerControls() {
  const playerAPI = usePlayerAPI();
  const { playerStatus } = usePlayerStore();

  return (
    <div className={styles.controls}>
      <button
        className={styles.playerButton}
        onClick={() => playerAPI.previous()}
        disabled={playerStatus === PlayerStatus.STOP}
      >
        <IconPlayerSkipBackFilled size={32} />
      </button>
      <button
        className={styles.playerButton}
        onClick={() => playerAPI.togglePlayPause()}
        disabled={playerStatus === PlayerStatus.STOP}
      >
        {playerStatus === PlayerStatus.PLAY ? <IconPlayerPauseFilled size={48} /> : <IconPlayerPlayFilled size={48} />}
      </button>
      <button
        className={styles.playerButton}
        onClick={() => playerAPI.next()}
        disabled={playerStatus === PlayerStatus.STOP}
      >
        <IconPlayerSkipForwardFilled size={32} />
      </button>
    </div>
  );
}

export default PlayerControls;
