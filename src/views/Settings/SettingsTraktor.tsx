/**
 * Traktor Integration Settings
 *
 * Settings panel for configuring Traktor NML sync.
 * Allows users to:
 * - Select collection.nml file path
 * - Configure sync strategy
 * - Preview and execute sync operations
 * - Export changes back to Traktor
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Select,
  Switch,
  Text,
  Badge,
  Group,
  Stack,
  Paper,
  Divider,
  NumberInput,
  Collapse,
} from '@mantine/core';
import {
  IconRefresh,
  IconUpload,
  IconDownload,
  IconFolder,
  IconCheck,
  IconPlayerPlay,
  IconPlayerStop,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

import * as Setting from '../../components/Setting/Setting';
import styles from './Settings.module.css';
import traktorStyles from './SettingsTraktor.module.css';
import type {
  TraktorConfig,
  TraktorNMLInfo,
  TraktorSyncProgress,
  TraktorSyncPlan,
  AutoSyncStatus,
} from '@/types/traktor';
import { useRevalidator } from 'react-router-dom';
import { traktor, logger } from '@/lib/tauri-api';

type SyncState = 'idle' | 'loading' | 'previewing' | 'syncing' | 'exporting' | 'complete' | 'error';

export default function SettingsTraktor() {
  // Config state
  const [config, setConfig] = useState<TraktorConfig | null>(null);
  const [nmlInfo, setNmlInfo] = useState<TraktorNMLInfo | null>(null);
  const [syncPlan, setSyncPlan] = useState<TraktorSyncPlan | null>(null);

  // UI state
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [progress, setProgress] = useState<TraktorSyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // Auto-sync state
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus | null>(null);
  const revalidator = useRevalidator();

  const loadNmlInfo = useCallback(async (path: string) => {
    try {
      setSyncState('loading');
      const info = await traktor.parseNml(path);
      setNmlInfo(info);
      setSyncState('idle');
    } catch (err) {
      logger.error('Failed to parse NML:', err);
      setError('Failed to parse collection.nml');
      setSyncState('error');
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await traktor.getConfig();
      setConfig(cfg);

      // If path is set, load NML info
      if (cfg.nmlPath) {
        await loadNmlInfo(cfg.nmlPath);
      }
    } catch (err) {
      logger.error('Failed to load Traktor config:', err);
      setError('Failed to load configuration');
    }
  }, [loadNmlInfo]);

  // Load config on mount
  useEffect(() => {
    loadConfig();

    // Subscribe to progress updates
    const unsubscribe = traktor.onProgress(progressUpdate => {
      setProgress(progressUpdate);
    });

    // Subscribe to auto-sync status updates
    const unsubscribeAutoSync = traktor.autoSync.onStatusChange(status => {
      setAutoSyncStatus(status);
    });

    // Get initial auto-sync status
    traktor.autoSync.getStatus().then(setAutoSyncStatus);

    return () => {
      unsubscribe();
      unsubscribeAutoSync();
    };
  }, [loadConfig]);

  const handleSelectNmlPath = useCallback(async () => {
    try {
      const path = await traktor.selectNmlPath();
      if (path) {
        const updatedConfig = await traktor.setConfig({ nmlPath: path });
        setConfig(updatedConfig);
        await loadNmlInfo(path);
        setError(null);
      }
    } catch (err) {
      logger.error('Failed to select NML path:', err);
      setError('Failed to select file');
    }
  }, [loadNmlInfo]);

  const handleSyncStrategyChange = useCallback(
    async (value: string | null) => {
      if (!value || !config) return;
      try {
        const updatedConfig = await traktor.setConfig({
          syncStrategy: value as TraktorConfig['syncStrategy'],
        });
        setConfig(updatedConfig);
      } catch (err) {
        logger.error('Failed to update sync strategy:', err);
      }
    },
    [config],
  );

  const handleAutoBackupChange = useCallback(
    async (checked: boolean) => {
      if (!config) return;
      try {
        const updatedConfig = await traktor.setConfig({ autoBackup: checked });
        setConfig(updatedConfig);
      } catch (err) {
        logger.error('Failed to update auto backup:', err);
      }
    },
    [config],
  );

  const handlePreviewSync = useCallback(async () => {
    try {
      setSyncState('previewing');
      setError(null);
      const plan = await traktor.getSyncPreview();
      setSyncPlan(plan);
      setSyncState('idle');
    } catch (err) {
      logger.error('Failed to get sync preview:', err);
      setError('Failed to analyze sync');
      setSyncState('error');
    }
  }, []);

  const handleExecuteSync = useCallback(async () => {
    const notificationId = `traktor-sync-${Date.now()}`;

    try {
      setSyncState('syncing');
      setError(null);

      // Show initial notification
      notifications.show({
        id: notificationId,
        title: 'Traktor: Import from Traktor',
        message: 'Starting sync...',
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });

      // Subscribe to progress updates during sync
      const unsubscribe = traktor.onProgress(progressUpdate => {
        const phaseLabel = progressUpdate.phase.charAt(0).toUpperCase() + progressUpdate.phase.slice(1);
        const progressPercent = Math.round(progressUpdate.progress);
        notifications.update({
          id: notificationId,
          message: `${phaseLabel}: ${progressUpdate.message} (${progressPercent}%)`,
          loading: true,
        });
      });

      try {
        const result = await traktor.executeSync();

        // Build result message
        const parts: string[] = [];
        if (result.stats.tracksImported > 0) {
          parts.push(`Imported ${result.stats.tracksImported} tracks`);
        }
        if (result.stats.tracksUpdated > 0) {
          parts.push(`Updated ${result.stats.tracksUpdated} tracks`);
        }
        if (result.stats.cuePointsAdded > 0) {
          parts.push(`${result.stats.cuePointsAdded} cue points`);
        }
        if (result.stats.playlistsImported > 0) {
          parts.push(`Imported ${result.stats.playlistsImported} playlists`);
        }
        const message = parts.length > 0 ? parts.join(', ') : 'No changes needed';

        setLastSyncResult(message);
        setSyncPlan(null);
        setSyncState('complete');

        // Update notification to success
        notifications.update({
          id: notificationId,
          title: 'Traktor Import Complete',
          message,
          loading: false,
          autoClose: 3000,
          color: 'green',
          withCloseButton: true,
        });

        // Refresh NML info
        if (config?.nmlPath) {
          await loadNmlInfo(config.nmlPath);
        }

        revalidator.revalidate();
      } finally {
        unsubscribe();
      }
    } catch (err) {
      logger.error('Sync failed:', err);
      setError('Sync failed');
      setSyncState('error');

      // Update notification to error
      notifications.update({
        id: notificationId,
        title: 'Traktor Import Failed',
        message: String(err),
        loading: false,
        autoClose: 5000,
        color: 'red',
        withCloseButton: true,
      });
    }
  }, [config, loadNmlInfo]);

  const handleExportToNml = useCallback(async () => {
    const notificationId = `traktor-export-${Date.now()}`;

    try {
      setSyncState('exporting');
      setError(null);

      // Show initial notification
      notifications.show({
        id: notificationId,
        title: 'Traktor: Export to Traktor',
        message: 'Starting export...',
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });

      // Subscribe to progress updates during export
      const unsubscribe = traktor.onProgress(progressUpdate => {
        const phaseLabel = progressUpdate.phase.charAt(0).toUpperCase() + progressUpdate.phase.slice(1);
        const progressPercent = Math.round(progressUpdate.progress);
        notifications.update({
          id: notificationId,
          message: `${phaseLabel}: ${progressUpdate.message} (${progressPercent}%)`,
          loading: true,
        });
      });

      try {
        await traktor.exportToNml();
        setLastSyncResult('Exported changes to Traktor');
        setSyncState('complete');

        // Update notification to success
        notifications.update({
          id: notificationId,
          title: 'Traktor Export Complete',
          message: 'Successfully exported to Traktor',
          loading: false,
          autoClose: 3000,
          color: 'green',
          withCloseButton: true,
        });
      } finally {
        unsubscribe();
      }
    } catch (err) {
      logger.error('Export failed:', err);
      setError('Export failed');
      setSyncState('error');

      // Update notification to error
      notifications.update({
        id: notificationId,
        title: 'Traktor Export Failed',
        message: String(err),
        loading: false,
        autoClose: 5000,
        color: 'red',
        withCloseButton: true,
      });
    }
  }, []);

  // -------------------------------------------------------------------------
  // Auto-Sync Handlers
  // -------------------------------------------------------------------------

  const handleAutoSyncEnabledChange = useCallback(
    async (checked: boolean) => {
      if (!config) return;
      try {
        const updatedConfig = await traktor.setConfig({
          autoSync: { ...config.autoSync, enabled: checked },
        });
        setConfig(updatedConfig);
      } catch (err) {
        logger.error('Failed to update auto sync enabled:', err);
      }
    },
    [config],
  );

  const handleAutoSyncDirectionChange = useCallback(
    async (value: string | null) => {
      if (!value || !config) return;
      try {
        const updatedConfig = await traktor.setConfig({
          autoSync: { ...config.autoSync, direction: value as 'import' | 'export' | 'bidirectional' },
        });
        setConfig(updatedConfig);
      } catch (err) {
        logger.error('Failed to update auto sync direction:', err);
      }
    },
    [config],
  );

  const handleAutoSyncOnStartupChange = useCallback(
    async (checked: boolean) => {
      if (!config) return;
      try {
        const updatedConfig = await traktor.setConfig({
          autoSync: { ...config.autoSync, onStartup: checked },
        });
        setConfig(updatedConfig);
      } catch (err) {
        logger.error('Failed to update auto sync on startup:', err);
      }
    },
    [config],
  );

  const handleAutoSyncOnLibraryChangeChange = useCallback(
    async (checked: boolean) => {
      if (!config) return;
      try {
        const updatedConfig = await traktor.setConfig({
          autoSync: { ...config.autoSync, onLibraryChange: checked },
        });
        setConfig(updatedConfig);
      } catch (err) {
        logger.error('Failed to update auto sync on library change:', err);
      }
    },
    [config],
  );

  const handleAutoSyncDebounceChange = useCallback(
    async (value: string | number) => {
      if (!config) return;
      const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
      if (isNaN(numValue)) return;
      try {
        const updatedConfig = await traktor.setConfig({
          autoSync: { ...config.autoSync, debounceMs: numValue },
        });
        setConfig(updatedConfig);
      } catch (err) {
        logger.error('Failed to update auto sync debounce:', err);
      }
    },
    [config],
  );

  const handleManualAutoSync = useCallback(async () => {
    try {
      await traktor.autoSync.start();
    } catch (err) {
      logger.error('Failed to trigger auto sync:', err);
    }
  }, []);

  const handleStopAutoSync = useCallback(() => {
    try {
      traktor.autoSync.stop();
    } catch (err) {
      logger.error('Failed to stop auto sync:', err);
    }
  }, []);

  const isLoading =
    syncState === 'loading' || syncState === 'previewing' || syncState === 'syncing' || syncState === 'exporting';

  return (
    <div className={styles.settingsContainer}>
      {/* NML File Selection */}
      <Stack
        gap='lg'
        mt='md'
      >
        <Setting.Element>
          <Setting.Description>Traktor Collection File</Setting.Description>
          <Setting.Action>
            <Stack gap='xs'>
              <Group>
                <Button
                  leftSection={<IconFolder size={16} />}
                  onClick={handleSelectNmlPath}
                  disabled={isLoading}
                >
                  Select collection.nml
                </Button>
                {config?.nmlPath && (
                  <Text
                    size='sm'
                    c='dimmed'
                    style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {config.nmlPath}
                  </Text>
                )}
              </Group>

              {/* NML Info */}
              {nmlInfo && (
                <Paper
                  p='sm'
                  withBorder
                  className={traktorStyles.infoPaper}
                >
                  <Group gap='lg'>
                    <Badge
                      color='blue'
                      variant='light'
                    >
                      {nmlInfo.trackCount} tracks
                    </Badge>
                    <Badge
                      color='green'
                      variant='light'
                    >
                      {nmlInfo.playlistCount} playlists
                    </Badge>
                    <Badge
                      color='violet'
                      variant='light'
                    >
                      {nmlInfo.folderCount} folders
                    </Badge>
                    <Badge
                      color='orange'
                      variant='light'
                    >
                      {nmlInfo.totalCuePoints} cue points
                    </Badge>
                    <Text
                      size='xs'
                      c='dimmed'
                    >
                      NML v{nmlInfo.version}
                    </Text>
                  </Group>
                </Paper>
              )}
            </Stack>
          </Setting.Action>
        </Setting.Element>

        <Divider my='md' />

        {/* Sync Settings */}
        <Setting.Element>
          <Setting.Description>Sync Strategy</Setting.Description>
          <Setting.Action>
            <Select
              value={config?.syncStrategy || 'smart_merge'}
              onChange={handleSyncStrategyChange}
              disabled={isLoading}
              data={[
                { value: 'smart_merge', label: 'Smart Merge (fill empty fields only)' },
                { value: 'traktor_wins', label: 'Traktor Wins (overwrite Harmony data)' },
                { value: 'harmony_wins', label: 'Harmony Wins (keep Harmony data)' },
              ]}
              style={{ width: 300 }}
            />
          </Setting.Action>
        </Setting.Element>

        <Setting.Element>
          <Setting.Description>Auto Backup</Setting.Description>
          <Setting.Action>
            <Switch
              checked={config?.autoBackup ?? true}
              onChange={e => handleAutoBackupChange(e.currentTarget.checked)}
              disabled={isLoading}
              label='Create backup before writing to NML'
            />
          </Setting.Action>
        </Setting.Element>

        <Divider my='md' />

        {/* Auto-Sync Settings */}
        <Setting.Element>
          <Setting.Description>Auto-Sync</Setting.Description>
          <Setting.Action>
            <Stack gap='sm'>
              <Switch
                checked={config?.autoSync?.enabled ?? false}
                onChange={e => handleAutoSyncEnabledChange(e.currentTarget.checked)}
                disabled={isLoading || !config?.nmlPath}
                label='Enable automatic synchronization with Traktor'
              />

              <Collapse in={config?.autoSync?.enabled ?? false}>
                <Stack
                  gap='sm'
                  mt='xs'
                >
                  <Select
                    label='Sync Direction'
                    value={config?.autoSync?.direction || 'import'}
                    onChange={handleAutoSyncDirectionChange}
                    disabled={isLoading}
                    data={[
                      { value: 'import', label: 'Import from Traktor' },
                      { value: 'export', label: 'Export to Traktor' },
                      { value: 'bidirectional', label: 'Bidirectional (Import + Export)' },
                    ]}
                    style={{ width: 300 }}
                  />

                  <Switch
                    checked={config?.autoSync?.onStartup ?? true}
                    onChange={e => handleAutoSyncOnStartupChange(e.currentTarget.checked)}
                    disabled={isLoading}
                    label='Sync on app startup'
                  />

                  <Switch
                    checked={config?.autoSync?.onLibraryChange ?? false}
                    onChange={e => handleAutoSyncOnLibraryChangeChange(e.currentTarget.checked)}
                    disabled={isLoading}
                    label='Sync when library changes'
                  />

                  {config?.autoSync?.onLibraryChange && (
                    <NumberInput
                      label='Debounce delay (ms)'
                      description='Wait time after library changes before syncing'
                      value={config?.autoSync?.debounceMs ?? 5000}
                      onChange={handleAutoSyncDebounceChange}
                      disabled={isLoading}
                      min={1000}
                      max={60000}
                      step={1000}
                      style={{ width: 200 }}
                    />
                  )}

                  {/* Auto-Sync Status & Manual Trigger */}
                  <Paper
                    p='sm'
                    withBorder
                    className={traktorStyles.infoPaper}
                  >
                    <Stack gap='xs'>
                      <Group justify='space-between'>
                        <Group gap='xs'>
                          <Text
                            size='sm'
                            fw={500}
                          >
                            Status:
                          </Text>
                          <Badge
                            color={autoSyncStatus?.isRunning ? 'blue' : autoSyncStatus?.lastError ? 'red' : 'gray'}
                            variant='light'
                          >
                            {autoSyncStatus?.isRunning ? 'Syncing...' : autoSyncStatus?.lastError ? 'Error' : 'Idle'}
                          </Badge>
                          {autoSyncStatus?.lastSyncTime && !autoSyncStatus.isRunning && (
                            <Text
                              size='xs'
                              c='dimmed'
                            >
                              Last sync: {new Date(autoSyncStatus.lastSyncTime).toLocaleTimeString()}
                            </Text>
                          )}
                        </Group>

                        <Group gap='xs'>
                          {autoSyncStatus?.isRunning ? (
                            <Button
                              size='xs'
                              variant='light'
                              color='red'
                              leftSection={<IconPlayerStop size={14} />}
                              onClick={handleStopAutoSync}
                            >
                              Stop
                            </Button>
                          ) : (
                            <Button
                              size='xs'
                              variant='light'
                              leftSection={<IconPlayerPlay size={14} />}
                              onClick={handleManualAutoSync}
                              disabled={!config?.nmlPath}
                            >
                              Sync Now
                            </Button>
                          )}
                        </Group>
                      </Group>

                      {/* Progress bar during sync */}
                      {autoSyncStatus?.isRunning && (
                        <>
                          <Text
                            size='xs'
                            c='dimmed'
                          >
                            {autoSyncStatus.message}
                          </Text>
                          <div
                            className={traktorStyles.progressBar}
                            style={{
                              width: '100%',
                              height: 6,
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${autoSyncStatus.progress}%`,
                                height: '100%',
                                backgroundColor: 'var(--mantine-color-blue-6)',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </>
                      )}

                      {/* Error message */}
                      {autoSyncStatus?.lastError && !autoSyncStatus.isRunning && (
                        <Text
                          size='xs'
                          c='red'
                        >
                          {autoSyncStatus.lastError}
                        </Text>
                      )}
                    </Stack>
                  </Paper>
                </Stack>
              </Collapse>
            </Stack>
          </Setting.Action>
        </Setting.Element>

        <Divider my='md' />

        {/* Sync Actions */}
        <Setting.Element>
          <Setting.Description>Import from Traktor</Setting.Description>
          <Setting.Action>
            <Stack gap='sm'>
              <Group>
                <Button
                  leftSection={<IconRefresh size={16} />}
                  onClick={handlePreviewSync}
                  disabled={!config?.nmlPath || isLoading}
                  variant='outline'
                >
                  Preview Sync
                </Button>
                <Button
                  leftSection={<IconDownload size={16} />}
                  onClick={handleExecuteSync}
                  disabled={!config?.nmlPath || isLoading}
                  color='blue'
                >
                  Sync from Traktor
                </Button>
              </Group>

              {/* Sync Preview */}
              {syncPlan && (
                <Paper
                  p='md'
                  withBorder
                  className={traktorStyles.infoPaper}
                >
                  <Stack gap='xs'>
                    <Text
                      size='sm'
                      fw={500}
                    >
                      Sync Preview
                    </Text>
                    <Group gap='lg'>
                      <Group gap='xs'>
                        <IconCheck
                          size={16}
                          color='var(--mantine-color-green-6)'
                        />
                        <Text size='sm'>{syncPlan.summary.totalMatched} tracks matched</Text>
                      </Group>
                      <Group gap='xs'>
                        <IconRefresh
                          size={16}
                          color='var(--mantine-color-blue-6)'
                        />
                        <Text size='sm'>{syncPlan.summary.tracksWithChanges} will be updated</Text>
                      </Group>
                      {syncPlan.summary.tracksToImport > 0 && (
                        <Group gap='xs'>
                          <IconDownload
                            size={16}
                            color='var(--mantine-color-teal-6)'
                          />
                          <Text size='sm'>{syncPlan.summary.tracksToImport} will be imported</Text>
                        </Group>
                      )}
                    </Group>
                  </Stack>
                </Paper>
              )}

              {/* Progress */}
              {isLoading && progress && (
                <Paper
                  p='md'
                  withBorder
                  className={traktorStyles.infoPaper}
                >
                  <Stack gap='xs'>
                    <Text size='sm'>{progress.message}</Text>
                    <div
                      className={traktorStyles.progressBar}
                      style={{
                        width: '100%',
                        height: 8,
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${progress.progress}%`,
                          height: '100%',
                          backgroundColor: 'var(--mantine-color-blue-6)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Setting.Action>
        </Setting.Element>

        <Setting.Element>
          <Setting.Description>Export to Traktor</Setting.Description>
          <Setting.Action>
            <Button
              leftSection={<IconUpload size={16} />}
              onClick={handleExportToNml}
              disabled={!config?.nmlPath || isLoading}
              color='green'
            >
              Export to Traktor
            </Button>
          </Setting.Action>
        </Setting.Element>

        {/* Status Messages */}
        {error && (
          <Setting.Element>
            <Paper
              p='sm'
              withBorder
              className={traktorStyles.errorPaper}
            >
              <Text
                size='sm'
                c='red'
              >
                {error}
              </Text>
            </Paper>
          </Setting.Element>
        )}

        {lastSyncResult && syncState === 'complete' && (
          <Setting.Element>
            <Paper
              p='sm'
              withBorder
              className={traktorStyles.successPaper}
            >
              <Group gap='xs'>
                <IconCheck
                  size={16}
                  color='green'
                />
                <Text
                  size='sm'
                  c='green'
                >
                  {lastSyncResult}
                </Text>
              </Group>
            </Paper>
          </Setting.Element>
        )}
      </Stack>
    </div>
  );
}
