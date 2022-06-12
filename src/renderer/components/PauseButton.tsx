/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import { createStyles } from '@mantine/core';
import React from 'react';

const useStyles = createStyles(theme => ({
  btnstyle: {
    width: 60,
    height: 60,
  },
}));

interface PlayButtonProps {
  color: string;
  size: number;
  action: () => void;
}

const PauseButton: React.FC<PlayButtonProps> = props => {
  const { color, size, action } = props;
  const classes = useStyles();
  return (
    <div className={classes.btnstyle} onClick={action}>
      <svg height={size} viewBox="0 0 32 32" width={size}>
        <g>
          <rect fill={color} height="24" width="8" x="20" y="4" />
          <rect fill={color} height="24" width="8" x="4" y="4" />
        </g>
      </svg>
    </div>
  );
};

export default PauseButton;
