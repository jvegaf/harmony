import { useCallback, useEffect, useState } from 'react';

import * as Setting from '../../components/Setting/Setting';
import useLibraryStore, { useLibraryAPI } from '../../stores/useLibraryStore';
import { Button, Stack, Tooltip, Switch } from '@mantine/core';
import styles from './Settings.module.css';
import { useNavigate } from 'react-router-dom';
import router from '../router';
import LibraryChangesModal from '../../components/Modal/LibraryChangesModal';
import ProgressModal from '../../components/Modal/ProgressModal/ProgressModal';

const { logger, dialog, config } = window.Main;

export default function SettingsLibrary() {
  const libraryAPI = useLibraryAPI();
  const navigate = useNavigate();
  const { refreshing, checking, libraryChanges, applyingChanges, applyChangesProgress } = useLibraryStore();
  const [importing, setImporting] = useState(false);
  const [libraryPath, setLibraryPath] = useState<string>('');
  const [autoFixMetadata, setAutoFixMetadata] = useState<boolean>(false);

  // Load library path and autoFixMetadata on mount
  useEffect(() => {
    config.get('libraryPath').then(path => setLibraryPath(path));
    config.get('autoFixMetadata').then(enabled => setAutoFixMetadata(enabled));
  }, []);

  useEffect(() => {
    if (!refreshing && importing) {
      router.revalidate();
      navigate('/library');
    }
  }, [refreshing, importing]);

  const openFolderSelector = useCallback(async () => {
    const options: Electron.OpenDialogOptions = {
      properties: ['openDirectory'],
    };

    const result = await dialog.open(options);

    if (result.filePaths) {
      setImporting(true);
      libraryAPI.setLibrarySourceRoot(result.filePaths).catch(err => {
        logger.warn(err);
      });
    }
  }, [libraryAPI]);

  const toggleAutoFixMetadata = useCallback(
    async (checked: boolean) => {
      await config.set('autoFixMetadata', checked);
      setAutoFixMetadata(checked);
    },
    [setAutoFixMetadata],
  );

  return (
    <div className={styles.settingsContainer}>
      <Stack
        gap='lg'
        mt='md'
      >
        <Setting.Element>
          <Setting.Description>
            Music Collection Path
            <span
              style={{
                fontSize: 'var(--mantine-font-size-xs)',
                color: 'var(--mantine-color-dimmed)',
                display: 'block',
                marginTop: '4px',
              }}
            >
              {libraryPath || 'No library path configured'}
            </span>
          </Setting.Description>
          <Setting.Action>
            <Button
              disabled={refreshing}
              onClick={openFolderSelector}
            >
              {libraryPath ? 'Change Source' : 'Select Music Collection Source'}
            </Button>
          </Setting.Action>
        </Setting.Element>

        <Setting.Element>
          <Setting.Description>Check for Changes</Setting.Description>
          <Setting.Action>
            <Tooltip
              label='Configure a music collection path first'
              disabled={!!libraryPath}
            >
              <Button
                disabled={refreshing || checking || !libraryPath}
                loading={checking}
                onClick={libraryAPI.checkLibraryChanges}
              >
                Check for Changes
              </Button>
            </Tooltip>
          </Setting.Action>
        </Setting.Element>

        <Setting.Element>
          <Setting.Description>
            Auto-Fix Metadata
            <span
              style={{
                fontSize: 'var(--mantine-font-size-xs)',
                color: 'var(--mantine-color-dimmed)',
                display: 'block',
                marginTop: '4px',
              }}
            >
              Automatically search for missing tags when importing new tracks
            </span>
          </Setting.Description>
          <Setting.Action>
            <Switch
              checked={autoFixMetadata}
              onChange={e => toggleAutoFixMetadata(e.currentTarget.checked)}
            />
          </Setting.Action>
        </Setting.Element>

        <Setting.Element>
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
        </Setting.Element>
      </Stack>

      {/* Library changes confirmation modal */}
      {libraryChanges && (
        <LibraryChangesModal
          changes={libraryChanges}
          onConfirm={() => libraryAPI.applyLibraryChanges(libraryChanges)}
          onCancel={libraryAPI.dismissLibraryChanges}
        />
      )}

      {/* Progress modal while applying changes */}
      {applyingChanges && (
        <ProgressModal
          title='Applying Changes'
          message='Updating your library...'
          processed={applyChangesProgress.processed}
          total={applyChangesProgress.total}
          type='apply'
        />
      )}
    </div>
  );
}
