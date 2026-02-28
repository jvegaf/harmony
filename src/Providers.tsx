import { ColorSchemeScript, MantineProvider, MantineColorScheme, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { useEffect, useState } from 'react';
import { config } from '@/lib/tauri-api';

export default function Providers({ children }: any) {
  const [colorScheme, setColorScheme] = useState<MantineColorScheme>('auto');

  // Load theme preference from config
  useEffect(() => {
    const loadTheme = async () => {
      const theme = await config.get('theme');
      setColorScheme(theme);
    };
    loadTheme();
  }, []);

  // override theme for Mantine (default props and styles)
  // https://mantine.dev/theming/mantine-provider/

  const theme = createTheme({
    // Using Spline Sans as the primary font
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    // added source-code-pro and SFMono-Regular
    fontFamilyMonospace:
      'source-code-pro, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
    primaryColor: 'orange',
    colors: {
      orange: [
        '#fff4e6',
        '#ffe8cc',
        '#ffd8a8',
        '#ffc078',
        '#ffa94d',
        '#fa8905',
        '#f76707',
        '#e8590c',
        '#d9480f',
        '#c92a2a',
      ],
      dark: [
        '#C1C2C5',
        '#A6A7AB',
        '#909296',
        '#5c5f66',
        '#373A40',
        '#2C2E33',
        '#25262b',
        '#1A1B1E',
        '#141517',
        '#101113',
      ],
    },
    components: {
      Button: {
        defaultProps: { radius: 'sm' },
        styles: {
          root: {
            backgroundColor: 'var(--hm-bg-button)',
            '&:hover': {
              backgroundColor: 'var(--hm-bg-hover)',
            },
          },
        },
      },
      Checkbox: {
        styles: {
          input: {
            cursor: 'pointer',
            backgroundColor: 'transparent',
            borderColor: 'var(--hm-border)',
          },
          label: { cursor: 'pointer' },
        },
      },
      TextInput: {
        styles: {
          label: { fontSize: '0.7rem', color: 'var(--hm-text-muted)', marginTop: '0.5rem' },
          input: {
            backgroundColor: 'var(--hm-bg-input)',
            borderColor: 'var(--hm-border)',
            color: 'var(--hm-text)',
            '&:focus': {
              borderColor: 'var(--hm-primary)',
            },
          },
        },
      },
      Textarea: {
        styles: {
          label: { fontSize: '0.8rem', color: 'var(--hm-text-muted)', marginTop: '0.5rem' },
          input: {
            backgroundColor: 'var(--hm-bg-input)',
            borderColor: 'var(--hm-border)',
            color: 'var(--hm-text)',
          },
        },
      },
      Autocomplete: { styles: { wrapper: { width: '500px' } } },
      Select: {
        styles: {
          label: { marginTop: '0.5rem' },
          input: {
            backgroundColor: 'var(--hm-bg-input)',
            borderColor: 'var(--hm-border)',
            color: 'var(--hm-text)',
          },
        },
      },
      Loader: { defaultProps: { size: 'xl', color: 'orange' } },
      Space: { defaultProps: { h: 'sm' } },
      Anchor: { defaultProps: { target: '_blank' } },
      Burger: { styles: { burger: { color: 'var(--hm-text-secondary)' } } },
      Table: {
        styles: {
          td: { padding: '0.6rem' },
          th: { padding: '0.5rem', backgroundColor: 'var(--hm-bg-elevated)' },
        },
      },
      Tabs: {
        styles: {
          tab: {
            '&[dataActive]': {
              backgroundColor: 'var(--hm-primary)',
              color: 'white',
            },
          },
        },
      },
      Modal: {
        styles: {
          title: { fontSize: '1.25rem', fontWeight: 600 },
        },
      },
      ActionIcon: {
        styles: {
          root: {
            color: 'var(--hm-text-secondary)',
            '&:hover': {
              backgroundColor: 'var(--hm-bg-hover)',
            },
          },
        },
      },
    },
  });

  return (
    <>
      <ColorSchemeScript defaultColorScheme={colorScheme} />
      <MantineProvider
        defaultColorScheme={colorScheme}
        theme={theme}
        withCssVariables
      >
        <ModalsProvider
          modalProps={{
            centered: true,
          }}
        >
          <Notifications />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </>
  );
}
