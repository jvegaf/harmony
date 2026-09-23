import { useEffect, useRef, useState } from 'react';

import { Config, PlayerStatus } from '@/types/harmony';
import player from '@/lib/player';
import usePlayerStore from '@/stores/usePlayerStore';
import styles from './AudioPlayer.module.css';

type AudioPlayerProps = {
  config: Config;
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

export default function AudioPlayer({ config }: AudioPlayerProps) {
  const { playingTrack, playerStatus, isPreCueing, isPruneMode } = usePlayerStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const preCueTrackRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = player.getAudio();
    const updateCurrentTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      const trackDuration = playingTrack ? playingTrack.duration / 1000 : 0;
      setDuration(Number.isFinite(audio.duration) ? audio.duration : trackDuration);
    };

    audio.addEventListener('timeupdate', updateCurrentTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    updateCurrentTime();
    updateDuration();

    return () => {
      audio.removeEventListener('timeupdate', updateCurrentTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
    };
  }, [playingTrack]);

  useEffect(() => {
    preCueTrackRef.current = null;
  }, [playingTrack?.id]);

  useEffect(() => {
    const audio = player.getAudio();

    const applyPreCue = () => {
      if ((!isPreCueing && !isPruneMode) || !playingTrack || preCueTrackRef.current === playingTrack.id) {
        return;
      }

      const maxTime = Number.isFinite(audio.duration) ? audio.duration : playingTrack.duration / 1000;
      audio.currentTime = Math.min(Math.max(config.audioPreCuePosition, 0), Math.max(maxTime, 0));
      preCueTrackRef.current = playingTrack.id;
    };

    audio.addEventListener('play', applyPreCue);
    return () => audio.removeEventListener('play', applyPreCue);
  }, [config.audioPreCuePosition, isPreCueing, isPruneMode, playingTrack]);

  const seek = (value: number) => {
    player.setCurrentTime(value);
    setCurrentTime(value);
  };

  if (!playingTrack) return null;

  const maxDuration = duration > 0 ? duration : playingTrack.duration / 1000;
  const progress = Math.min(Math.max(currentTime, 0), maxDuration);

  return (
    <div className={styles.player}>
      <div className={styles.timeline}>
        <span>{formatTime(progress)}</span>
        <input
          aria-label='Track progress'
          className={styles.slider}
          type='range'
          min={0}
          max={maxDuration}
          step={0.1}
          value={progress}
          onChange={event => seek(Number(event.currentTarget.value))}
        />
        <span>{formatTime(maxDuration)}</span>
      </div>
      <span className={styles.status}>{playerStatus === PlayerStatus.PLAY ? 'Playing' : 'Paused'}</span>
    </div>
  );
}
