import { useCallback, useEffect, useState } from 'react';

import styles from './TrackProgress.module.css';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import usePlayingTrackCurrentTime from '../../hooks/usePlayingTrackCurrentTime';
import { Track } from '../../../../preload/types/emusik';
import { ParseDuration } from '../../../../preload/utils';
import { Slider } from '@mantine/core';

type Props = {
  trackPlaying: Track | null;
};

export default function TrackProgress(props: Props) {
  const { trackPlaying } = props;
  const [max, setMax] = useState(100);
  const [duration, setDuration] = useState(100);

  const elapsed = usePlayingTrackCurrentTime();
  const playerAPI = usePlayerAPI();

  const jumpAudioTo = useCallback(
    (to: number) => {
      playerAPI.jumpTo(to);
    },
    [playerAPI],
  );

  useEffect(() => {
    if (trackPlaying !== null) {
      setMax(trackPlaying.duration);
      setDuration(trackPlaying.duration);
    }
  }, [trackPlaying]);

  useEffect(() => {
    const remain = Math.round(duration - elapsed);
    if (remain < 1) playerAPI.next();
  }, [elapsed]);

  return (
    <div className={styles.trackProgress}>
      <div className={styles.timeText}>{ParseDuration(elapsed)}</div>
      <div className={styles.trackSlider}>
        <Slider
          min={0}
          max={max}
          step={1}
          value={elapsed}
          onChange={jumpAudioTo}
          label={value => ParseDuration(value)}
          thumbSize={20}
        />
      </div>
      <div className={styles.timeText}>{ParseDuration(duration)}</div>
    </div>
  );
}
