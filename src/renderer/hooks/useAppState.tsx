import React from 'react';
import AppContext from 'renderer/context/AppContext';
import { MenuCommand, Track } from 'shared/types/emusik';

export default function useAppState() {
  const { tracks, setTracks, trackPlaying, setTrackPlaying, trackDetail, setTrackDetail } =
    React.useContext(AppContext);

  const { ipcRenderer } = window.electron;

  const openFolder = React.useCallback(() => ipcRenderer.openFolder(), [ipcRenderer]);
  const fixTracks = React.useCallback((trks: Track[]) => ipcRenderer.fixTracks(trks), [ipcRenderer]);

  const fixTrack = React.useCallback(
    (id: string) => {
      const track = tracks.find(t => t.id === id);
      fixTracks([track]);
    },
    [fixTracks, tracks]
  );

  const addTracks = React.useCallback(
    (newTracks: React.SetStateAction<Track[]>) => {
      setTracks(newTracks);
    },
    [setTracks]
  );

  const updateTrack = React.useCallback(
    (track: Track) => {
      const index = tracks.findIndex(t => t.id === track.id);
      tracks[index] = track;
      setTracks([...tracks]);
      if (trackDetail && trackDetail.id === track.id) {
        setTrackDetail(null);
      }
    },
    [tracks, setTracks, trackDetail, setTrackDetail]
  );

  const showCtxMenu = React.useCallback((trackId: string) => ipcRenderer.showContextMenu(trackId), [ipcRenderer]);

  const fixAllTracks = () => fixTracks(tracks);
  ipcRenderer.on('add-tracks', (newTracks: Track[]) => {
    addTracks(newTracks);
  });

  ipcRenderer.on('track-fixed', track => updateTrack(track));

  ipcRenderer.on('tracks-fixed', (fixedTracks: Track[]) => {
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

  ipcRenderer.on('play-command', (trackId: string) => {
    setTrackPlaying(tracks.find(t => t.id === trackId));
  });

  ipcRenderer.on('fix-track-command', (trackId: string) => {
    fixTrack(trackId);
  });

  ipcRenderer.on('view-detail-command', (trackId: string) => {
    setTrackDetail(tracks.find(t => t.id === trackId));
  });

  return {
    tracks,
    trackPlaying,
    setTrackPlaying,
    trackDetail,
    setTrackDetail,
    addTracks,
    fixTrack,
    updateTrack,
    openFolder,
    showCtxMenu,
    fixAllTracks,
  };
}
