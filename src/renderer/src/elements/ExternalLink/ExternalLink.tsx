import React, { useCallback } from 'react';

import styles from './ExternalLink.module.css';
import { shell } from '@renderer/lib/tauri-api';

type Props = {
  children: string;
  href: string;
};

export default function ExternalLink(props: Props) {
  const openLink = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      shell.openExternal(props.href);
    },
    [props.href],
  );

  return (
    <button
      className={styles.externalLink}
      role='link'
      onClick={openLink}
    >
      {props.children}
    </button>
  );
}
