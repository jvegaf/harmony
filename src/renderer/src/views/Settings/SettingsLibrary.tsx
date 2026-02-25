import { useCallback, useEffect, useState } from 'react';

import * as Setting from '../../components/Setting/Setting';
import useLibraryStore, { useLibraryAPI } from '../../stores/useLibraryStore';
import useLibraryUIStore from '../../stores/useLibraryUIStore';
import { Button, Stack, Tooltip, Switch, Text } from '@mantine/core';
import styles from './Settings.module.css';
import { useNavigate } from 'react-router-dom';
import router from '../router';
import LibraryChangesModal from '../../components/Modal/LibraryChangesModal';
import ProgressModal from '../../components/Modal/ProgressModal/ProgressModal';

const { logger, dialog, config, library } = window.Main;

const subtextStyle: React.CSSProperties = {
  fontSize: 'var(--mantine-font-size-xs)',
  color: 'var(--mantine-color-dimmed)',
  display: 'block',
  marginTop: '4px',
};

export default function SettingsLibrary() {
  const libraryAPI = useLibraryAPI();
  const navigate = useNavigate();
  const { libraryChanges } = useLibraryStore();
  const { refreshing, checking, applyingChanges, applyChangesProgress } = useLibraryUIStore();
  const [importing, setImporting] = useState(false);
  const [libraryPath, setLibraryPath] = useState<string>('');
  const [autoFixMetadata, setAutoFixMetadata] = useState<boolean>(false);
  const [useCamelotKeys, setUseCamelotKeys] = useState<boolean>(false);
  const [convertingKeys, setConvertingKeys] = useState(false);
  const [convertProgress, setConvertProgress] = useState({ processed: 0, total: 0 });

  // Load settings on mount
  useEffect(() => {
    config.get('libraryPath').then(path => setLibraryPath(path));
    config.get('autoFixMetadata').then(enabled => setAutoFixMetadata(enabled));
    config.get('useCamelotKeys').then(enabled => setUseCamelotKeys(enabled));
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

  const toggleUseCamelotKeys = useCallback(
    async (checked: boolean) => {
      await config.set('useCamelotKeys', checked);
      setUseCamelotKeys(checked);
    },
    [setUseCamelotKeys],
  );

  const handleConvertAllKeys = useCallback(async () => {
    setConvertingKeys(true);
    setConvertProgress({ processed: 0, total: 0 });

    // Subscribe to progress events emitted during the conversion
    const unsubscribe = library.onImportProgress(progress => {
      if (progress.step === 'converting') {
        setConvertProgress({ processed: progress.processed, total: progress.total });
      }
    });

    try {
      const result = await library.convertKeysToCamelot();
      logger.info(
        `[ConvertKeysToCamelot] ${result.succeeded} converted, ${result.failed} failed out of ${result.total}`,
      );

      // Refresh the library view so updated keys are visible
      router.revalidate();
    } catch (err) {
      logger.error('[ConvertKeysToCamelot] Failed:', err);
    } finally {
      unsubscribe();
      setConvertingKeys(false);
      setConvertProgress({ processed: 0, total: 0 });
    }
  }, []);

  return (
    <div className={styles.settingsContainer}>
      <Stack
        gap='lg'
        mt='md'
      >
        <Setting.Element>
          <Setting.Description>
            Music Collection Path
            <Text
              size='xs'
              c='dimmed'
              mt={4}
            >
              {libraryPath || 'No library path configured'}
            </Text>
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
            <span style={subtextStyle}>Automatically search for missing tags when importing new tracks</span>
          </Setting.Description>
          <Setting.Action>
            <Switch
              checked={autoFixMetadata}
              onChange={e => toggleAutoFixMetadata(e.currentTarget.checked)}
            />
          </Setting.Action>
        </Setting.Element>

        <Setting.Element>
          <Setting.Description>
            Save Keys in Camelot Format
            <span style={subtextStyle}>
              Automatically convert musical keys to Camelot notation when importing new tracks (e.g., Am → 8A)
            </span>
          </Setting.Description>
          <Setting.Action>
            <Switch
              checked={useCamelotKeys}
              onChange={e => toggleUseCamelotKeys(e.currentTarget.checked)}
            />
          </Setting.Action>
        </Setting.Element>

        <Setting.Element>
          <Setting.Description>
            Convert All Keys to Camelot
            <span style={subtextStyle}>
              Convert all existing track keys to Camelot notation. Changes are saved to both audio files and the
              database.
            </span>
          </Setting.Description>
          <Setting.Action>
            <Button
              disabled={convertingKeys}
              loading={convertingKeys}
              onClick={handleConvertAllKeys}
            >
              Convert All Keys
            </Button>
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

      {/* Progress modal while converting keys to Camelot */}
      {convertingKeys && (
        <ProgressModal
          title='Converting Keys to Camelot'
          message={
            convertProgress.total > 0
              ? `Converting ${convertProgress.processed} of ${convertProgress.total} tracks...`
              : 'Preparing conversion...'
          }
          processed={convertProgress.processed}
          total={convertProgress.total > 0 ? convertProgress.total : 1}
          type='apply'
        />
      )}
    </div>
  );
}
