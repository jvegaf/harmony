/* eslint-disable react/jsx-no-constructed-context-values */
import React, { useState } from 'react';
import { Track } from '../../electron/types/emusik';
import { AppContextType } from '../@types/emusik.d';
import AudioPlayer from '../lib/audioplayer';

export const AppContext = React.createContext<AppContextType | null>(null);

const AppContextProvider = ({ children }) => {
  const [tracksCollection, setTracksCollection] = useState<Track[]>([]);
  const audioplayer = new AudioPlayer();
  const [trackDetail, setTrackDetail] = useState<Track | null>(null);

  const setNewCollection = (col: Track[]) => setTracksCollection(col);

  const setNewTrackDetail = (track: Track | null) => setTrackDetail(track);

  return (
    <AppContext.Provider
      value={{
        tracksCollection,
        setNewCollection,
        trackDetail,
        setNewTrackDetail,
        audioplayer
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
