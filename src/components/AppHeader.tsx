/* eslint-disable react/jsx-props-no-spreading */
import React, { useContext } from 'react';
import PlayerView from './PlayerView';
import PlayButton from './PlayButton';
import useAppState from '../hooks/useAppState';
import { LibraryContext } from '../context/LibraryContext';
import { LibraryContextType } from '../@types/library';

function AppHeader() {
  const { togglePlayPause, player, onFixAllTracks, onOpenFolder } = useAppState();
  const { tracksCollection } = useContext(LibraryContext) as LibraryContextType;

  const btnProps = {
    color: 'white',
    size: 40,
    action: togglePlayPause
  };

  return (
    <div className="h-20 bg-neutral-700 grid grid-rows-1 grid-cols-5">
      <div className="flex justify-center items-center">
        <PlayButton {...btnProps} />
      </div>
      <div className="flex justify-center items-center col-span-3">
        <PlayerView />
      </div>
      <div className="mr-8 flex justify-around items-center">
        {tracksCollection.length && (
          <>
            <button
              onClick={() => onOpenFolder()}
              className="bg-blue-500 rounded py-2 px-4 mr-10 focus:outline-none shadow hover:bg-blue-200"
            >
              Open Folder
            </button>
            <button
              onClick={() => onFixAllTracks()}
              className="bg-blue-500 rounded py-2 px-4 mr-10 focus:outline-none shadow hover:bg-blue-200"
            >
              Fix all
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AppHeader;
