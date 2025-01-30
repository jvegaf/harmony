import { useCallback } from 'react';

import * as Setting from '../../components/Setting/Setting';
import useLibraryStore, { useLibraryAPI } from '../../stores/useLibraryStore';
import { Button } from '@mantine/core';

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
    <div className='setting settings-musicfolder'>
      <Setting.Section>
        <h3 style={{ marginTop: 0 }}>Import music</h3>
        <Setting.Description>
          This will also scan for <code>.m3u</code> files and create corresponding playlists.
        </Setting.Description>
        <Button
          disabled={refreshing}
          onClick={openFolderSelector}
        >
          Add files or folders
        </Button>
      </Setting.Section>
      <Setting.Section>
        <h3>Danger zone</h3>
        <Button
          color='red'
          disabled={refreshing}
          onClick={libraryAPI.reset}
        >
          Reset library
        </Button>
      </Setting.Section>
    </div>
  );
}
