import React from 'react';
import type { PlayerContextType } from '../@types/emusik';

const PlayerContext = React.createContext({} as PlayerContextType);

export function PlayerContextProvider({ children }: {
  children: React.ReactNode;
}){
  const [ trackPlaying, setTrackPlaying ] = React.useState<Track>(null);
  const [ isPlaying, setIsPlaying ]       = React.useState<boolean>(false);
  const [ playingId, setPlayingId ]       = React.useState<TrackId>(null);

  return (
    <PlayerContext.Provider
      value={{
        trackPlaying,
        setTrackPlaying,
        isPlaying,
        setIsPlaying,
        playingId,
        setPlayingId
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export default PlayerContext;
