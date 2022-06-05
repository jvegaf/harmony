import React from 'react';
import AppContext from 'renderer/context/AppContext';
import { MenuCommand, Track } from 'shared/types/emusik';

export default function useAppState() {
  const { tracks, setTracks, trackPlaying, setTrackPlaying, trackDetail, setTrackDetail } =
    React.useContext(AppContext);

  const openFolder = () => window.electron.ipcRenderer.openFolder();

  const addTracks = (newTracks: React.SetStateAction<Track[]>) => setTracks(newTracks);

  const updateTrack = (track: Track) => {
    const index = tracks.findIndex(t => t.id === track.id);
    tracks[index] = track;
    setTracks([...tracks]);
  };

  const fixTrackTags = (track: Track) => {
    window.electron.ipcRenderer.fixTags(track);
  };

  const showCtxMenu = (t: Track) => {
    window.electron.ipcRenderer.showContextMenu(t);
  };

  const fixAllTracks = () => {
    tracks.forEach(t => fixTrackTags(t));
  };

  // calling IPC exposed from preload script
  window.electron.ipcRenderer.on('add-tracks', (newTracks: Track[]) => {
    addTracks(newTracks);
  });

  window.electron.ipcRenderer.on('context-menu-command', (command: MenuCommand, track: Track) => {
    switch (command) {
      case MenuCommand.PLAY_TRACK:
        setTrackPlaying(track);
        break;

      case MenuCommand.FIX_TAGS:
        updateTrack(track);
        break;

      case MenuCommand.VIEW_DETAIL:
        setTrackDetail(track);
        break;

      default:
        break;
    }
  });

  return {
    tracks,
    trackPlaying,
    setTrackPlaying,
    trackDetail,
    setTrackDetail,
    openFolder,
    showCtxMenu,
    fixAllTracks,
  };
}
