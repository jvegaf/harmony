/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PlayerView from './PlayerView';
import PauseButton from './PauseButton';
import PlayButton from './PlayButton';
import useAppState from '../hooks/useAppState';

function AppHeader() {
  const { collection, isPlaying, togglePlayPause, audioplayer, onFixAllTracks, onOpenFolder } = useAppState();

  const btnProps = {
    color: 'white',
    size: 40,
    action: togglePlayPause
  };

  const [playerBtn, setPlayerBtn] = React.useState(<PauseButton {...btnProps} />);

  React.useEffect(() => {
    if (isPlaying) setPlayerBtn(<PlayButton {...btnProps} />);
    return () => {
      setPlayerBtn(<PauseButton {...btnProps} />);
    };
  }, [isPlaying]);

  const playerViewProps = { player: audioplayer, isPlaying };

  return (
    <div className="h-20 bg-neutral-700 grid grid-rows-1 grid-cols-5">
      <div className="flex justify-center items-center">{playerBtn}</div>
      <div className="flex justify-center items-center col-span-3">
        <PlayerView {...playerViewProps} />
      </div>
      <div className="mr-8 flex justify-around items-center">
        {collection.length > 0 && (
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
