/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import useAppState from '../hooks/useAppState';
import Player from './Player';

function AppHeader() {
  const { onFixAllTracks, onOpenFolder } = useAppState();

  const [haveTracks, setHaveTracks] = React.useState(false);

  React.useEffect(() => {
    if (window.Main) {
      window.Main.on('tracks-updated', () => setHaveTracks(true));

      window.Main.on('tracks-cleaned', () => setHaveTracks(false));
    }
  }, []);

  return (
    <div className="h-20 bg-neutral-700 grid grid-rows-1 grid-cols-5">
      <div className="flex justify-center items-center">
        {haveTracks && (
          <button
            onClick={() => onFixAllTracks()}
            className="bg-blue-500 rounded py-2 px-4 mr-10 focus:outline-none shadow hover:bg-blue-200"
          >
            Fix all
          </button>
        )}
      </div>
      <div className="flex justify-center items-center col-span-3">
        <Player />
      </div>
      <div className="mr-8 flex justify-around items-center">
        {haveTracks && (
          <button
            onClick={() => onOpenFolder()}
            className="bg-blue-500 rounded py-2 px-4 mr-10 focus:outline-none shadow hover:bg-blue-200"
          >
            Open Folder
          </button>
        )}
      </div>
    </div>
  );
}

export default AppHeader;
