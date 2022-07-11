/* eslint-disable react/jsx-props-no-spreading */
import { createStyles } from '@mantine/core';
import { useViewportSize } from '@mantine/hooks';
import { useEffect, useMemo, useState } from 'react';
import OnBoarding from 'renderer/components/OnBoarding';
import useAppState from 'renderer/hooks/useAppState';
import { Track, TrackId } from 'shared/types/emusik';
import AppHeader from '../components/AppHeader';
import TrackDetail from '../components/TrackDetail';
import TrackList from '../components/TrackList';

const useStyles = createStyles(theme => ({
  main: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
  },
  header: {
    minHeight: 70,
  },
  content: {
    flexGrow: 1,
  },
}));

const MainView = () => {
  const { classes } = useStyles();
  const { height } = useViewportSize();
  const { tracksLoaded, setTracksLoaded, trackDetail } = useAppState();
  const [content, setContent] = useState(<OnBoarding />);

  useEffect(() => {
    window.Main.on('tracks-updated', () => {
      setTracksLoaded(true);
      window.Main.GetAll();
    });
  }, [setTracksLoaded]);

  useEffect(() => {
    if (tracksLoaded) {
      setContent(<TrackList />);
    }

    if (trackDetail) {
      const track = window.Main.GetTrack(trackDetail);
      setContent(<TrackDetail track={track} />);
    }
  }, [tracksLoaded, trackDetail]);

  return (
    <div className={classes.main}>
      <div className={classes.header}>
        <AppHeader />
      </div>
      <div className={classes.content}>{content}</div>
    </div>
  );
};

export default MainView;
