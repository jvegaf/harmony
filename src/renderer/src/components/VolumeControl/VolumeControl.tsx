import { useCallback, useState } from 'react';

import styles from './VolumeControl.module.css';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import { Slider } from '@mantine/core';
import { IconVolume, IconVolume2, IconVolumeOff } from '@tabler/icons-react';
import player from '../../lib/player';

export default function VolumeControl() {
  const audio = player.getAudio();
  const playerAPI = usePlayerAPI();
  const [volume, setVolume] = useState(audio.volume);
  const [isMuted, setIsMuted] = useState(audio.muted);

  const ICON_SIZE = 27;

  const changeVol = useCallback(
    (to: number) => {
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
    } else {
      playerAPI.setMuted(true);
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
          label={false}
        />
      </div>
    </div>
  );
}
