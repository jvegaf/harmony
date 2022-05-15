import React from 'react';
import AppContext from 'renderer/context/AppContext';
import { MenuCommand, Track } from 'shared/types/emusik';

export default function useAppState() {
  const { tracks, setTracks, trackPlaying, setTrackPlaying } =
    React.useContext(AppContext);

  const openFolder = () => window.electron.ipcRenderer.openFolder();

  const addTracks = (newTracks: React.SetStateAction<Track[]>) =>
    setTracks(newTracks);

  const showCtxMenu = (t: Track) => {
    window.electron.ipcRenderer.showContextMenu(t.id);
  };

  // calling IPC exposed from preload script
  window.electron.ipcRenderer.on('add-tracks', (newTracks: Track[]) => {
    addTracks(newTracks);
  });

  window.electron.ipcRenderer.on(
    'context-menu-command',
    (command: MenuCommand, trackId: string) => {
      switch (command) {
        case MenuCommand.PLAY_TRACK:
          setTrackPlaying(tracks.find((t) => t.id === trackId));
          break;
        case MenuCommand.FIX_TAGS:
          console.log('FIX_TAGS');
          break;

        default:
          break;
      }
    }
  );

  return {
    tracks,
    trackPlaying,
    openFolder,
    showCtxMenu,
  };
}
