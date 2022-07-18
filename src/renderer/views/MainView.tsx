import { createStyles } from '@mantine/core';
import React from 'react';
import useAppState from 'renderer/hooks/useAppState';
import AppHeader from '../components/AppHeader';
import OnBoarding from '../components/OnBoarding';
import TrackDetail from '../components/TrackDetail';
import { TrackList } from '../components/TrackList';
import { PlayerContextProvider } from '../context/PlayerContext';
import useLog from './../hooks/useLog';

const useStyles = createStyles((theme) => ({
  main: {
    width:           '100%',
    height:          '100vh',
    display:         'flex',
    flexDirection:   'column',
    backgroundColor:
      theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white
  },
  header:  { height: 70 },
  content: { flexGrow: 1 }
}));

const MainView = () => {
  const { classes } = useStyles();
  const { setTracksLoaded, trackDetail } = useAppState();
  const [ content, setContent ]          = React.useState(<OnBoarding />);

  const log = useLog();

  React.useEffect(() => {
    window.Main.on('tracks-updated', () => {
      log.info('have tracks');
      setTracksLoaded(true);
      window.Main.GetAll();
      setContent(<TrackList />);
    });
  }, [ setTracksLoaded ]);

  React.useEffect(() => {
    if (trackDetail !== null){
      log.info('have trackDetail', trackDetail);
      const track = window.Main.GetTrack(trackDetail);
      setContent(<TrackDetail track={track} />);

      return () => setContent(<TrackList />);
    }
  }, [ trackDetail ]);

  return (
    <PlayerContextProvider>
      <div className={classes.main}>
        <div className={classes.header}>
          <AppHeader />
        </div>
        <div className={classes.content}>{content}</div>
      </div>
    </PlayerContextProvider>
  );
};

export default MainView;
