import { useEffect, useRef, useMemo, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

import { Track } from '../../../../preload/types/harmony';

import styles from './DuplicateFinderTool.module.css';

/**
 * MiniWaveform - Compact waveform visualization for duplicate finder using WaveSurfer.js
 * AIDEV-NOTE: Uses WaveSurfer for rendering with pre-computed waveformPeaks from database.
 * When no waveform data exists, shows a deterministic placeholder.
 * This is a static display (no playback) - clicking triggers onPlay callback.
 */

type MiniWaveformProps = {
  track: Track;
  width?: number;
  height?: number;
  onClick?: () => void;
  color?: string;
};

export default function MiniWaveform({
  track,
  width = 400,
  height = 44,
  onClick,
  color = '#fa8905',
}: MiniWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const hasWaveformData = track.waveformPeaks && track.waveformPeaks.length > 0;

  // Generate deterministic placeholder peaks based on track duration
  const placeholderPeaks = useMemo(() => {
    const peakCount = 100;
    const peaks: number[] = [];
    // Use track duration as seed for consistent "random" heights
    const seed = track.duration || 180;
    for (let i = 0; i < peakCount; i++) {
      // Simple deterministic pseudo-random based on position and duration
      const val = Math.sin(seed * (i + 1) * 0.1) * 0.5 + 0.5;
      peaks.push(0.2 + val * 0.6); // Range 0.2 to 0.8
    }
    return peaks;
  }, [track.duration]);

  // Create WaveSurfer instance
  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy existing instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
      setIsReady(false);
    }

    const peaks = hasWaveformData ? track.waveformPeaks! : placeholderPeaks;
    const waveColor = hasWaveformData ? color : 'rgba(107, 114, 128, 0.6)';

    // Create WaveSurfer with peaks data (no audio URL needed for static display)
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveColor,
      progressColor: waveColor,
      height: height - 4, // Account for padding
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      cursorWidth: 0, // No cursor for static display
      interact: false, // Disable interaction (we handle clicks ourselves)
      normalize: true,
      // AIDEV-NOTE: Load peaks directly without audio file
      peaks: [peaks],
      duration: track.duration || 180, // Fallback duration if not available
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setIsReady(true);
    });

    // For peaks-only rendering, WaveSurfer is ready immediately
    setIsReady(true);

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [track.waveformPeaks, hasWaveformData, color, height, placeholderPeaks, track.duration]);

  const handleClick = () => {
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <button
      type='button'
      className={styles.waveformCell}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ width, height }}
      title={hasWaveformData ? 'Click to play' : 'Click to play (no waveform data)'}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.15s ease-in-out',
        }}
      />
    </button>
  );
}
