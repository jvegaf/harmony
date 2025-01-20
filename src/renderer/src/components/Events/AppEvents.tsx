import { useEffect } from 'react';

import player from '../../lib/player';
import { preventNativeDefault } from '../../lib/utils-events';

const { logger } = window.Main;

/**
 * Handle app-level IPC Events init and cleanup
 */
function AppEvents() {
  useEffect(() => {
    // Prevent drop events on the window
    window.addEventListener('dragover', preventNativeDefault, false);
    window.addEventListener('drop', preventNativeDefault, false);

    // Auto-update theme if set to system and the native theme changes
    // function updateTheme(_event: IpcRendererEvent, theme: unknown) {
    //   SettingsAPI.applyThemeToUI(theme as Theme);
    // }

    // ipcRenderer.on(channels.THEME_APPLY, updateTheme);

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

      // ipcRenderer.removeAllListeners(channels.THEME_APPLY);

      navigator.mediaDevices.removeEventListener('devicechange', updateOutputDevice);
    };
  }, []);

  return null;
}

export default AppEvents;
