/* eslint-disable no-console */
/* eslint-disable react/jsx-props-no-spreading */
import { useEffect, useState } from 'react';
import { useViewportSize } from '@mantine/hooks';
import useAppState from 'renderer/hooks/useAppState';
import { createStyles } from '@mantine/core';
import { MenuCommand, Track } from 'shared/types/emusik';
import AppHeader from '../components/AppHeader';
import TrackList from '../components/TrackList';
import TrackDetail from '../components/TrackDetail';

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
  const { tracks, addTracks, showCtxMenu } = useAppState();
  const [trackDetail, setTrackDetail] = useState<Track>(undefined);



  useEffect(() => {
    const newHeight = height - 100;
    setTlheight(newHeight);
  }, [height]);

  const onShowDetail = (selTrack: Track) => {
    setTrackDetail(selTrack);
  };

  const onEndShowDetail = () => {
    setTrackDetail(undefined);
  };

  const onShowCtxMenu = (t: Track) => showCtxMenu(t);

  const tlprops = {
    tracks,
    tlheight,
    tlwidth: width,
    onShowDetail,
    onShowCtxMenu,
  };

  return (
    <div className={classes.main}>
      <AppHeader />
      <div className={classes.content}>
        {trackDetail ? (
          <TrackDetail track={trackDetail} endCB={onEndShowDetail} />
        ) : (
          <TrackList {...tlprops} />
        )}
      </div>
    </div>
  );
};

export default MainView;
