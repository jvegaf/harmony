import { useEffect, useRef, useState } from 'react';

import styles from './Settings.module.css';
import { ScrollAreaAutosize } from '@mantine/core';

export default function SettingsLog() {
  const viewPortRef = useRef<HTMLDivElement>(null);
  const { logger, app } = window.Main;
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    logger.info('SettingsLog mounted');
    app.getLogs().then(logsResponse => {
      setLogs(logsResponse.reverse());
      logger.info(`logs size: ${logsResponse.length}`);
    });
  }, []);

  return (
    <div className={styles.settingsContainer}>
      <ScrollAreaAutosize
        viewportRef={viewPortRef}
        type='always'
        scrollbars='y'
        mah={900}
      >
        {logs.map((log, index) => (
          <p key={index}>{log}</p>
        ))}
      </ScrollAreaAutosize>
    </div>
  );
}
