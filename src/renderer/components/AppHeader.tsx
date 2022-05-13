import { Button, createStyles, Header } from '@mantine/core';
import React from 'react';
import useAppState from 'renderer/hooks/useAppState';
import Player from './Player';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStyles = createStyles((theme) => ({
  header: {
    backgroundColor: '#222222',
    borderBottom: 0,
    width: '100%',
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
}));

const AppHeader: React.FC = () => {
  const { classes } = useStyles();

  const { openFolder, trackPlaying } = useAppState();

  const openHandler = () => openFolder();

  return (
    <Header height={70} className={classes.header}>
      <div className={classes.leftContainer}>
        <Button variant="default">Dummy</Button>
      </div>
      <div className={classes.playerContainer}>
        {trackPlaying  && <Player track={trackPlaying} />}
      </div>
      <div className={classes.rightContainer}>
        <Button onClick={openHandler} variant="default">
          Open Folder
        </Button>
      </div>
    </Header>
  );
};

export default AppHeader;
