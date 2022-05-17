/* eslint-disable no-console */
/* eslint-disable react/jsx-props-no-spreading */
import { createStyles } from '@mantine/core';
import { useViewportSize } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import useAppState from 'renderer/hooks/useAppState';
import { Track } from 'shared/types/emusik';
import AppHeader from '../components/AppHeader';
import TrackDetail from '../components/TrackDetail';
import TrackList from '../components/TrackList';

const useStyles = createStyles((theme) => ({
  main: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor:
      theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
  },
  content: {
    flexGrow: 1,
  },
}));

const MainView = () => {
  const { classes } = useStyles();
  const { height, width } = useViewportSize();
  const [tlheight, setTlheight] = useState(0);
  const {
    tracks,
    showCtxMenu,
    trackPlaying,
    setTrackPlaying,
    trackDetail,
    setTrackDetail,
  } = useAppState();

  useEffect(() => {
    const newHeight = height - 100;
    setTlheight(newHeight);
  }, [height]);

  const handleDblClick = (t: Track) => {
    setTrackPlaying(t);
  };

  const handleRightClk = (t: Track) => showCtxMenu(t);

  const tlprops = {
    tlheight,
    tlwidth: width,
  };

  return (
    <div className={classes.main}>
      <AppHeader />
      <div className={classes.content}>
        {trackDetail ? (
          <TrackDetail track={trackDetail} endCB={setTrackDetail} />
        ) : (
          <TrackList {...tlprops} />
        )}
      </div>
    </div>
  );
};

export default MainView;
