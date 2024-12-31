import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import channels from '../../../../preload/lib/ipc-channels';

const { ipcRenderer } = window.ElectronAPI;

/**
 * Handle app-level IPC Navigation events
 */
function IPCNavigationEvents() {
  const navigate = useNavigate();

  useEffect(() => {
    function goToLibrary() {
      navigate('/');
    }

    function goToPlaylists() {
      navigate('/');
    }

    function goToSettings() {
      navigate('/settings');
    }

    function goToTrackDetail(trackID: string) {
      navigate(`/details/${trackID}`);
    }

    // Shortcuts from the application menu
    ipcRenderer.on(channels.MENU_GO_TO_LIBRARY, goToLibrary);
    ipcRenderer.on(channels.MENU_GO_TO_PLAYLISTS, goToPlaylists);
    ipcRenderer.on(channels.MENU_GO_TO_SETTINGS, goToSettings);
    ipcRenderer.on(channels.CMD_TRACK_DETAIL, (_, trackID) => goToTrackDetail(trackID));

    return function cleanup() {
      ipcRenderer.removeAllListeners(channels.MENU_GO_TO_LIBRARY);
      ipcRenderer.removeAllListeners(channels.MENU_GO_TO_PLAYLISTS);
      ipcRenderer.removeAllListeners(channels.MENU_GO_TO_SETTINGS);
      ipcRenderer.removeAllListeners(channels.CMD_TRACK_DETAIL);
    };
  }, [navigate]);

  return null;
}

export default IPCNavigationEvents;
