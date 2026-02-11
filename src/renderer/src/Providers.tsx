import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

export default function Providers({ children }: any) {
  // long tasks should use useState(true)

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
            backgroundColor: 'var(--button-bg)',
            '&:hover': {
              backgroundColor: 'var(--second-hover-dark)',
            },
          },
        },
      },
      Checkbox: {
        styles: {
          input: {
            cursor: 'pointer',
            backgroundColor: 'transparent',
            borderColor: 'var(--border-color)',
          },
          label: { cursor: 'pointer' },
        },
      },
      TextInput: {
        styles: {
          label: { fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' },
          input: {
            backgroundColor: 'rgba(31, 41, 55, 0.6)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            '&:focus': {
              borderColor: 'var(--primary-color)',
            },
          },
        },
      },
      Textarea: {
        styles: {
          label: { fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' },
          input: {
            backgroundColor: 'rgba(31, 41, 55, 0.6)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          },
        },
      },
      Autocomplete: { styles: { wrapper: { width: '500px' } } },
      Select: {
        styles: {
          label: { marginTop: '0.5rem' },
          input: {
            backgroundColor: 'rgba(31, 41, 55, 0.6)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          },
        },
      },
      Loader: { defaultProps: { size: 'xl', color: 'orange' } },
      Space: { defaultProps: { h: 'sm' } },
      Anchor: { defaultProps: { target: '_blank' } },
      Burger: { styles: { burger: { color: 'var(--text-secondary)' } } },
      Table: {
        styles: {
          td: { padding: '0.6rem' },
          th: { padding: '0.5rem', backgroundColor: 'rgba(31, 41, 55, 0.8)' },
        },
      },
      Tabs: {
        styles: {
          tab: {
            '&[dataActive]': {
              backgroundColor: 'var(--primary-color)',
              color: 'white',
            },
          },
        },
      },
      ActionIcon: {
        styles: {
          root: {
            color: 'var(--text-secondary)',
            '&:hover': {
              backgroundColor: 'rgba(55, 65, 81, 0.5)',
            },
          },
        },
      },
    },
  });

  return (
    <>
      <ColorSchemeScript defaultColorScheme='dark' />
      <MantineProvider
        defaultColorScheme='dark'
        theme={theme}
        withCssVariables
      >
        <ModalsProvider>
          <Notifications />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </>
  );
}
