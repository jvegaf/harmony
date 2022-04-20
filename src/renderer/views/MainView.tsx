/* eslint-disable react/jsx-props-no-spreading */
import { useViewportSize } from '@mantine/hooks';
import React, { useEffect, useState } from 'react';
import data from '../MOCK_DATA.json';
import AppHeader from '../components/AppHeader';
import TrackList from '../components/TrackList';

const MainView = () => {
  const { height, width } = useViewportSize();
  const [tlheight, setTlheight] = useState(0);

  useEffect(() => {
    const newHeight = height - 100;
    setTlheight(newHeight);
  }, [height]);

  const tlprops = { data, tlheight, tlwidth: width };
  return (
    <div className="main">
      <AppHeader />
      <TrackList {...tlprops} />
    </div>
  );
};

export default MainView;
