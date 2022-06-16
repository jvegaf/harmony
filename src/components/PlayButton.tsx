/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react';

interface ControlButtonProps {
  color: string;
  size: number;
  action: () => void;
}

function PlayButton(props: ControlButtonProps) {
  const { color, size, action } = props;

  return (
    <div className="h-16 w-16" onClick={action}>
      <svg height={size + 5} fill={color} viewBox="0 0 512 512" width={size + 20}>
        <g>
          <path d="M128,96v320l256-160L128,96L128,96z" />
        </g>
      </svg>
    </div>
  );
}

export default PlayButton;
