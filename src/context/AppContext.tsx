/* eslint-disable react/jsx-no-constructed-context-values */
import React, { useState } from 'react';
import { Track } from '../../electron/types/emusik';
import { AppContextType } from '../@types/emusik.d';
import AudioPlayer from '../lib/audioplayer';

const AppContext = React.createContext({} as AppContextType);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [collection, setCollection] = useState<Track[]>([]);
  const [trackDetail, setTrackDetail] = useState<Track>();
  const audioplayer = new AudioPlayer();

  return (
    <AppContext.Provider
      value={{
        collection,
        setCollection,
        trackDetail,
        setTrackDetail,
        audioplayer
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
