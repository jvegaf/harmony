import { Divider } from '@mantine/core';
import React from 'react';

import { Container } from './ContextMenu.styles';

type Props = {
  record: Track;
  visible: boolean;
  x: number;
  y: number;
};

export const ContextMenu: React.FC = ({ record, visible, x, y }: Props) => {
  return (
    <Container>
      {visible && (
        <ul className="popup" style={{ left: `${x}px`, top: `${y}px` }}>
          <li>Play</li>
          <li>Details</li>
          <Divider />
          <li>Fix Tags</li>
          <Divider />
          <li>Delete</li>
        </ul>
      )}
    </Container>
  );
};
