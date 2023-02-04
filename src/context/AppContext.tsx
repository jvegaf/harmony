/* eslint-disable react/jsx-no-constructed-context-values */
import React, { useState } from 'react';
import { Track } from '../../electron/types/emusik';
import { AppContextType } from '../@types/emusik.d';
import AudioPlayer from '../lib/audioplayer';

export const AppContext = React.createContext<AppContextType | null>(null);

const AppContextProvider = ({ children }) => {
  const [tracksCollection, setTracksCollection] = useState<Track[]>([]);
  const player = new AudioPlayer();
  const [trackDetail, setTrackDetail] = useState<Track | null>(null);

  const addTrack = (track: Track) => setTracksCollection([...tracksCollection, track]);

  const updateTrack = (track: Track) => {
    const ntracks = tracksCollection.filter((t) => t.id !== track.id);
    setTracksCollection([...ntracks, track]);
  };

  const setNewTrackDetail = (track: Track | null) => setTrackDetail(track);

  return (
    <AppContext.Provider
      value={{
        tracksCollection,
        addTrack,
        updateTrack,
        trackDetail,
        setNewTrackDetail,
        player
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
