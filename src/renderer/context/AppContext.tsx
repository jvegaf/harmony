/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useState } from 'react';
import { AppContextType } from 'renderer/@types/emusik';
import { Track, TrackId } from 'shared/types/emusik';

const AppContext = React.createContext({} as AppContextType);

// eslint-disable-next-line react/prop-types
export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackPlaying, setTrackPlaying] = useState<TrackId | undefined>(undefined);
  const [trackDetail, setTrackDetail] = useState<TrackId | undefined>(undefined);

  return (
    <AppContext.Provider
      value={{
        tracks,
        setTracks,
        trackPlaying,
        setTrackPlaying,
        trackDetail,
        setTrackDetail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
