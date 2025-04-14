import { useEffect, useRef, useState } from 'react';

import styles from './Settings.module.css';
import { Box, ScrollAreaAutosize, Text } from '@mantine/core';

export default function SettingsLog() {
  const viewPortRef = useRef<HTMLDivElement>(null);
  const { logger, app } = window.Main;
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    app.getLogs().then(logsResponse => {
      setLogs(logsResponse.reverse());
    });
  }, []);

  return (
    <div className={styles.settingsContainer}>
      <ScrollAreaAutosize
        viewportRef={viewPortRef}
        type='always'
        mah={700}
      >
        <Box w={900}>
          {logs.map((log, index) => (
            <Text
              component='div'
              key={index}
            >
              {log}
            </Text>
          ))}
        </Box>
      </ScrollAreaAutosize>
    </div>
  );
}
