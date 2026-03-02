import { useState, useEffect } from 'react';

export interface IViewportSize {
  width: number;
  height: number;
}

export const useViewportSize = (debounceTime = 250) => {
  const heightOffset = 220;
  const widthoffset = 256;
  const [viewportSize, setViewportSize] = useState<IViewportSize>({
    width: 0,
    height: 0,
  });

  const debounce = (fn: () => void, ms: number) => {
    let timer: number | null;
    return () => {
      if (timer !== null) clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        fn();
      }, ms);
    };
  };

  useEffect(() => {
    const debouncedHandleResize = debounce(() => {
      setViewportSize({
        width: window.innerWidth - widthoffset, //document.documentElement.clientWidth - doesn't work
        height: window.innerHeight - heightOffset, //document.documentElement.clientHeight - doesn't work
      });
    }, debounceTime);

    window.addEventListener('resize', debouncedHandleResize);

    debouncedHandleResize();

    return () => window.removeEventListener('resize', debouncedHandleResize);
  });

  return viewportSize;
};
