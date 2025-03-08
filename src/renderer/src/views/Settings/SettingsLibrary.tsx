import { useCallback } from 'react';

import * as Setting from '../../components/Setting/Setting';
import useLibraryStore, { useLibraryAPI } from '../../stores/useLibraryStore';
import { Button } from '@mantine/core';
import styles from './Settings.module.css';

const { logger, dialog } = window.Main;

export default function SettingsLibrary() {
  const libraryAPI = useLibraryAPI();
  const { refreshing } = useLibraryStore();

  const openFolderSelector = useCallback(async () => {
    const options: Electron.OpenDialogOptions = {
      properties: ['multiSelections', 'openDirectory', 'openFile'],
    };

    const result = await dialog.open(options);

    if (result.filePaths) {
      libraryAPI.add(result.filePaths).catch(err => {
        logger.warn(err);
      });
    }
  }, [libraryAPI]);

  return (
    <div className={styles.settingsContainer}>
      {/* <Setting.Title>Library</Setting.Title> */}
      <Setting.Section>
        <Setting.Description>Import Music</Setting.Description>
        <Setting.Action>
          <Button
            disabled={refreshing}
            onClick={openFolderSelector}
          >
            Add files or folders
          </Button>
        </Setting.Action>
      </Setting.Section>
      <Setting.Section>
        <Setting.Description>Danger zone</Setting.Description>
        <Setting.Action>
          <Button
            color='red'
            disabled={refreshing}
            onClick={libraryAPI.reset}
          >
            Reset library
          </Button>
        </Setting.Action>
      </Setting.Section>
    </div>
  );
}
