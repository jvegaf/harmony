import { Divider } from '@mantine/core';
import React from 'react';
import useAppState from '../hooks/useAppState';
import usePlayer from '../hooks/usePlayer';

import { Container } from './ContextMenu.styles';

type Props = {
  trackId: TrackId;
  visible: boolean;
  x: number;
  y: number;
};

export const ContextMenu: React.FC = ({ track, visible, x, y }: Props) => {
  const { playTrack } = usePlayer();
  
  const {
    updateTrackDetail, 
    onFixTrack 
  } = useAppState();

  const playOnClickListener   = () => playTrack(track);
  const detailOnClickListener = () => updateTrackDetail(track.id);
  const fixOnClickListener    = () => onFixTrack(track.id);

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
