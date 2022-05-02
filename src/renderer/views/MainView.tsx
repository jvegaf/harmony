/* eslint-disable react/jsx-props-no-spreading */
import { useEffect, useState } from 'react';
import { useViewportSize } from '@mantine/hooks';
import useAppState from 'renderer/hooks/useAppState';
import { Track } from 'shared/types/emusik';
import AppHeader from '../components/AppHeader';
import TrackList from '../components/TrackList';
import TrackDetail from '../components/TrackDetail';

const MainView = () => {
  const { height, width } = useViewportSize();
  const [tlheight, setTlheight] = useState(0);
  const { tracks, addTracks } = useAppState();
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState({});

  // calling IPC exposed from preload script
  window.electron.ipcRenderer.on('add-tracks', (newTracks: Track[]) => {
    addTracks(newTracks);
  });

  useEffect(() => {
    const newHeight = height - 100;
    setTlheight(newHeight);
  }, [height]);

  const onShowDetail = (selTrack: Track) => {
    setSelected(selTrack);
    setShowDetail(true);
  };

  const onEndShowDetail = () => {
    setShowDetail(false);
    setSelected({});
  };

  const tlprops = { tracks, tlheight, tlwidth: width, onShowDetail };

  return (
    <div className="main">
      <AppHeader />
      {showDetail ? (
        <TrackDetail track={selected} endCB={onEndShowDetail} />
      ) : (
        <TrackList {...tlprops} />
      )}
    </div>
  );
};

export default MainView;
