import React from 'react';
import { createStyles, Slider } from '@mantine/core';
import { useAudioPosition } from 'react-use-audio-player';

const useStyles = createStyles((theme) => ({
  player: {
    width: 300,
    height: 70,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'strech',
    justifyContent: 'flex-end',
    backgroundColor:
      theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.white,
  },
}));

const Player: React.FC = () => {
  const { classes } = useStyles();
  const { percentComplete, duration, seek } = useAudioPosition({
    highRefreshRate: true,
  });

  const goToPosition = React.useCallback(
    (percentage) => {
      seek(duration * percentage);
    },
    [duration, seek]
  );

  return (
    <div className={classes.player}>
      <Slider
        value={percentComplete}
        min={0}
        max={100}
        defaultValue={0}
        onChangeEnd={goToPosition}
      />
    </div>
  );
};

export default Player;
