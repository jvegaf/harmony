import React from 'react';
import { createStyles, Slider, Text } from '@mantine/core';
import { useAudioPlayer, useAudioPosition } from 'react-use-audio-player';
import { Track } from '../../shared/types/emusik';

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

interface PlayerProps {
  track: Track;
}

const Player: React.FC<PlayerProps> = ({ track }) => {
  const { title, artist, filepath } = track;
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

  const { ready, loading, error } = useAudioPlayer({
    src: filepath,
    // forcing html5 is required for some features like streaming audio
    html5: true,
    // format must be specified when streaming audio
    format: ['mp3'],
    autoPlay: true
  });

  if (!ready && !loading) return <div>No audio to play</div>;

  if (loading) return <div>Loading audio</div>;

  return (
    <div className={classes.player}>
      <Text size="lg" align="center">
        {title}
      </Text>
      <Text size="md" align="center">
        {artist}
      </Text>
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
