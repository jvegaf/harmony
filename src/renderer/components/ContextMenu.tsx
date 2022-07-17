import { Divider } from '@mantine/core';
import React from 'react';
import useAppState from '../hooks/useAppState';

import { Container } from './ContextMenu.styles';

type Props = {
  trackId: TrackId;
  visible: boolean;
  x: number;
  y: number;
};

export const ContextMenu: React.FC = ({ trackId, visible, x, y }: Props) => {
  const {
    updateTrackPlaying, 
    updateTrackDetail, 
    onFixTrack 
  } = useAppState();

  const playOnClickListener   = () => updateTrackPlaying(trackId);
  const detailOnClickListener = () => updateTrackDetail(trackId);
  const fixOnClickListener    = () => onFixTrack(trackId);

  return (
    <Container>
      {visible && (
        <ul className="popup" style={{ left: `${x}px`, top: `${y}px` }}>
          <li onClick={playOnClickListener}>Play</li>
          <li onClick={detailOnClickListener}>Details</li>
          <Divider />
          <li onClick={fixOnClickListener}>Fix Tags</li>
          <Divider />
          <li>Delete</li>
        </ul>
      )}
    </Container>
  );
};
