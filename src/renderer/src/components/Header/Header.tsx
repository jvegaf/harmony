import ControlButton from '../../elements/Button/ControlButton';
import { IconPlayerSkipBackFilled, IconPlayerPlayFilled, IconPlayerSkipForwardFilled } from '@tabler/icons-react';
import styles from './Header.module.css';
import Cover from '../Cover/Cover';
import VolumeControl from '../VolumeControl/VolumeControl';

function Header() {
  const trackPlaying = null;
  return (
    <div className={styles.headerRoot}>
      <div className={styles.coverImage}>
        <Cover track={trackPlaying} />
      </div>
      <div className={styles.controls}>
        <VolumeControl />
        <div className={styles.playerControls}>
          <ControlButton onClick={() => console.log('clic')}>
            <IconPlayerSkipBackFilled size={16} />
          </ControlButton>
          <ControlButton onClick={() => console.log('clic')}>
            <IconPlayerPlayFilled size={16} />
          </ControlButton>
          <ControlButton onClick={() => console.log('clic')}>
            <IconPlayerSkipForwardFilled size={16} />
          </ControlButton>
        </div>
      </div>
    </div>
  );
}

export default Header;
