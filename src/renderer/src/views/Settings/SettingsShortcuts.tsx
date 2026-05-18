import { Alert, Button, Divider, Group, ScrollArea, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconDeviceFloppy, IconInfoCircle, IconRestore } from '@tabler/icons-react';
import type React from 'react';
import { useState } from 'react';

import type { Config, ShortcutsConfig } from '../../../../preload/types/harmony';
import { formatShortcutDisplay, parseKeyEvent } from '../../lib/utils-keyboard';

const { config, logger } = window.Main;

// Fallback defaults in case we need to restore
const DEFAULT_SHORTCUTS: ShortcutsConfig = {
  global: {
    playPause: ' ',
    openSettings: 'ctrl+,',
    focusSearch: 'ctrl+k',
    seekBackward: 'arrowleft',
    seekForward: 'arrowright',
    previousTrack: 'a',
    nextTrack: 'd',
  },
  tracklist: {
    rate0: '0',
    rate1: '1',
    rate2: '2',
    rate3: '3',
    rate4: '4',
    rate5: '5',
    showDetails: 'i',
    addToPreparation: 'p',
  },
};

interface SettingsShortcutsProps {
  appConfig: Config;
}

export default function SettingsShortcuts({ appConfig }: SettingsShortcutsProps) {
  const [shortcuts, setShortcuts] = useState<ShortcutsConfig>(appConfig.shortcuts || DEFAULT_SHORTCUTS);
  const [listeningFor, setListeningFor] = useState<{ category: 'global' | 'tracklist'; action: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const saveShortcuts = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await config.set('shortcuts', shortcuts);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      logger.error('Failed to save shortcuts', e);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!listeningFor) return;

    e.preventDefault();
    e.stopPropagation();

    const shortcutStr = parseKeyEvent(e);

    // Ignore modifier-only key presses
    if (['ctrl', 'alt', 'shift', 'meta'].includes(shortcutStr)) return;

    // Pressing Escape specifically cancels the listening mode unless it's the intended shortcut
    // We'll allow Escape to be a shortcut, but if they want to cancel they should click outside.
    // Actually, letting Escape cancel is a better UX. Let's make Escape cancel if it's pressed alone.
    if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      setListeningFor(null);
      return;
    }

    setShortcuts(prev => ({
      ...prev,
      [listeningFor.category]: {
        ...prev[listeningFor.category],
        [listeningFor.action]: shortcutStr,
      },
    }));

    setListeningFor(null);
  };

  // Helper to handle blur event (clicking away cancels listening mode)
  const handleBlur = () => {
    if (listeningFor) {
      setListeningFor(null);
    }
  };

  const renderShortcutRow = (category: 'global' | 'tracklist', action: string, description: string) => {
    const isListening = listeningFor?.category === category && listeningFor?.action === action;
    const currentShortcut = shortcuts[category][action as keyof (typeof shortcuts)[typeof category]];

    return (
      <Group
        justify='space-between'
        align='center'
        mb='sm'
        key={`${category}-${action}`}
      >
        <Text size='sm'>{description}</Text>
        <Group>
          {isListening ? (
            <Button
              size='xs'
              variant='light'
              color='red'
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              autoFocus
              w={150}
            >
              Press keys...
            </Button>
          ) : (
            <Tooltip label='Click to reassign'>
              <Button
                variant='default'
                size='xs'
                w={150}
                onClick={() => setListeningFor({ category, action })}
              >
                {formatShortcutDisplay(currentShortcut)}
              </Button>
            </Tooltip>
          )}
        </Group>
      </Group>
    );
  };

  return (
    <ScrollArea
      h='100%'
      offsetScrollbars
    >
      <Stack
        gap='lg'
        p='md'
      >
        <div>
          <Title
            order={4}
            mb='xs'
          >
            Global Shortcuts
          </Title>
          <Text
            size='sm'
            c='dimmed'
            mb='md'
          >
            These shortcuts work anywhere in the application.
          </Text>
          {renderShortcutRow('global', 'playPause', 'Play / Pause')}
          {renderShortcutRow('global', 'previousTrack', 'Previous Track')}
          {renderShortcutRow('global', 'nextTrack', 'Next Track')}
          {renderShortcutRow('global', 'seekBackward', 'Seek Backward')}
          {renderShortcutRow('global', 'seekForward', 'Seek Forward')}
          {renderShortcutRow('global', 'openSettings', 'Open Settings')}
          {renderShortcutRow('global', 'focusSearch', 'Focus Search Bar')}
        </div>

        <Divider />

        <div>
          <Title
            order={4}
            mb='xs'
          >
            Tracklist Shortcuts
          </Title>
          <Text
            size='sm'
            c='dimmed'
            mb='md'
          >
            These shortcuts require a track to be focused in the library or playlist view.
          </Text>
          {renderShortcutRow('tracklist', 'showDetails', 'Show Track Details')}
          {renderShortcutRow('tracklist', 'addToPreparation', 'Add to Preparation')}
          {renderShortcutRow('tracklist', 'rate5', 'Rate 5 Stars')}
          {renderShortcutRow('tracklist', 'rate4', 'Rate 4 Stars')}
          {renderShortcutRow('tracklist', 'rate3', 'Rate 3 Stars')}
          {renderShortcutRow('tracklist', 'rate2', 'Rate 2 Stars')}
          {renderShortcutRow('tracklist', 'rate1', 'Rate 1 Star')}
          {renderShortcutRow('tracklist', 'rate0', 'Remove Rating (0 Stars)')}
        </div>

        <Divider />

        <Group justify='space-between'>
          <Button
            variant='subtle'
            color='red'
            leftSection={<IconRestore size={16} />}
            onClick={resetToDefault}
          >
            Restore Defaults
          </Button>

          <Group>
            {saveSuccess && (
              <Text
                size='sm'
                c='green'
              >
                Saved successfully
              </Text>
            )}
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={saveShortcuts}
              loading={isSaving}
            >
              Save Shortcuts
            </Button>
          </Group>
        </Group>

        <Alert
          icon={<IconInfoCircle size={16} />}
          title='Requires Reload'
          color='blue'
          variant='light'
        >
          Some global shortcuts may require a full app reload to take effect properly.
        </Alert>
      </Stack>
    </ScrollArea>
  );
}
