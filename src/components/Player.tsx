/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import { Track } from '../../electron/types/emusik';

interface PlayerViewProps {
        track: Track;
}

const PlayerView: React.FC<PlayerViewProps> = ({ track }) => {
        const [barWidth, setBarWidth] = React.useState('0%');

        const seekBarElem = React.useRef<HTMLDivElement>(null);

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

export default PlayerView;
