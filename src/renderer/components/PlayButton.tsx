/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import { createStyles } from '@mantine/core';
import React from 'react';

const useStyles = createStyles((theme) => ({
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

const PlayButton: React.FC<PlayButtonProps> = (props) => {
  const { color, size, action } = props;
  const classes = useStyles();
  return (
    <div className={classes.btnstyle} onClick={action}>
      <svg
        height={size + 5}
        fill={color}
        viewBox="0 0 512 512"
        width={size + 20}
      >
        <g>
          <path d="M128,96v320l256-160L128,96L128,96z" />
        </g>
      </svg>
    </div>
  );
};

export default PlayButton;
