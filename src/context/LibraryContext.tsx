/* eslint-disable react/jsx-no-constructed-context-values */
import React, { useState } from 'react';
import { Track } from '../../electron/types/emusik';
import { LibraryContextType } from '../@types/library';

export const LibraryContext = React.createContext<LibraryContextType | null>(null);

const LibraryProvider = ({ children }) => {
  const [tracksCollection, setTracksCollection] = useState<Track[]>([]);

  const addTracks = (tracks: Track[]) => {
    setTracksCollection([...tracks]);
  };

  const updateTrack = (track: Track) => {
    const updated = tracksCollection.filter((t) => t.id !== track.id);
    setTracksCollection([...updated, track]);
  };

  return (
    <LibraryContext.Provider
      value={{
        tracksCollection,
        addTracks,
        updateTrack
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export default LibraryProvider;
