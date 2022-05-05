import React from 'react';
import AppContext from 'renderer/context/AppContext';

export default function useAppState() {
  const {
    tracks,
    addTracks,
    trackPlaying,
    setTrackPlaying,
    selectedTrack,
    setSelectedTrack,
  } = React.useContext(AppContext);

  const openFolder = () => window.electron.ipcRenderer.openFolder();

  const playTrack = (t: Track) => setTrackPlaying(t);

  const stopPlayer = () => setTrackPlaying(null);

  const showCtxMenu = () => {
    window.electron.ipcRenderer.showContextMenu();
  };

  return {
    tracks,
    trackPlaying,
    selectedTrack,
    openFolder,
    addTracks,
    playTrack,
    stopPlayer,
    showCtxMenu,
  };
}
