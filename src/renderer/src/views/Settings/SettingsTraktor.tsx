/**
 * Traktor Integration Settings
 *
 * AIDEV-NOTE: Settings panel for configuring Traktor NML sync.
 * Allows users to:
 * - Select collection.nml file path
 * - Configure sync strategy
 * - Preview and execute sync operations
 * - Export changes back to Traktor
 */

import { useCallback, useEffect, useState } from 'react';
import { Button, Select, Switch, Text, Badge, Group, Stack, Paper, Divider } from '@mantine/core';
import { IconRefresh, IconUpload, IconDownload, IconFolder, IconCheck } from '@tabler/icons-react';

import * as Setting from '../../components/Setting/Setting';
import styles from './Settings.module.css';
import type {
  TraktorConfig,
  TraktorNMLInfo,
  TraktorSyncProgress,
  TraktorSyncPlan,
} from '../../../../preload/types/traktor';

const { traktor, logger } = window.Main;

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

    return () => {
      unsubscribe();
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
    try {
      setSyncState('syncing');
      setError(null);
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

      // Refresh NML info
      if (config?.nmlPath) {
        await loadNmlInfo(config.nmlPath);
      }
    } catch (err) {
      logger.error('Sync failed:', err);
      setError('Sync failed');
      setSyncState('error');
    }
  }, [config, loadNmlInfo]);

  const handleExportToNml = useCallback(async () => {
    try {
      setSyncState('exporting');
      setError(null);
      await traktor.exportToNml();
      setLastSyncResult('Exported changes to Traktor');
      setSyncState('complete');
    } catch (err) {
      logger.error('Export failed:', err);
      setError('Export failed');
      setSyncState('error');
    }
  }, []);

  const isLoading =
    syncState === 'loading' || syncState === 'previewing' || syncState === 'syncing' || syncState === 'exporting';

  return (
    <div className={styles.settingsContainer}>
      {/* NML File Selection */}
      <Setting.Section>
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
                style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
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
      </Setting.Section>

      <Divider my='md' />

      {/* Sync Settings */}
      <Setting.Section>
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
      </Setting.Section>

      <Setting.Section>
        <Setting.Description>Auto Backup</Setting.Description>
        <Setting.Action>
          <Switch
            checked={config?.autoBackup ?? true}
            onChange={e => handleAutoBackupChange(e.currentTarget.checked)}
            disabled={isLoading}
            label='Create backup before writing to NML'
          />
        </Setting.Action>
      </Setting.Section>

      <Divider my='md' />

      {/* Sync Actions */}
      <Setting.Section>
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
                style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
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
                style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                <Stack gap='xs'>
                  <Text size='sm'>{progress.message}</Text>
                  <div
                    style={{
                      width: '100%',
                      height: 8,
                      backgroundColor: 'rgba(255,255,255,0.1)',
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
      </Setting.Section>

      <Setting.Section>
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
      </Setting.Section>

      {/* Status Messages */}
      {error && (
        <Setting.Section>
          <Paper
            p='sm'
            withBorder
            style={{ backgroundColor: 'rgba(255,0,0,0.1)', borderColor: 'rgba(255,0,0,0.3)' }}
          >
            <Text
              size='sm'
              c='red'
            >
              {error}
            </Text>
          </Paper>
        </Setting.Section>
      )}

      {lastSyncResult && syncState === 'complete' && (
        <Setting.Section>
          <Paper
            p='sm'
            withBorder
            style={{ backgroundColor: 'rgba(0,255,0,0.1)', borderColor: 'rgba(0,255,0,0.3)' }}
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
        </Setting.Section>
      )}
    </div>
  );
}
