import { useEffect, useRef, useState } from 'react';

import styles from './Settings.module.css';
import { Box, ScrollAreaAutosize, Text } from '@mantine/core';
import { useViewportSize } from '@renderer/hooks/useViewPortSize';
import { app } from '@renderer/lib/tauri-api';

export default function SettingsLog() {
  const { height, width } = useViewportSize();
  const viewPortRef = useRef<HTMLDivElement>(null);
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
        mah={height}
      >
        <Box w={width}>
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
