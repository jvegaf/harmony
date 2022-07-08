/* eslint-disable react/jsx-no-constructed-context-values */
import React, { useState } from 'react';
import { TrackId } from '../../electron/types/emusik';
import { AppContextType } from '../@types/emusik';

const AppContext = React.createContext({} as AppContextType);

// eslint-disable-next-line react/prop-types
export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [trackPlaying, setTrackPlaying] = useState<TrackId | null>(null);
  const [trackDetail, setTrackDetail] = useState<TrackId | null>(null);

  return (
    <AppContext.Provider
      value={{
        trackPlaying,
        setTrackPlaying,
        trackDetail,
        setTrackDetail
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
