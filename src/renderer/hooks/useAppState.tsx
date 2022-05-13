import React from 'react';
import AppContext from 'renderer/context/AppContext';
import { MenuCommand } from 'shared/types/emusik';



export default function useAppState() {
  const { tracks, addTracks, trackPlaying, setTrackPlaying, selectedTrack, setSelectedTrack } =
    React.useContext(AppContext);

  const openFolder = () => window.electron.ipcRenderer.openFolder();

  const playTrack = (t: Track) => setTrackPlaying(t);

  const stopPlayer = () => setTrackPlaying(null);

  const showCtxMenu = () => {
    window.electron.ipcRenderer.showContextMenu();
  };

  // calling IPC exposed from preload script
window.electron.ipcRenderer.on('add-tracks', (newTracks: Track[]) => {
  addTracks(newTracks);
});

window.electron.ipcRenderer.on('context-menu-command', (command: MenuCommand) => {

  switch (command) {
    case MenuCommand.PLAY_TRACK:
      console.log('want play track');
      break;
    case MenuCommand.FIX_TAGS:
      console.log('want fix-tags');
      break;

    default:
      break;
  }
});

  return {
    tracks,
    trackPlaying,
    selectedTrack,
    openFolder,
    addTracks,
    playTrack,
    stopPlayer,
    showCtxMenu
  };
}
