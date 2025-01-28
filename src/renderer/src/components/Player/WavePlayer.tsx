import { useWavesurfer } from '@wavesurfer/react';
import { useRef, useEffect, useState } from 'react';
import styles from './WavePlayer.module.css';
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';
import { Track, PlayerStatus } from '../../../../preload/types/harmony';

const { config } = window.Main;

function WavePlayer() {
  const containerRef = useRef(null);
  const playingTrack = usePlayerStore.use.playingTrack();
  const playerStatus = usePlayerStore.use.playerStatus();
  const playerAPI = usePlayerAPI();
  const [audioUrl, setAudioUrl] = useState('');

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    autoplay: true,
    height: 70,
    waveColor: '#656566',
    progressColor: '#eb4926',
    cursorColor: 'transparent',
    autoCenter: true,
    barWidth: 2,
    barGap: 2,
    url: audioUrl,
  });

  useEffect(() => {
    if (playingTrack !== null) {
      const audioUri = window.Main.library.parseUri(playingTrack.path);
      setAudioUrl(audioUri);
    }
  }, [playingTrack]);

  useEffect(() => {
    if (wavesurfer) {
      wavesurfer.on('finish', () => {
        playerAPI.next();
      });
    }
  }, [wavesurfer]);

  useEffect(() => {
    if (playerStatus === PlayerStatus.PLAY) {
      wavesurfer && wavesurfer.play();
    }
    if (playerStatus === PlayerStatus.PAUSE) {
      wavesurfer && wavesurfer.pause();
    }
  }, [playerStatus]);

  return (
    <div className={styles.wavePlayerRoot}>
      <div ref={containerRef} />
    </div>
  );
}

export default WavePlayer;
