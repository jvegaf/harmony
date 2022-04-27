import React from 'react';
import AppContext from 'renderer/context/AppContext';

export default function useAppState() {
  const { tracks, addTracks } = React.useContext(AppContext);

  const openFolder = () => window.electron.ipcRenderer.openFolder();

  return {
    tracks,
    openFolder,
    addTracks,
  };
}
