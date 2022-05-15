/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import { createStyles, Text } from '@mantine/core';
import { useAudioPlayer, useAudioPosition } from 'react-use-audio-player';
import { Track } from '../../shared/types/emusik';

const useStyles = createStyles((theme) => ({
  player: {
    width: 300,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'strech',
    justifyContent: 'space-between',
    backgroundColor:
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.white,
  },
  seekbar: {
    width: '100%',
    height: 10,
    cursor: 'pointer',
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  tick: {
    backgroundColor: '#a1d0d1',
    height: '100%',
  },
  title: {
    paddingTop: 5,
  },
}));

interface PlayerProps {
  track: Track;
}

const Player: React.FC<PlayerProps> = ({ track }) => {
  const { title, artist, filepath } = track;
  const { classes } = useStyles();

  const player = useAudioPlayer({
    src: filepath,
    format: 'mp3',
    autoplay: true,
  });

  const { duration, seek, percentComplete } = useAudioPosition({
    highRefreshRate: true,
  });
  const [barWidth, setBarWidth] = React.useState('0%');

  const seekBarElem = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (filepath !== player.src) {
      player.load({
        src: filepath,
        format: 'mp3',
        autoplay: true,
      });
    }
  }, [filepath, player]);

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
    <div className={classes.player}>
      <Text className={classes.title} size="lg" align="center">
        {title}
      </Text>
      <Text size="sm" align="center">
        {artist}
      </Text>
      <div className={classes.seekbar} ref={seekBarElem} onClick={goTo}>
        <div style={{ width: barWidth }} className={classes.tick} />
      </div>
    </div>
  );
};

export default Player;
