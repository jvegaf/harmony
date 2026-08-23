import type { ComponentPropsWithoutRef } from 'react';

import styles from './ControlButton.module.css';

function ControlButton(props: ComponentPropsWithoutRef<'button'>) {
  const { children, ...restProps } = props;
  return (
    <div>
      <button
        className={styles.ctrlBtn}
        {...restProps}
      >
        {children}
      </button>
    </div>
  );
}

export default ControlButton;
