import React, { useState } from 'react';
import { AppContextType } from 'renderer/@types/emusik';
import { Track } from 'shared/types/emusik';

const AppContext = React.createContext({} as AppContextType);

// eslint-disable-next-line react/prop-types
export function AppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tracks, setTracks] = useState<Array<Track>>([]);
  const [trackPlaying, setTrackPlaying] = useState<Track>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>('');

  const addTracks = (newTracks: React.SetStateAction<Track[]>) =>
    setTracks(newTracks);

  return (
    <AppContext.Provider
      value={{
        tracks,
        trackPlaying,
        selectedTrack,
        addTracks,
        setTrackPlaying,
        setSelectedTrack,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
