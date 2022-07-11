/* eslint-disable react/jsx-no-constructed-context-values */
import React, { useState } from 'react';
import { AppContextType } from '../@types/emusik';

const AppContext = React.createContext({} as AppContextType);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [trackPlaying, setTrackPlaying] = useState<TrackId | null>(null);
  const [trackDetail, setTrackDetail] = useState<TrackId | null>(null);
  const [tracksLoaded, setTracksLoaded] = useState(false);

  return (
    <AppContext.Provider
      value={{
        trackPlaying,
        setTrackPlaying,
        trackDetail,
        setTrackDetail,
        tracksLoaded,
        setTracksLoaded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
