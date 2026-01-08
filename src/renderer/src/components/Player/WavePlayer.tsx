import { useWavesurfer } from '../../hooks/useWavesurfer';
import { useRef, useEffect, useState, useMemo } from 'react';
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';
import { Config, PlayerStatus } from '../../../../preload/types/harmony';
import { WaveSurferOptions } from 'wavesurfer.js';
import './WavePlayer.css';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secondsRemainder = Math.round(seconds) % 60;
  const paddedSeconds = `0${secondsRemainder}`.slice(-2);
  return `${minutes}:${paddedSeconds}`;
};

type WavePlayerProps = {
  config: Config;
};

function WavePlayer({ config }: WavePlayerProps) {
  const { audioPreCuePosition } = config;
  const containerRef = useRef<HTMLInputElement>(null);
  const hoverRef = useRef<HTMLInputElement>(null);
  const playingTrack = usePlayerStore.use.playingTrack();
  const playerStatus = usePlayerStore.use.playerStatus();
  const isPreCueing = usePlayerStore.use.isPreCueing();
  const audioVolume = usePlayerStore.use.volume();
  const isMuted = usePlayerStore.use.isMuted();
  const playerAPI = usePlayerAPI();
  const [audioUrl, setAudioUrl] = useState('');
  const [time, setTime] = useState<string>('0:00');
  const [duration, setDuration] = useState<string>('0:00');

  const optionsMemo = useMemo((): Omit<WaveSurferOptions, 'container'> => {
    let gradient, progressGradient;
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Updated waveform colors to match the new orange theme
      gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 1.35);
      gradient.addColorStop(0, '#4b5563');
      gradient.addColorStop((canvas.height * 0.7) / canvas.height, '#4b5563');
      gradient.addColorStop((canvas.height * 0.7 + 1) / canvas.height, '#6b7280');
      gradient.addColorStop((canvas.height * 0.7 + 2) / canvas.height, '#6b7280');
      gradient.addColorStop((canvas.height * 0.7 + 3) / canvas.height, '#374151');
      gradient.addColorStop(1, '#374151');

      // Orange progress gradient matching the primary color
      progressGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 1.35);
      progressGradient.addColorStop(0, '#fa8905');
      progressGradient.addColorStop((canvas.height * 0.7) / canvas.height, '#f76707');
      progressGradient.addColorStop((canvas.height * 0.7 + 1) / canvas.height, '#ffd8a8');
      progressGradient.addColorStop((canvas.height * 0.7 + 2) / canvas.height, '#ffd8a8');
      progressGradient.addColorStop((canvas.height * 0.7 + 3) / canvas.height, '#ffc078');
      progressGradient.addColorStop(1, '#ffc078');
    }
    return {
      waveColor: gradient,
      progressColor: progressGradient,
      autoplay: true,
      height: 64,
      barWidth: 2,
      url: audioUrl,
    };
  }, [audioUrl]);
  const wavesurfer = useWavesurfer(containerRef, optionsMemo);
  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!wavesurfer) return;

    const hover = hoverRef.current!;
    const waveform = containerRef.current!;
    waveform.addEventListener('pointermove', e => (hover.style.width = `${e.offsetX}px`));

    const subscriptions = [
      wavesurfer.on('decode', duration => {
        setDuration(formatTime(duration));
      }),
      wavesurfer.on('timeupdate', currentTime => {
        setTime(formatTime(currentTime));
      }),
      wavesurfer.once('interaction', () => {
        wavesurfer.play();
      }),
    ];

    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, [wavesurfer]);

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

  useEffect(() => {
    if (!wavesurfer) return;
    if (isPreCueing) {
      wavesurfer.on('play', () => wavesurfer.skip(audioPreCuePosition));
    }
  }, [wavesurfer, isPreCueing]);

  useEffect(() => {
    if (!wavesurfer) return;
    if (isMuted) {
      wavesurfer.setVolume(0);
    } else {
      wavesurfer.setVolume(audioVolume);
    }
  }, [wavesurfer, isMuted]);

  useEffect(() => {
    if (!wavesurfer) return;
    wavesurfer.setVolume(audioVolume);
  }, [wavesurfer, audioVolume]);

  return (
    <div className='wave-player-root'>
      {playingTrack && (
        <div
          ref={containerRef}
          className='wave-form-container'
        >
          <div className='time'>{time}</div>
          <div className='duration'>{duration}</div>
          <div
            ref={hoverRef}
            className='hover-wave'
          ></div>
          <div
            className='overlay'
            style={{
              position: 'absolute',
              height: '30px',
              width: '100%',
              bottom: '0',
              backdropFilter: 'brightness(0.5)',
            }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default WavePlayer;
