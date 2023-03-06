import { createStyles } from '@mantine/core';
import React from 'react';
import { AudioPlayerProvider } from 'react-use-audio-player';
import useAppState from 'renderer/hooks/useAppState';
import AppHeader from '../components/AppHeader';
import OnBoarding from '../components/OnBoarding';
import { TrackList } from '../components/TrackList';
import useLog from './../hooks/useLog';
import TrackDetail from './TrackDetail';

const useStyles = createStyles((theme) => ({
  main: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor:
      theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white
  },
  header: { height: 70 },
  content: { flexGrow: 1 }
}));

const MainView = () => {
  const { classes } = useStyles();
  const { setTracksLoaded, tracksLoaded } = useAppState();

  const log = useLog();

  React.useEffect(() => {
    window.Main.on('tracks-updated', () => {
      log.info('have tracks');
      setTracksLoaded(true);
      window.Main.GetAll();
    });
  }, []);

  return (
    <AudioPlayerProvider>
      <div className={classes.main}>
        <div className={classes.header}>
          <AppHeader />
        </div>
        <div className={classes.content}>
          {tracksLoaded ? <TrackList /> : <OnBoarding />}
        </div>
      </div>
    </AudioPlayerProvider>
  );
};

export default MainView;
