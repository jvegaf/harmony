import { useCallback } from 'react';
import Keybinding from 'react-keybinding-component';
import { useNavigate } from 'react-router-dom';

import { usePlayerAPI } from '../../stores/usePlayerStore';
import { isCtrlKey } from '../../lib/utils-events';
import player from '../../lib/player';

/**
 * Handle app-level IPC Navigation events
 */
function GlobalKeyBindings() {
  const navigate = useNavigate();
  const playerAPI = usePlayerAPI();

  // App shortcuts (not using Electron's global shortcuts API to avoid conflicts
  // with other applications)
  const onKey = useCallback(
    async (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          e.stopPropagation();
          playerAPI.togglePlayPause();
          break;
        case ',':
          if (isCtrlKey(e)) {
            e.preventDefault();
            e.stopPropagation();
            navigate('/settings');
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          playerAPI.jumpTo(player.getCurrentTime() - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          playerAPI.jumpTo(player.getCurrentTime() + 10);
          break;
        case 's':
          e.preventDefault();
          e.stopPropagation();
          playerAPI.jumpTo(player.getCurrentTime() - 10);
          break;
        case 'w':
          e.preventDefault();
          e.stopPropagation();
          playerAPI.jumpTo(player.getCurrentTime() + 10);
          break;
        case 'a':
          e.preventDefault();
          e.stopPropagation();
          playerAPI.previous();
          break;
        case 'd':
          e.preventDefault();
          e.stopPropagation();
          playerAPI.next();
          break;
        default:
          break;
      }
    },
    [navigate, playerAPI],
  );

  return (
    <Keybinding
      onKey={onKey}
      preventInputConflict
    />
  );
}

export default GlobalKeyBindings;
