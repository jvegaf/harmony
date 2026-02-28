import { useEffect } from 'react';

import player from '../lib/player';
import { preventNativeDefault } from '../lib/utils-events';
import { logger } from '@renderer/lib/tauri-api';

/**
 * Handle app-level events: drag/drop prevention, audio output device changes
 */
export function useAppEvents() {
  useEffect(() => {
    // Prevent drop events on the window
    window.addEventListener('dragover', preventNativeDefault, false);
    window.addEventListener('drop', preventNativeDefault, false);

    // Support for multiple audio output
    async function updateOutputDevice() {
      try {
        await player.setOutputDevice('default');
      } catch (err) {
        logger.warn(err as any);
      }
    }

    navigator.mediaDevices.addEventListener('devicechange', updateOutputDevice);

    return function cleanup() {
      window.removeEventListener('dragover', preventNativeDefault, false);
      window.removeEventListener('drop', preventNativeDefault, false);

      navigator.mediaDevices.removeEventListener('devicechange', updateOutputDevice);
    };
  }, []);
}
