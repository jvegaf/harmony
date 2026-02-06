import { useCallback, useEffect, useState } from 'react';

import * as Setting from '../../components/Setting/Setting';
import { Button, Checkbox, Slider, Stack, Text } from '@mantine/core';

import styles from './Settings.module.css';

const { config, duplicates } = window.Main;

/**
 * Settings panel for configuring duplicate finder detection criteria.
 * AIDEV-NOTE: Duplicate finder uses these settings when scanning the library.
 * Individual criteria (title, artist, duration) can be enabled/disabled.
 * ALL enabled criteria must match for tracks to be considered duplicates.
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

  // Check if at least one criteria is enabled
  const hasAnyCriteria = criteria.title || criteria.artist || criteria.duration;

  const handleInvalidateCache = useCallback(() => duplicates.invalidateCache(), [duplicates]);

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
          Select which criteria to use when scanning for duplicate tracks. ALL enabled criteria must match for tracks to
          be considered duplicates.
        </Text>

        {/* Title */}
        <Checkbox
          label='Title'
          description='Compare normalized track titles using fuzzy matching'
          checked={criteria.title}
          onChange={e => handleCriteriaChange('title', e.currentTarget.checked)}
        />

        {/* Artist */}
        <Checkbox
          label='Artist'
          description='Compare normalized artist names using fuzzy matching'
          checked={criteria.artist}
          onChange={e => handleCriteriaChange('artist', e.currentTarget.checked)}
        />

        {/* Duration */}
        <Checkbox
          label='Duration'
          description='Compare track duration within the tolerance below'
          checked={criteria.duration}
          onChange={e => handleCriteriaChange('duration', e.currentTarget.checked)}
        />

        {!hasAnyCriteria && (
          <Text
            size='xs'
            c='red'
          >
            Warning: No criteria selected. Enable at least one criterion to find duplicates.
          </Text>
        )}
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
