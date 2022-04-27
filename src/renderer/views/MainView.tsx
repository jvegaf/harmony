/* eslint-disable react/jsx-props-no-spreading */
import { useEffect, useState } from 'react';
import { useViewportSize } from '@mantine/hooks';
import useAppState from 'renderer/hooks/useAppState';
import { Track } from 'shared/types/emusik';
import AppHeader from '../components/AppHeader';
import TrackList from '../components/TrackList';

const MainView = () => {
  const { height, width } = useViewportSize();
  const [tlheight, setTlheight] = useState(0);
  const { tracks, addTracks } = useAppState();

  // calling IPC exposed from preload script
  window.electron.ipcRenderer.on('add-tracks', (newTracks: Track[]) => {
    // eslint-disable-next-line no-console
    console.log(`renderer: ${newTracks.length} tracks added`);
    addTracks(newTracks);
  });

  useEffect(() => {
    const newHeight = height - 100;
    setTlheight(newHeight);
  }, [height]);

  const tlprops = { data: tracks, tlheight, tlwidth: width };
  return (
    <div className="main">
      <AppHeader />
      <TrackList {...tlprops} />
    </div>
  );
};

export default MainView;
