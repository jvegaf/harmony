import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import * as Setting from '../../components/Setting/Setting';
import { ActionIcon, Button, Group, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { SearchEngineConfig } from '@/types/harmony';

import styles from './Settings.module.css';
import { config, shell } from '@/lib/tauri-api';

/**
 * Settings panel for managing custom search engines.
 *
 * Search engines are persisted via electron-store and used in ContextMenuModule
 * for the track context menu "Search" submenu.
 */
export default function SettingsGeneral() {
  const [searchEngines, setSearchEngines] = useState<SearchEngineConfig[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load search engines from config on mount
  useEffect(() => {
    const loadEngines = async () => {
      const engines = await config.get('searchEngines');
      if (engines) {
        setSearchEngines(engines);
      }
    };
    loadEngines();
  }, []);

  // Save search engines to config
  const saveEngines = useCallback(async (engines: SearchEngineConfig[]) => {
    await config.set('searchEngines', engines);
    setSearchEngines(engines);
  }, []);

  // Validate a search engine
  const validateEngine = useCallback((engine: SearchEngineConfig): string | null => {
    if (!engine.name.trim()) {
      return 'Name is required';
    }
    if (!engine.urlTemplate.trim()) {
      return 'URL is required';
    }
    if (!engine.urlTemplate.includes('{query}')) {
      return 'URL must contain {query} placeholder';
    }
    try {
      // Basic URL validation - replace placeholder to test
      new URL(engine.urlTemplate.replace('{query}', 'test'));
    } catch {
      return 'Invalid URL format';
    }
    return null;
  }, []);

  // Update a search engine field
  const updateEngine = useCallback(
    (id: string, field: keyof Pick<SearchEngineConfig, 'name' | 'urlTemplate'>, value: string) => {
      const updatedEngines = searchEngines.map(engine => (engine.id === id ? { ...engine, [field]: value } : engine));

      // Validate the updated engine
      const updatedEngine = updatedEngines.find(e => e.id === id);
      if (updatedEngine) {
        const error = validateEngine(updatedEngine);
        setErrors(prev => ({ ...prev, [id]: error || '' }));
      }

      setSearchEngines(updatedEngines);
    },
    [searchEngines, validateEngine],
  );

  // Save on blur if valid
  const handleBlur = useCallback(
    (id: string) => {
      const engine = searchEngines.find(e => e.id === id);
      if (engine && !validateEngine(engine)) {
        saveEngines(searchEngines);
      }
    },
    [searchEngines, validateEngine, saveEngines],
  );

  // Add a new custom search engine
  const addEngine = useCallback(() => {
    const newEngine: SearchEngineConfig = {
      id: uuidv4(),
      name: '',
      urlTemplate: '',
      isDefault: false,
    };
    setSearchEngines(prev => [...prev, newEngine]);
  }, []);

  // Remove a custom search engine
  const removeEngine = useCallback(
    (id: string) => {
      const engine = searchEngines.find(e => e.id === id);
      if (engine?.isDefault) {
        return; // Cannot remove default engines
      }
      const filtered = searchEngines.filter(e => e.id !== id);
      saveEngines(filtered);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    },
    [searchEngines, saveEngines],
  );

  // AIDEV-NOTE: Handler to open config folder using shell.openPath
  const handleOpenConfigFolder = useCallback(() => {
    shell.openUserDataDirectory();
  }, []);

  return (
    <div className={styles.settingsContainer}>
      <Setting.Section>
        <Setting.Description>Configuration Folder</Setting.Description>
        <Setting.Action>
          <Button onClick={handleOpenConfigFolder}>Open Config Folder</Button>
        </Setting.Action>
      </Setting.Section>

      <Setting.Section>
        <Setting.Description>Search Engines</Setting.Description>
        <Setting.Action>
          <Tooltip label='Add custom search engine'>
            <ActionIcon
              variant='light'
              onClick={addEngine}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        </Setting.Action>
      </Setting.Section>

      <Stack
        gap='sm'
        mt='md'
      >
        <Text
          size='xs'
          c='dimmed'
        >
          Use {'{query}'} in the URL where the search term should be inserted.
        </Text>

        {searchEngines.map(engine => (
          <Group
            key={engine.id}
            gap='sm'
            align='flex-start'
            wrap='nowrap'
          >
            <TextInput
              placeholder='Name'
              value={engine.name}
              onChange={e => updateEngine(engine.id, 'name', e.currentTarget.value)}
              onBlur={() => handleBlur(engine.id)}
              style={{ flex: '0 0 150px' }}
              error={errors[engine.id] && errors[engine.id].includes('Name') ? errors[engine.id] : undefined}
            />
            <TextInput
              placeholder='URL with {query}'
              value={engine.urlTemplate}
              onChange={e => updateEngine(engine.id, 'urlTemplate', e.currentTarget.value)}
              onBlur={() => handleBlur(engine.id)}
              style={{ flex: 1 }}
              error={errors[engine.id] && !errors[engine.id].includes('Name') ? errors[engine.id] : undefined}
            />
            <Tooltip label={engine.isDefault ? 'Default engines cannot be removed' : 'Remove search engine'}>
              <ActionIcon
                variant='subtle'
                color={engine.isDefault ? 'gray' : 'red'}
                disabled={engine.isDefault}
                onClick={() => removeEngine(engine.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ))}

        {searchEngines.length === 0 && (
          <Text
            size='sm'
            c='dimmed'
          >
            No search engines configured.
          </Text>
        )}
      </Stack>
    </div>
  );
}
