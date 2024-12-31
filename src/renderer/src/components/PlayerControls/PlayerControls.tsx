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
  const PLAY_ICON_SIZE = 42;
  const SKIP_ICON_SIZE = 26;

  return (
    <div className={styles.controls}>
      <button
        className={styles.playerButton}
        onClick={() => playerAPI.previous()}
        disabled={playerStatus === PlayerStatus.STOP}
      >
        <IconPlayerSkipBackFilled size={SKIP_ICON_SIZE} />
      </button>
      <button
        className={styles.playerButton}
        onClick={() => playerAPI.togglePlayPause()}
        disabled={playerStatus === PlayerStatus.STOP}
      >
        {playerStatus === PlayerStatus.PLAY ? (
          <IconPlayerPauseFilled size={PLAY_ICON_SIZE} />
        ) : (
          <IconPlayerPlayFilled size={PLAY_ICON_SIZE} />
        )}
      </button>
      <button
        className={styles.playerButton}
        onClick={() => playerAPI.next()}
        disabled={playerStatus === PlayerStatus.STOP}
      >
        <IconPlayerSkipForwardFilled size={SKIP_ICON_SIZE} />
      </button>
    </div>
  );
}

export default PlayerControls;
