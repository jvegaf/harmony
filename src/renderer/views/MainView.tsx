import { createStyles } from '@mantine/core';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioPlayerProvider } from 'react-use-audio-player';
import useAppState from 'renderer/hooks/useAppState';
import { TrackId } from 'shared/types/emusik';
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
  const { setTracksLoaded, tracksLoaded, playTrack } = useAppState();
  const navigate = useNavigate();

  const log = useLog();

  React.useEffect(() => {
    window.Main.on('tracks-updated', () => {
      log.info('have tracks');
      setTracksLoaded(true);
      window.Main.GetAll();
    });

    window.Main.on('view-detail-command', (trackId: TrackId) => navigate(`/detail/${trackId}`));

    window.Main.on('play-command', (trackId: TrackId) => playTrack(trackId));

    window.Main.on('fix-track-command', (trackId: TrackId) => window.Main.FixTrack(trackId));

    window.Main.on('fix-tracks-command', (selected: TrackId[]) => window.Main.FixTracks(selected));
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
