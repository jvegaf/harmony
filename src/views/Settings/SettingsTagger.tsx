import { useCallback, useEffect, useState } from 'react';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ActionIcon, Badge, NumberInput, Stack, Switch, Text, Tooltip } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';

import { TaggerProviderConfig } from '@/types/tagger';
import * as Setting from '../../components/Setting/Setting';
import styles from './Settings.module.css';
import { config } from '@/lib/tauri-api';

// AIDEV-NOTE: Display badge colours per provider for quick visual identification
const PROVIDER_COLORS: Record<string, string> = {
  beatport: 'green',
  traxsource: 'blue',
  bandcamp: 'cyan',
};

interface SortableProviderCardProps {
  providerConfig: TaggerProviderConfig;
  isLast: boolean;
  onToggle: (name: string, enabled: boolean) => void;
  onMaxResultsChange: (name: string, value: number) => void;
}

function SortableProviderCard({ providerConfig, isLast, onToggle, onMaxResultsChange }: SortableProviderCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: providerConfig.name,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '6px',
          background: 'var(--mantine-color-dark-6)',
          border: '1px solid var(--mantine-color-dark-4)',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* Drag handle */}
        <Tooltip
          label='Drag to reorder priority'
          withArrow
        >
          <ActionIcon
            variant='subtle'
            color='gray'
            style={{ cursor: 'grab', touchAction: 'none' }}
            {...attributes}
            {...listeners}
          >
            <IconGripVertical size={16} />
          </ActionIcon>
        </Tooltip>

        {/* Provider name & badge */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text
              size='sm'
              fw={500}
            >
              {providerConfig.displayName}
            </Text>
            <Badge
              size='xs'
              color={PROVIDER_COLORS[providerConfig.name] ?? 'gray'}
            >
              {providerConfig.name}
            </Badge>
          </div>
        </div>

        {/* Max results */}
        <NumberInput
          label='Max results'
          value={providerConfig.maxResults}
          min={1}
          max={50}
          step={1}
          size='xs'
          style={{ width: '120px' }}
          disabled={!providerConfig.enabled}
          onChange={value => {
            if (typeof value === 'number') onMaxResultsChange(providerConfig.name, value);
          }}
        />

        {/* Enable toggle — prevent disabling last active provider */}
        <Tooltip
          label={isLast ? 'At least one provider must remain enabled' : undefined}
          withArrow
          disabled={!isLast}
        >
          <Switch
            checked={providerConfig.enabled}
            disabled={isLast && providerConfig.enabled}
            onChange={e => onToggle(providerConfig.name, e.currentTarget.checked)}
          />
        </Tooltip>
      </div>
    </div>
  );
}

/**
 * Settings panel for configuring tag candidate search providers.
 *
 * Allows the user to:
 * - Enable / disable individual providers (Beatport, Traxsource, Bandcamp)
 * - Drag providers to reorder search priority (top = highest priority for tie-breaking)
 * - Set max results per provider
 *
 * Changes are persisted immediately via config.set('taggerConfig', ...).
 * The main process (IPCTaggerModule) listens for CONFIG_SET and re-initializes workers.
 */
export default function SettingsTagger() {
  const [providers, setProviders] = useState<TaggerProviderConfig[]>([]);

  // Load config on mount
  useEffect(() => {
    const load = async () => {
      const taggerConfig = await config.get('taggerConfig');
      if (taggerConfig?.providers?.length) {
        setProviders(taggerConfig.providers);
      }
    };
    load();
  }, []);

  const saveProviders = useCallback((updated: TaggerProviderConfig[]) => {
    setProviders(updated);
    config.set('taggerConfig', { providers: updated });
  }, []);

  const handleToggle = useCallback(
    (name: string, enabled: boolean) => {
      saveProviders(providers.map(p => (p.name === name ? { ...p, enabled } : p)));
    },
    [providers, saveProviders],
  );

  const handleMaxResultsChange = useCallback(
    (name: string, value: number) => {
      saveProviders(providers.map(p => (p.name === name ? { ...p, maxResults: value } : p)));
    },
    [providers, saveProviders],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = providers.findIndex(p => p.name === active.id);
        const newIndex = providers.findIndex(p => p.name === over.id);
        saveProviders(arrayMove(providers, oldIndex, newIndex));
      }
    },
    [providers, saveProviders],
  );

  const enabledCount = providers.filter(p => p.enabled).length;

  return (
    <div className={styles.settingsContainer}>
      <Setting.Section>
        <Setting.Description>Search Providers</Setting.Description>
      </Setting.Section>

      <Text
        size='xs'
        c='dimmed'
        mb='md'
      >
        Configure which providers are used to search for tag candidates. Drag to reorder — the top provider has the
        highest priority when candidates have equal scores. At least one provider must remain enabled.
      </Text>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={providers.map(p => p.name)}
          strategy={verticalListSortingStrategy}
        >
          <Stack gap='xs'>
            {providers.map(providerConfig => (
              <SortableProviderCard
                key={providerConfig.name}
                providerConfig={providerConfig}
                isLast={enabledCount === 1 && providerConfig.enabled}
                onToggle={handleToggle}
                onMaxResultsChange={handleMaxResultsChange}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {enabledCount === 0 && (
        <Text
          c='red'
          size='xs'
          mt='sm'
        >
          Warning: no providers enabled. Tag candidate search will return no results.
        </Text>
      )}

      <Setting.Section>
        <Setting.Description>Priority Order</Setting.Description>
      </Setting.Section>

      <Text
        size='xs'
        c='dimmed'
      >
        When two candidates from different providers score within 1% of each other, the provider higher in the list wins
        the tie. Drag the cards above to set your preferred order.
      </Text>
    </div>
  );
}
