import { useCallback, useState } from 'react';

import styles from './VolumeControl.module.css';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import { Slider } from '@mantine/core';
import { IconVolume, IconVolume2, IconVolume3, IconVolumeOff } from '@tabler/icons-react';

export default function VolumeControl() {
  const playerAPI = usePlayerAPI();
  const [volume, setVolume] = useState(100);

  const changeVol = useCallback(
    (to: number) => {
      playerAPI.setVolume(to / 100);
      setVolume(to);
    },
    [playerAPI],
  );

  const getVolumeIcon = () => {
    if (volume === 0) return <IconVolumeOff />;
    if (volume < 20) return <IconVolume />;
    if (volume < 60) return <IconVolume2 />;
    return <IconVolume3 />;
  };

  return (
    <div className={styles.volumeControl}>
      {getVolumeIcon()}
      <div className={styles.volumeSlider}>
        <Slider
          min={0}
          max={100}
          step={1}
          value={volume}
          onChange={changeVol}
        />
      </div>
    </div>
  );
}
