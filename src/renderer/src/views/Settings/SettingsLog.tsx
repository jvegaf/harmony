import { useEffect, useState } from 'react';

import styles from './Settings.module.css';

export default function SettingsLog() {
  const { logger, app } = window.Main;
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    logger.info('SettingsLog mounted');
    app.getLogs().then(logsResponse => {
      setLogs(logsResponse);
      logger.info(`logs size: ${logsResponse.length}`);
    });
  }, []);

  return (
    <div className={styles.settingsContainer}>
      {logs.map((log, index) => (
        <p key={index}>{log}</p>
      ))}
    </div>
  );
}
