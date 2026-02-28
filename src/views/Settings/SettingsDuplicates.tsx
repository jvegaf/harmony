import { useCallback, useEffect, useState } from 'react';

import * as Setting from '../../components/Setting/Setting';
import { Button, Checkbox, Slider, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import styles from './Settings.module.css';
import { config, duplicates } from '@/lib/tauri-api';

/**
 * Settings panel for configuring duplicate finder detection criteria.
 *
 * Duplicate finder uses HIERARCHICAL logic:
 * - Title AND Artist are ALWAYS required (mandatory matching)
 * - Duration is OPTIONAL (additional filter to refine results)
 */
export default function SettingsDuplicates() {
  const [criteria, setCriteria] = useState({
    title: true,
    artist: true,
    duration: true,
  });
  const [durationTolerance, setDurationTolerance] = useState(2);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.85);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      const dupConfig = await config.get('duplicateFinderConfig');
      if (dupConfig) {
        setCriteria(dupConfig.criteria);
        setDurationTolerance(dupConfig.durationToleranceSeconds);
        setSimilarityThreshold(dupConfig.similarityThreshold);
      }
    };
    loadConfig();
  }, []);

  // Save on criteria change
  const handleCriteriaChange = useCallback(
    (key: keyof typeof criteria, value: boolean) => {
      const newCriteria = { ...criteria, [key]: value };
      setCriteria(newCriteria);
      config.set('duplicateFinderConfig', {
        criteria: newCriteria,
        durationToleranceSeconds: durationTolerance,
        similarityThreshold,
      });
    },
    [criteria, durationTolerance, similarityThreshold],
  );

  // Save on slider change end
  const handleDurationToleranceChange = useCallback((value: number) => {
    setDurationTolerance(value);
  }, []);

  const handleDurationToleranceChangeEnd = useCallback(
    (value: number) => {
      config.set('duplicateFinderConfig', {
        criteria,
        durationToleranceSeconds: value,
        similarityThreshold,
      });
    },
    [criteria, similarityThreshold],
  );

  const handleSimilarityChange = useCallback((value: number) => {
    setSimilarityThreshold(value);
  }, []);

  const handleSimilarityChangeEnd = useCallback(
    (value: number) => {
      config.set('duplicateFinderConfig', {
        criteria,
        durationToleranceSeconds: durationTolerance,
        similarityThreshold: value,
      });
    },
    [criteria, durationTolerance],
  );

  const handleInvalidateCache = useCallback(async () => {
    try {
      await duplicates.invalidateCache();
      notifications.show({
        title: 'Cache Reset',
        message: 'Duplicate finder cache has been successfully cleared',
        color: 'green',
        autoClose: 3000,
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to reset duplicate finder cache',
        color: 'red',
        autoClose: 5000,
      });
    }
  }, []);

  return (
    <div className={styles.settingsContainer}>
      <Setting.Section>
        <Setting.Description>Detection Criteria</Setting.Description>
      </Setting.Section>

      <Stack
        gap='md'
        mt='xs'
      >
        <Text
          size='xs'
          c='dimmed'
        >
          Harmony uses hierarchical duplicate detection. Title and artist must always match. Duration is an optional
          additional filter.
        </Text>

        {/* Mandatory Criteria - Display Only */}
        <div>
          <Text
            size='sm'
            fw={500}
            mb='xs'
          >
            Mandatory Criteria (Always Active)
          </Text>
          <Stack
            gap='xs'
            pl='md'
          >
            <Text
              size='sm'
              c='dimmed'
            >
              ✓ Title - Fuzzy matching of normalized track titles
            </Text>
            <Text
              size='sm'
              c='dimmed'
            >
              ✓ Artist - Fuzzy matching of normalized artist names
            </Text>
          </Stack>
        </div>

        {/* Optional Criteria - Duration */}
        <div>
          <Text
            size='sm'
            fw={500}
            mb='xs'
          >
            Optional Criteria
          </Text>
          <Checkbox
            label='Duration'
            description='Also require similar duration within the tolerance below'
            checked={criteria.duration}
            onChange={e => handleCriteriaChange('duration', e.currentTarget.checked)}
          />
        </div>
      </Stack>

      <Setting.Section>
        <Setting.Description>Detection Parameters</Setting.Description>
      </Setting.Section>

      <Stack
        gap='lg'
        mt='xs'
      >
        {/* Duration Tolerance Slider */}
        <div>
          <Text
            size='sm'
            mb='xs'
          >
            Duration tolerance: ±{durationTolerance} seconds
          </Text>
          <Slider
            value={durationTolerance}
            onChange={handleDurationToleranceChange}
            onChangeEnd={handleDurationToleranceChangeEnd}
            min={1}
            max={10}
            step={1}
            marks={[
              { value: 1, label: '1s' },
              { value: 5, label: '5s' },
              { value: 10, label: '10s' },
            ]}
            disabled={!criteria.duration}
          />
          <Text
            size='xs'
            c='dimmed'
            mt='xl'
          >
            Tracks with duration difference within this tolerance are considered matching.
          </Text>
        </div>

        {/* Similarity Threshold Slider */}
        <div>
          <Text
            size='sm'
            mb='xs'
          >
            Similarity threshold: {Math.round(similarityThreshold * 100)}%
          </Text>
          <Slider
            value={similarityThreshold}
            onChange={handleSimilarityChange}
            onChangeEnd={handleSimilarityChangeEnd}
            min={0.5}
            max={1}
            step={0.05}
            marks={[
              { value: 0.5, label: '50%' },
              { value: 0.75, label: '75%' },
              { value: 1, label: '100%' },
            ]}
            disabled={!criteria.title && !criteria.artist}
          />
          <Text
            size='xs'
            c='dimmed'
            mt='xl'
          >
            Higher values require more exact matches for title/artist. Lower values find more potential duplicates.
          </Text>
        </div>
      </Stack>

      <Setting.Section>
        <Setting.Action>
          <Text
            size='sm'
            mb='xs'
          >
            Invalidate Cache
          </Text>
          <Button
            onClick={handleInvalidateCache}
            variant='filled'
            color='red'
          >
            Reset Duplicate Finder Cache
          </Button>
        </Setting.Action>
      </Setting.Section>
    </div>
  );
}
