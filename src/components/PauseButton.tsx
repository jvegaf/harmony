/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react';

interface ControlButtonProps {
  color: string;
  size: number;
  action: () => void;
}

function PauseButton(props: ControlButtonProps) {
  const { color, size, action } = props;
  return (
    <div className="w-16 h-16" onClick={action}>
      <svg height={size} viewBox="0 0 32 32" width={size}>
        <g>
          <rect fill={color} height="24" width="8" x="20" y="4" />
          <rect fill={color} height="24" width="8" x="4" y="4" />
        </g>
      </svg>
    </div>
  );
}

export default PauseButton;
