import React, { useState } from 'react';
import { Track, TrackId } from '../../electron/types/emusik';
import { AppContextType } from '../@types/emusik';

const AppContext = React.createContext({} as AppContextType);

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
