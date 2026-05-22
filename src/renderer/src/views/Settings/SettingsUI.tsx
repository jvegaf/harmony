import { useEffect, useState } from 'react';
import { useMantineColorScheme, SegmentedControl, ScrollArea, Stack } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';

import * as Setting from '../../components/Setting/Setting';

import styles from './Settings.module.css';

const { config } = window.Main;

/**
 * Settings panel for UI appearance (theme selection).
 *
 * Preferences are persisted via electron-store and applied on app startup/navigation.
 */
export default function SettingsUI() {
  const { setColorScheme } = useMantineColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      const savedTheme = await config.get('theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
    };
    loadConfig();
  }, []);

  // Handle theme change
  const handleThemeChange = async (value: string) => {
    const newTheme = value as 'light' | 'dark' | 'auto';

    // Update Mantine color scheme
    setColorScheme(newTheme);

    // Persist to config
    await config.set('theme', newTheme);

    // Update local state
    setTheme(newTheme);
  };

  return (
    <ScrollArea
      h='100%'
      offsetScrollbars
      className={styles.settingsContainer}
    >
      <Stack gap='xl'>
        <Setting.Section>
          <Setting.Description>Theme</Setting.Description>
          <Setting.Action>
            <SegmentedControl
              value={theme}
              onChange={handleThemeChange}
              data={[
                {
                  value: 'light',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <IconSun size={16} />
                      <span>Light</span>
                    </div>
                  ),
                },
                {
                  value: 'dark',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <IconMoon size={16} />
                      <span>Dark</span>
                    </div>
                  ),
                },
                {
                  value: 'auto',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <IconDeviceDesktop size={16} />
                      <span>Auto</span>
                    </div>
                  ),
                },
              ]}
            />
          </Setting.Action>
        </Setting.Section>
      </Stack>
    </ScrollArea>
  );
}
