import React from 'react';
import AppContext from 'renderer/context/AppContext';
import { MenuCommand, Track } from 'shared/types/emusik';

export default function useAppState() {
  const { tracks, setTracks, trackPlaying, setTrackPlaying, trackDetail, setTrackDetail } =
    React.useContext(AppContext);

  const openFolder = () => window.electron.ipcRenderer.openFolder();

  const fixTracks = (trks: Track[]) => window.electron.ipcRenderer.fixTracks(trks);

  const addTracks = (newTracks: React.SetStateAction<Track[]>) => setTracks(newTracks);

  const updateTrack = (track: Track) => {
    const index = tracks.findIndex(t => t.id === track.id);
    tracks[index] = track;
    setTracks([...tracks]);
    if (trackDetail && trackDetail.id === track.id) {
      setTrackDetail(null);
    }
  };

  const showCtxMenu = (track: Track) => {
    window.electron.ipcRenderer.showContextMenu(t);
  };

  const fixAllTracks = () => fixTracks(tracks);

  // calling IPC exposed from preload script
  window.electron.ipcRenderer.on('add-tracks', (newTracks: Track[]) => {
    addTracks(newTracks);
  });

  window.electron.ipcRenderer.on('tracks-fixed', (fixedTracks: Track[]) => {
    // eslint-disable-next-line no-console
    console.log(`fixed ${fixedTracks.length} tracks`);
    const newTracks = tracks.map(t => {
      const fixedTrack = fixedTracks.find(ft => ft.id === t.id);
      if (fixedTrack) {
        return fixedTrack;
      }
      return t;
    });
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
    updateTrack,
    openFolder,
    showCtxMenu,
    fixAllTracks,
  };
}
