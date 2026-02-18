import { useEffect, useState } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';

import * as Setting from '../../components/Setting/Setting';
import { SegmentedControl } from '@mantine/core';

import styles from './Settings.module.css';

const { config } = window.Main;

/**
 * Settings panel for UI appearance (theme selection).
 * 
 * Theme preference is persisted via electron-store and applied on app startup.
 * The 'auto' option follows system color scheme preference via prefers-color-scheme media query.
 */
export default function SettingsUI() {
  const { setColorScheme } = useMantineColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');

  // Load theme from config on mount
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await config.get('theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
    };
    loadTheme();
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
    <div className={styles.settingsContainer}>
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
    </div>
  );
}
