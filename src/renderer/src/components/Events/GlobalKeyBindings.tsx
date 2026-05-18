import { useCallback } from 'react';
import Keybinding from 'react-keybinding-component';
import { useNavigate, useRouteLoaderData } from 'react-router-dom';

import { parseKeyEvent } from '../../lib/utils-keyboard';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import type { RootLoaderData } from '../../views/Root';

/**
 * Handle app-level IPC Navigation events
 */
function GlobalKeyBindings() {
  const navigate = useNavigate();
  const playerAPI = usePlayerAPI();
  const { appConfig } = useRouteLoaderData('root') as RootLoaderData;

  // We need to handle cases where appConfig might not be fully loaded or missing shortcuts
  const globalShortcuts = appConfig?.shortcuts?.global;

  // App shortcuts (not using Electron's global shortcuts API to avoid conflicts
  // with other applications)
  const onKey = useCallback(
    async (e: KeyboardEvent) => {
      if (!globalShortcuts) return;

      const keyStr = parseKeyEvent(e);

      // Map dynamic shortcut strings to actions
      switch (keyStr) {
        case globalShortcuts.playPause:
          e.preventDefault();
          e.stopPropagation();
          playerAPI.togglePlayPause();
          break;
        case globalShortcuts.openSettings:
          e.preventDefault();
          e.stopPropagation();
          navigate('/settings');
          break;
        case globalShortcuts.focusSearch: {
          e.preventDefault();
          e.stopPropagation();
          const searchInput = document.querySelector<HTMLInputElement>('[data-search-input="true"]');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          break;
        }
        case globalShortcuts.seekBackward:
          e.preventDefault();
          e.stopPropagation();
          playerAPI.jumpTo(-10);
          break;
        case globalShortcuts.seekForward:
          e.preventDefault();
          e.stopPropagation();
          playerAPI.jumpTo(10);
          break;
        case globalShortcuts.previousTrack:
          e.preventDefault();
          e.stopPropagation();
          playerAPI.previous();
          break;
        case globalShortcuts.nextTrack:
          e.preventDefault();
          e.stopPropagation();
          playerAPI.next();
          break;
        default:
          break;
      }
    },
    [navigate, playerAPI, globalShortcuts],
  );

  return (
    <Keybinding
      onKey={onKey}
      preventInputConflict
    />
  );
}

export default GlobalKeyBindings;
