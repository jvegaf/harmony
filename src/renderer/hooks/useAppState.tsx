import React from 'react';
import AppContext from 'renderer/context/AppContext';
import { MenuCommand, Track } from 'shared/types/emusik';



export default function useAppState() {
  const [selected, setSelected] = React.useState<Track>(undefined);
  const { tracks, setTracks, trackPlaying, setTrackPlaying } =
    React.useContext(AppContext);

  const openFolder = () => window.electron.ipcRenderer.openFolder();

  const playTrack = (t: Track) => setTrackPlaying(t);

  const stopPlayer = () => setTrackPlaying(undefined);

  const addTracks = (newTracks: React.SetStateAction<Track[]>) => setTracks(newTracks);

  const showCtxMenu = (t: Track) => {
    setSelected(t);
    window.electron.ipcRenderer.showContextMenu();
  };

  // calling IPC exposed from preload script
window.electron.ipcRenderer.on('add-tracks', (newTracks: Track[]) => {
  addTracks(newTracks);
});

window.electron.ipcRenderer.on('context-menu-command', (command: MenuCommand) => {

  switch (command) {
    case MenuCommand.PLAY_TRACK:
      setTrackPlaying(selected);
      break;
    case MenuCommand.FIX_TAGS:
      console.log('FIX_TAGS');
      break;

    default:
      break;
  }
});

  return {
    tracks,
    trackPlaying,
    selected,
    openFolder,
    addTracks,
    playTrack,
    stopPlayer,
    showCtxMenu
  };
}
