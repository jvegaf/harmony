import React from 'react';
import { Track, TrackId } from 'shared/types/emusik';
import type { PlayerContextType } from '../@types/emusik';

const PlayerContext = React.createContext({} as PlayerContextType);

export function PlayerContextProvider({ children }: { children: React.ReactNode }) {
  const [trackPlaying, setTrackPlaying] = React.useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playingId, setPlayingId] = React.useState<TrackId | null>(null);

  return (
    <PlayerContext.Provider
      value={{
        trackPlaying,
        setTrackPlaying,
        isPlaying,
        setIsPlaying,
        playingId,
        setPlayingId,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export default PlayerContext;