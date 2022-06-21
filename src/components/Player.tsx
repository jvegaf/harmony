/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
// @ts-nocheck

import ReactWaves from '@dschoon/react-waves';
import React from 'react';
import useAppState from '../hooks/useAppState';

const Player = () => {
  const { trackPlaying } = useAppState();
  const [wavesurfer, setWavesurfer] = React.useState(null);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);

  const [trackSrc, setTrackSrc] = React.useState();

  React.useEffect(() => {
    if (trackPlaying !== null) {
      setPlaying(false);
      setTrackSrc(trackPlaying.filepath);
    }
  }, [trackPlaying]);

  const onPosChange = ({ pos, ws }) => {
    if (pos !== position) {
      setPosition(pos);
      setWavesurfer(ws);
    }
  };

  const onSeek = (ws) => {
    console.log('seek', ws);
  };

  const onReady = (ws) => {
    console.log('ready', ws);
    setPosition(0);
    setPlaying(true);
  };

  return (
    <div className="container">
      {trackSrc && (
        <div
          className="play button"
          onClick={() => {
            setPlaying(!playing);
          }}
          style={{ left: '-99px' }}
        >
          {!playing ? '▶️' : '⏹'}
        </div>
      )}
      <ReactWaves
        audioFile={trackSrc}
        className="react-waves"
        options={{
          barHeight: 1,
          barWidth: 2,
          cursorWidth: 0,
          barGap: 0,
          height: 80,
          hideScrollbar: true,
          progressColor: '#EC407A',
          responsive: true,
          waveColor: '#D1D6DA'
        }}
        volume={1}
        zoom={1}
        playing={playing}
        pos={position}
        onPosChange={onPosChange}
        onSeek={onSeek}
        onReady={onReady}
      />
    </div>
  );
};

export default Player;
