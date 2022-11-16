/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { useAudioPlayer } from 'react-use-audio-player';
import Player from './Player';
import PauseButton from './PauseButton';
import PlayButton from './PlayButton';
import useAppState from '../hooks/useAppState';
import { Track } from '../../electron/types/emusik';

function AppHeader() {
        const { tracks, trackPlaying, onFixAllTracks, onOpenFolder } = useAppState();

        const { playing, togglePlayPause } = useAudioPlayer();
        const [playTrack, setPlayTrack] = React.useState<Track>();

        React.useEffect(() => {
                if (trackPlaying) {
                        const t = tracks.find((tr) => tr.id === trackPlaying);
                        console.log(t);
                        setPlayTrack(t);
                }
        }, [trackPlaying]);

        const btnProps = {
                color: 'white',
                size: 40,
                action: togglePlayPause
        };

        return (
                <div className="h-20 bg-neutral-700 grid grid-rows-1 grid-cols-5">
                        <div className="flex justify-center items-center">
                                {playing ? <PauseButton {...btnProps} /> : <PlayButton {...btnProps} />}
                        </div>
                        <div className="flex justify-center items-center col-span-3">
                                {playTrack && <Player track={playTrack as Track} />}
                        </div>
                        <div className="mr-8 flex justify-around items-center">
                                {tracks.length > 0 && (
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
