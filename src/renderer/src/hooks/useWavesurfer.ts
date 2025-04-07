import { useState, useEffect } from 'react';
import WaveSurfer, { WaveSurferOptions } from 'wavesurfer.js';

export const useWavesurfer = (
  containerRef: React.RefObject<HTMLDivElement>,
  options: Omit<WaveSurferOptions, 'container'>,
) => {
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      ...options,
      container: containerRef.current,
      renderFunction: (channels, ctx) => {
        const { width, height } = ctx.canvas;
        const barWidth = options.barWidth || 2;
        const barGap = options.barGap || 1;
        const barRadius = options.barRadius || 0;
        const separationLineHeight = 0.5;

        const barCount = Math.floor(width / (barWidth + barGap));
        const step = Math.floor(channels[0].length / barCount);

        const topPartHeight = height * 0.7;
        const bottomPartHeight = height * 0.3;

        ctx.beginPath();

        for (let i = 0; i < barCount; i++) {
          let sumTop = 0;
          let sumBottom = 0;

          for (let j = 0; j < step; j++) {
            const index = i * step + j;
            const topValue = Math.abs(channels[0][index] || 0);
            const bottomValue = Math.abs(channels[1]?.[index] || 0);

            sumTop += topValue;
            sumBottom += bottomValue;
          }

          const avgTop = sumTop / step;
          const avgBottom = sumBottom / step;

          const barHeight = (avgTop + avgBottom) * 1.2;

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
  }, [options, containerRef]);

  return wavesurfer;
};
