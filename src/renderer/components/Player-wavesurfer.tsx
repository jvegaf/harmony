/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
// @ts-nocheck

import ReactWaves from '@dschoon/react-waves';
import { createStyles } from '@mantine/core';
import React from 'react';
import useAppState from '../hooks/useAppState';

const useStyles = createStyles(theme => ({
  container: {
    width: '100%',
    height: 70,
  },
}));

const Player = () => {
  const { classes } = useStyles();
  const { trackPlaying } = useAppState();
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);

  const [trackSrc, setTrackSrc] = React.useState();

  React.useEffect(() => {
    if (trackPlaying !== null) {
      const track = window.Main.GetTrack(trackPlaying);
      setPlaying(false);
      setTrackSrc(track.filepath);
    }
  }, [trackPlaying]);

  const onPosChange = ws => {
    if (ws.pos !== position) {
      setPosition(ws.pos);
    }
  };

  const onSeek = ws => {
    log.info('seek', ws);
  };

  const onReady = ws => {
    log.info('ready', ws);
    setPosition(0);
    setPlaying(true);
  };

  return (
    <div className={classes.container}>
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
          waveColor: '#D1D6DA',
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
