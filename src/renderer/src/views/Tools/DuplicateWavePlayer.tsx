import { useEffect, useRef, useState, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { Track } from '../../../../preload/types/harmony';
import styles from './DuplicateWavePlayer.module.css';

const { db } = window.Main;

/**
 * DuplicateWavePlayer - Simplified independent waveform player
 * AIDEV-NOTE: Create WaveSurfer lazily only when user clicks to play
 * Show static canvas preview of waveform until then
 */

type DuplicateWavePlayerProps = {
  track: Track;
  isActiveTrack: boolean;
  width?: number;
  height?: number;
  color?: string;
  onBecomeActive: () => void;
};

export default function DuplicateWavePlayer({
  track,
  isActiveTrack,
  width = 400,
  height = 44,
  color = '#fa8905',
  onBecomeActive,
}: DuplicateWavePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wavesurferCreated, setWavesurferCreated] = useState(false);
  const peaksSavedRef = useRef(false);
  const isActiveTrackRef = useRef(isActiveTrack);

  useEffect(() => {
    isActiveTrackRef.current = isActiveTrack;
  }, [isActiveTrack]);

  const audioUrl = window.Main.library.parseUri(track.path);
  const hasPreComputedPeaks = track.waveformPeaks && track.waveformPeaks.length > 0;

  // Generate deterministic placeholder peaks for tracks without waveform data
  const placeholderPeaks = useMemo(() => {
    const peakCount = 100;
    const peaks: number[] = [];
    const seed = track.duration || 180;
    for (let i = 0; i < peakCount; i++) {
      const val = Math.sin(seed * (i + 1) * 0.1) * 0.5 + 0.5;
      peaks.push(0.2 + val * 0.6);
    }
    return peaks;
  }, [track.duration]);

  const onBecomeActiveRef = useRef(onBecomeActive);
  onBecomeActiveRef.current = onBecomeActive;

  // Draw static waveform preview on canvas
  useEffect(() => {
    if (!canvasRef.current || wavesurferCreated) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const peaks = hasPreComputedPeaks ? track.waveformPeaks! : placeholderPeaks;
    const dpr = window.devicePixelRatio || 1;
    const h = height - 4;

    canvas.width = width * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, h);

    // Draw waveform bars
    const barWidth = 2;
    const barGap = 1;
    const barTotalWidth = barWidth + barGap;
    const barsCount = Math.floor(width / barTotalWidth);
    const step = peaks.length / barsCount;

    const waveColor = hasPreComputedPeaks ? '#4b5563' : 'rgba(107, 114, 128, 0.4)';
    ctx.fillStyle = waveColor;

    for (let i = 0; i < barsCount; i++) {
      const peakIndex = Math.floor(i * step);
      const peak = peaks[peakIndex] || 0;
      const barHeight = peak * h;
      const x = i * barTotalWidth;
      const y = (h - barHeight) / 2;

      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [width, height, hasPreComputedPeaks, track.waveformPeaks, placeholderPeaks, wavesurferCreated]);

  // Trigger WaveSurfer creation when track becomes active for the first time
  useEffect(() => {
    if (isActiveTrack && !wavesurferCreated) {
      setWavesurferCreated(true);
    }
  }, [isActiveTrack, wavesurferCreated]);

  // Create WaveSurfer instance ONLY ONCE
  useEffect(() => {
    if (!containerRef.current || !wavesurferCreated) return;

    console.log('[DuplicateWavePlayer] Creating WaveSurfer and loading audio:', audioUrl);

    setIsReady(false);
    setIsPlaying(false);
    peaksSavedRef.current = false;

    const peaks = hasPreComputedPeaks ? track.waveformPeaks! : placeholderPeaks;
    const waveColor = hasPreComputedPeaks ? '#4b5563' : 'rgba(107, 114, 128, 0.4)';
    const progressColor = hasPreComputedPeaks ? color : 'rgba(250, 137, 5, 0.4)';

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveColor,
      progressColor: progressColor,
      height: height - 4,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      cursorWidth: 1,
      cursorColor: 'rgba(255, 255, 255, 0.5)',
      interact: true,
      normalize: true,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      console.log('[DuplicateWavePlayer] Audio ready');
      setIsReady(true);

      // Auto-play only if this track is still active
      if (isActiveTrackRef.current) {
        setTimeout(() => {
          if (isActiveTrackRef.current && wavesurferRef.current) {
            wavesurferRef.current.play().catch(err => {
              console.error('[DuplicateWavePlayer] Auto-play failed:', err);
            });
          }
        }, 100);
      }
    });

    ws.on('play', () => {
      setIsPlaying(true);
    });

    ws.on('pause', () => {
      setIsPlaying(false);
    });

    ws.on('finish', () => {
      setIsPlaying(false);
    });

    ws.on('error', err => {
      console.error('[DuplicateWavePlayer] WaveSurfer error:', err);
    });

    ws.on('decode', async () => {
      if (!hasPreComputedPeaks && !peaksSavedRef.current) {
        peaksSavedRef.current = true;
        try {
          const exportedPeaks = ws.getDecodedData()?.getChannelData(0);
          if (exportedPeaks) {
            const targetLength = 1000;
            const blockSize = Math.floor(exportedPeaks.length / targetLength);
            const filteredPeaks: number[] = [];

            for (let i = 0; i < targetLength; i++) {
              const start = i * blockSize;
              const end = start + blockSize;
              let max = 0;
              for (let j = start; j < end && j < exportedPeaks.length; j++) {
                const abs = Math.abs(exportedPeaks[j]);
                if (abs > max) max = abs;
              }
              filteredPeaks.push(max);
            }

            await db.tracks.update({ ...track, waveformPeaks: filteredPeaks });
            console.log('[DuplicateWavePlayer] Saved peaks to database');
          }
        } catch (error) {
          console.error('[DuplicateWavePlayer] Failed to save waveform peaks:', error);
        }
      }
    });

    ws.on('interaction', () => {
      onBecomeActiveRef.current();
    });

    // Load audio with peaks if available
    if (hasPreComputedPeaks) {
      ws.load(audioUrl, [peaks], track.duration).catch(err => {
        console.error('[DuplicateWavePlayer] Load failed:', err);
      });
    } else {
      ws.load(audioUrl).catch(err => {
        console.error('[DuplicateWavePlayer] Load failed:', err);
      });
    }

    // Cleanup ONLY on component unmount
    return () => {
      console.log('[DuplicateWavePlayer] Destroying WaveSurfer for track:', track.id);
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [wavesurferCreated]);

  // Control playback when active state changes (after WaveSurfer is created)
  useEffect(() => {
    if (!wavesurferRef.current || !wavesurferCreated || !isReady) return;

    const ws = wavesurferRef.current;

    if (isActiveTrack && !isPlaying) {
      // Resume playback when this track becomes active
      ws.play().catch(err => {
        console.error('[DuplicateWavePlayer] Play failed:', err);
      });
    } else if (!isActiveTrack && isPlaying) {
      // Stop playback when another track becomes active
      ws.pause();
      ws.seekTo(0);
    }
  }, [isActiveTrack, wavesurferCreated, isPlaying, isReady]);

  const handleClick = () => {
    // Always notify parent to make this track active
    onBecomeActive();
  };

  return (
    <div
      className={`${styles.waveplayerContainer} ${isPlaying ? styles.playing : ''} ${isActiveTrack ? styles.active : ''}`}
      style={{ width, height }}
      title='Click to play'
      onClick={handleClick}
    >
      {!wavesurferCreated && (
        <canvas
          ref={canvasRef}
          className={styles.waveform}
        />
      )}
      <div
        ref={containerRef}
        className={styles.waveform}
        style={{ display: wavesurferCreated ? 'block' : 'none', opacity: isReady ? 1 : 0.3 }}
      />
      {isPlaying && <div className={styles.playingIndicator} />}
      {isActiveTrack && !isReady && <div className={styles.loadingIndicator}>Loading...</div>}
    </div>
  );
}
