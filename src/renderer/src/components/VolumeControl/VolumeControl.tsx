import { useCallback, useState } from 'react';

import styles from './VolumeControl.module.css';
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';
import { Slider } from '@mantine/core';
import { IconVolume, IconVolume2, IconVolumeOff } from '@tabler/icons-react';
import player from '../../lib/player';
import { logger } from '@renderer/lib/tauri-api';

export default function VolumeControl() {
  const audio = player.getAudio();
  const playerAPI = usePlayerAPI();
  const volumeStore = usePlayerStore.use.volume();
  const [volume, setVolume] = useState(audio.volume);
  const [isMuted, setIsMuted] = useState(audio.muted);

  const ICON_SIZE = 27;

  const changeVol = useCallback(
    (to: number) => {
      logger.debug('VolumeControl', 'changeVol', to);
      playerAPI.setVolume(to);
      setVolume(to);
    },
    [playerAPI],
  );

  const getVolumeIcon = () => {
    if (volume === 0 || isMuted) return <IconVolumeOff size={ICON_SIZE} />;
    if (volume < 50) return <IconVolume2 size={ICON_SIZE} />;
    return <IconVolume size={ICON_SIZE} />;
  };

  const toggleMute = () => {
    if (isMuted) {
      playerAPI.setMuted(false);
      setVolume(volumeStore);
    } else {
      playerAPI.setMuted(true);
      setVolume(0);
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className={styles.volumeControl}>
      <button
        className={styles.muteBtn}
        onClick={toggleMute}
      >
        {getVolumeIcon()}
      </button>
      <div className={styles.volumeSlider}>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={changeVol}
          labelTransitionProps={{
            transition: 'skew-down',
            duration: 150,
            timingFunction: 'linear',
          }}
          label={value => `${Math.round(value * 100)}%`}
        />
      </div>
    </div>
  );
}
