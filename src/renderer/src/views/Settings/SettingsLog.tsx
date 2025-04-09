import { useCallback, useEffect, useState } from 'react';

import * as Setting from '../../components/Setting/Setting';
import useLibraryStore, { useLibraryAPI } from '../../stores/useLibraryStore';
import { Button } from '@mantine/core';
import styles from './Settings.module.css';

const { logger, app } = window.Main;

export default function SettingsLog() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const getLogs = async () => {
      const logsResponse = await app.getLogs();
      setLogs(logsResponse);
      logger.info(`logs size: ${logsResponse.length}`);
    };
  }, []);

  return (
    <div className={styles.settingsContainer}>
      {logs.map((log, index) => (
        <p key={index}>{log}</p>
      ))}
    </div>
  );
}
