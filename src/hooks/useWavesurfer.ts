import { useState, useEffect } from 'react';
import WaveSurfer, { WaveSurferOptions } from 'wavesurfer.js';
import { Track } from '@/types/harmony';

/**
 * Enhanced useWavesurfer hook with database-backed waveform peaks
 * - First checks if track has pre-computed waveformPeaks in database
 * - If peaks exist, uses them directly (faster, no re-analysis)
 * - If no peaks, falls back to WaveSurfer's default audio analysis
 */

export const useWavesurfer = (
  containerRef: React.RefObject<HTMLDivElement>,
  options: Omit<WaveSurferOptions, 'container'>,
  track?: Track | null,
) => {
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!containerRef.current) return;

    // Check if we have pre-computed waveform peaks from database
    const hasCachedPeaks = track?.waveformPeaks && track.waveformPeaks.length > 0;

    const ws = WaveSurfer.create({
      ...options,
      container: containerRef.current,
      // Use custom render function to support cached peaks
      renderFunction: (channels, ctx) => {
        const { width, height } = ctx.canvas;
        const barWidth = options.barWidth || 2;
        const barGap = options.barGap || 1;

        const barCount = Math.floor(width / (barWidth + barGap));

        // Use cached peaks if available, otherwise use live audio data
        let peaksData: number[];
        if (hasCachedPeaks && track?.waveformPeaks) {
          // Use pre-computed peaks from database (fast path)
          peaksData = track.waveformPeaks;
        } else {
          // Fall back to analyzing live audio channels (slow path)
          const step = Math.floor(channels[0].length / barCount);
          peaksData = [];
          for (let i = 0; i < barCount; i++) {
            let sumTop = 0;
            let sumBottom = 0;
            for (let j = 0; j < step; j++) {
              const index = i * step + j;
              sumTop += Math.abs(channels[0][index] || 0);
              sumBottom += Math.abs(channels[1]?.[index] || 0);
            }
            const avgTop = sumTop / step;
            const avgBottom = sumBottom / step;
            peaksData.push((avgTop + avgBottom) / 2);
          }
        }

        // Normalize peaks to fit barCount
        const peakStep = peaksData.length / barCount;

        const topPartHeight = height * 0.7;
        const bottomPartHeight = height * 0.3;

        ctx.beginPath();

        for (let i = 0; i < barCount; i++) {
          // Sample from peaks data
          const peakIndex = Math.floor(i * peakStep);
          const peakValue = peaksData[peakIndex] || 0;

          const barHeight = peakValue * 1.2;

          let yTop = topPartHeight - barHeight * topPartHeight;
          let yBottom = topPartHeight + barHeight * bottomPartHeight;

          if (options.barAlign === 'top') {
            yTop = 0;
            yBottom = bottomPartHeight;
          } else if (options.barAlign === 'bottom') {
            yTop = height - topPartHeight;
            yBottom = height;
          }

          ctx.rect(i * (barWidth + barGap), yTop, barWidth, barHeight * topPartHeight);
          ctx.rect(
            i * (barWidth + barGap),
            yBottom - barHeight * bottomPartHeight,
            barWidth,
            barHeight * bottomPartHeight,
          );
        }
        ctx.fill();
        ctx.closePath();
      },
    });
    setWavesurfer(ws);
    return () => {
      ws.destroy();
    };
  }, [options, containerRef, track]);

  return wavesurfer;
};
