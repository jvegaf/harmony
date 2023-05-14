import { createStyles } from '@mantine/core';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Tracklist from '../components/Tracklist';
import AppHeader from '../components/AppHeader';
import { useAppSelector } from 'renderer/hooks';

const useStyles = createStyles((theme) => ({
  main: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
  },
  header: { height: 70 },
  content: { flexGrow: 1 },
}));

const MainView = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();

  const tracks = useAppSelector((state) => state.collection.tracks);

  React.useEffect(() => {
    if (!tracks.length) {
      console.log('no tracks go to welcome');
      navigate('/welcome');
    }
  }, [tracks]);

  return (
    <div className={classes.main}>
      <div className={classes.header}>
        <AppHeader />
      </div>
      <div className={classes.content}>
        <Tracklist />
      </div>
    </div>
  );
};

export default MainView;