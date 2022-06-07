/* eslint-disable react/jsx-props-no-spreading */
import { Button, createStyles, Header } from '@mantine/core';
import React from 'react';
import { useAudioPlayer } from 'react-use-audio-player';
import useAppState from 'renderer/hooks/useAppState';
import Player from './Player';
import PauseButton from './PauseButton';
import PlayButton from './PlayButton';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStyles = createStyles(theme => ({
  header: {
    backgroundColor: '#222222',
    borderBottom: 0,
    width: '100%',
    height: 70,
    display: 'grid',
    gridTemplateColumns: '1fr 3fr 1fr',
    gridTemplateRows: '1fr',
    gridTemplateAreas: `. . .`,
    rowGap: 0,
  },
  playerContainer: {
    gridColumn: 2,
    display: 'flex',
    justifyContent: 'center',
  },
  leftContainer: {
    gridColumn: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightContainer: {
    gridColumn: 3,
    marginRight: 30,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}));

const AppHeader: React.FC = () => {
  const { classes } = useStyles();

  const { tracks, trackPlaying, onFixAllTracks } = useAppState();

  const { playing, togglePlayPause } = useAudioPlayer();

  const fixAllHandler = () => onFixAllTracks();

  const btnProps = {
    color: 'white',
    size: 40,
    action: togglePlayPause,
  };

  return (
    <Header height={70} className={classes.header}>
      <div className={classes.leftContainer}>
        {playing ? <PauseButton {...btnProps} /> : <PlayButton {...btnProps} />}
      </div>
      <div className={classes.playerContainer}>{trackPlaying && <Player track={trackPlaying} />}</div>
      <div className={classes.rightContainer}>
        {tracks.length && (
          <Button onClick={fixAllHandler} size="sm">
            Fix All tracks
          </Button>
        )}
      </div>
    </Header>
  );
};

export default AppHeader;
