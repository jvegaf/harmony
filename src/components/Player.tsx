/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import { useAudioPlayer, useAudioPosition } from 'react-use-audio-player';
import { Track } from '../../electron/types/emusik';

interface PlayerProps {
    track: Track;
}

const Player: React.FC<PlayerProps> = ({ track }) => {
    const audioPlayer = useAudioPlayer({
        src: track?.filepath,
        format: 'mp3',
        autoplay: true
    });

    const { duration, seek, percentComplete } = useAudioPosition({
        highRefreshRate: true
    });
    const [barWidth, setBarWidth] = React.useState('0%');

    const seekBarElem = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!audioPlayer.player) return;
        if (track.filepath !== audioPlayer.player.src) {
            audioPlayer.load({
                src: track.filepath,
                format: 'mp3',
                autoplay: true
            });
        }
    }, [audioPlayer, track.filepath]);

    React.useEffect(() => {
        setBarWidth(`${percentComplete}%`);
    }, [percentComplete]);

    const goTo = React.useCallback(
        (event: React.MouseEvent) => {
            const { pageX: eventOffsetX } = event;

            if (seekBarElem.current) {
                const elementOffsetX = seekBarElem.current.offsetLeft;
                const elementWidth = seekBarElem.current.clientWidth;
                const percent = (eventOffsetX - elementOffsetX) / elementWidth;
                seek(percent * duration);
            }
        },
        [duration, seek]
    );

    return (
        <div className="w-80 flex flex-col items-stretch justify-between bg-neutral-400">
            <div className="pt-1">{track.title}</div>
            <div className="pt-1">{track.artist}</div>
            <div className="w-full h-2 cursor-pointer bg-white overflow-hidden" ref={seekBarElem} onClick={goTo}>
                <div style={{ width: barWidth }} className="bg-blue-500 h-full" />
            </div>
        </div>
    );
};

export default Player;
