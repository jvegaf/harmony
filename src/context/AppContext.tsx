/* eslint-disable react/jsx-no-constructed-context-values */
import React, { useState } from 'react';
import { Track, TrackId } from '../../electron/types/emusik';
// eslint-disable-next-line import/no-unresolved
import { AppContextType } from '../@types/emusik';

const AppContext = React.createContext({} as AppContextType);

// eslint-disable-next-line react/prop-types
export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackPlaying, setTrackPlaying] = useState<TrackId>(null);
  const [trackDetail, setTrackDetail] = useState<TrackId>(null);

  return (
    <AppContext.Provider
      value={{
        tracks,
        setTracks,
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
