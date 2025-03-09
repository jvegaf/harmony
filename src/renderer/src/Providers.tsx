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
    // Added Segoe UI Variable Text (Win11) to https://mantine.dev/theming/typography/#system-fonts
    fontFamily:
      // '-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji',
      'Verdana,  Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji',
    // added source-code-pro and SFMono-Regular
    fontFamilyMonospace:
      'source-code-pro, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
    components: {
      Button: {
        defaultProps: { radius: 'xs' },
        // styles: { root: { textTransform: 'none' } },
      },
      Checkbox: {
        styles: { input: { cursor: 'pointer' }, label: { cursor: 'pointer' } },
      },
      TextInput: { styles: { label: { fontSize: '0.7rem', color: '#868e96', marginTop: '0.5rem' } } },
      Textarea: { styles: { label: { fontSize: '0.8rem', color: '#868e96', marginTop: '0.5rem' } } },
      Autocomplete: { styles: { wrapper: { width: '500px' } } },
      Select: { styles: { label: { marginTop: '0.5rem' } } },
      Loader: { defaultProps: { size: 'xl' } },
      Space: { defaultProps: { h: 'sm' } },
      Anchor: { defaultProps: { target: '_blank' } },
      Burger: { styles: { burger: { color: '--mantine-color-grey-6' } } },
      Table: {
        styles: { td: { padding: '0.6rem' }, th: { padding: '0.5rem', backgroundColor: '--mantine-color-gray-6' } },
      },
    },
  });

  return (
    <>
      <ColorSchemeScript defaultColorScheme='auto' />
      <MantineProvider
        defaultColorScheme='auto'
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
