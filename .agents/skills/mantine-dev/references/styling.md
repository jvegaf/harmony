# Styling & Theming Reference

Mantine styling: MantineProvider, theme object, CSS modules, style props, and Styles API.

## MantineProvider

Required wrapper for all Mantine components:

```tsx
import { createTheme, MantineProvider } from '@mantine/core';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, sans-serif',
});

function App() {
  return <MantineProvider theme={theme}>{/* App content */}</MantineProvider>;
}
```

### Key Props

| Prop                 | Type                          | Default     | Description                   |
| -------------------- | ----------------------------- | ----------- | ----------------------------- |
| `theme`              | `MantineThemeOverride`        | -           | Theme customization           |
| `defaultColorScheme` | `'light' \| 'dark' \| 'auto'` | `'light'`   | Default color scheme          |
| `forceColorScheme`   | `'light' \| 'dark'`           | -           | Force specific scheme         |
| `env`                | `'default' \| 'test'`         | `'default'` | Disable transitions for tests |

## Theme Object

```tsx
import { createTheme, rem } from '@mantine/core';

const theme = createTheme({
  // Colors
  primaryColor: 'blue',
  primaryShade: { light: 6, dark: 8 },

  // Typography
  fontFamily: 'Inter, sans-serif',
  headings: {
    fontFamily: 'Greycliff CF, sans-serif',
    fontWeight: '700',
  },

  // Spacing & Sizing
  spacing: { xs: rem(10), sm: rem(12), md: rem(16), lg: rem(20), xl: rem(32) },
  radius: { xs: rem(2), sm: rem(4), md: rem(8), lg: rem(16), xl: rem(32) },

  // Defaults
  defaultRadius: 'md',
  cursorType: 'pointer',
  respectReducedMotion: true,
});
```

## Custom Colors

```tsx
import { createTheme, MantineColorsTuple } from '@mantine/core';

const brand: MantineColorsTuple = [
  '#f0f9ff',
  '#e0f2fe',
  '#bae6fd',
  '#7dd3fc',
  '#38bdf8',
  '#0ea5e9',
  '#0284c7',
  '#0369a1',
  '#075985',
  '#0c4a6e',
];

const theme = createTheme({
  colors: { brand },
  primaryColor: 'brand',
});
```

## Color Scheme (Dark Mode)

```tsx
import { useMantineColorScheme, useComputedColorScheme } from '@mantine/core';

function ColorSchemeToggle() {
  const { setColorScheme, toggleColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light'); // Resolved value

  return (
    <>
      <Button onClick={() => setColorScheme('light')}>Light</Button>
      <Button onClick={() => setColorScheme('dark')}>Dark</Button>
      <Button onClick={toggleColorScheme}>Toggle</Button>
    </>
  );
}

// SSR: Prevent flash of wrong color scheme
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';

<html {...mantineHtmlProps}>
  <head>
    <ColorSchemeScript defaultColorScheme='auto' />
  </head>
</html>;
```

## Style Props

All components accept style props for quick styling:

```tsx
import { Box, Text, Button } from '@mantine/core';

function Demo() {
  return (
    <Box
      p='md' // padding
      m='lg' // margin
      mt='xl' // margin-top
      bg='blue.6' // background (color.shade)
      c='white' // color
      w={200} // width (number = px)
      h='100%' // height
      maw={500} // max-width
      pos='relative' // position
      ta='center' // text-align
      fz='sm' // font-size
      fw={700} // font-weight
      ff='monospace' // font-family
      lh={1.5} // line-height
      style={{ borderRadius: 'var(--mantine-radius-md)' }}
    >
      <Text
        c='dimmed'
        fz='xs'
        tt='uppercase'
      >
        Uppercase dimmed text
      </Text>
    </Box>
  );
}
```

### Common Style Props

| Prop                                    | CSS Property           | Example                    |
| --------------------------------------- | ---------------------- | -------------------------- |
| `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml` | margin                 | `m="md"`, `mt={20}`        |
| `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl` | padding                | `p="lg"`                   |
| `w`, `h`, `maw`, `mah`, `miw`, `mih`    | width, height, max/min | `w="100%"`                 |
| `c`                                     | color                  | `c="blue.6"`, `c="dimmed"` |
| `bg`                                    | background-color       | `bg="gray.1"`              |
| `fz`                                    | font-size              | `fz="sm"`, `fz={14}`       |
| `fw`                                    | font-weight            | `fw={500}`, `fw="bold"`    |
| `ta`                                    | text-align             | `ta="center"`              |
| `td`                                    | text-decoration        | `td="underline"`           |
| `tt`                                    | text-transform         | `tt="uppercase"`           |
| `ff`                                    | font-family            | `ff="monospace"`           |
| `lh`                                    | line-height            | `lh={1.5}`                 |
| `pos`                                   | position               | `pos="absolute"`           |
| `top`, `left`, `right`, `bottom`        | position offsets       | `top={10}`                 |
| `display`                               | display                | `display="flex"`           |
| `opacity`                               | opacity                | `opacity={0.5}`            |

### Responsive Props

```tsx
<Box
  w={{ base: '100%', sm: '50%', md: 400 }}
  p={{ base: 'xs', md: 'xl' }}
  display={{ base: 'none', md: 'block' }}
>
  Responsive box
</Box>
```

## CSS Modules

Recommended styling approach. Create `.module.css` files:

```css
/* Button.module.css */
.root {
  background-color: var(--mantine-color-blue-6);

  @mixin hover {
    background-color: var(--mantine-color-blue-7);
  }

  /* Responsive */
  @mixin smaller-than sm {
    font-size: var(--mantine-font-size-xs);
  }

  @mixin larger-than md {
    padding: var(--mantine-spacing-xl);
  }

  /* Dark mode */
  @mixin dark {
    background-color: var(--mantine-color-blue-8);
  }

  @mixin light {
    background-color: var(--mantine-color-blue-4);
  }
}

.label {
  color: var(--mantine-color-white);
}
```

```tsx
import { Button } from '@mantine/core';
import classes from './Button.module.css';

function Demo() {
  return <Button classNames={classes}>Styled button</Button>;
}
```

## PostCSS Preset

`postcss-preset-mantine` provides:

### Mixins

```css
/* Hover state */
@mixin hover {
  /* Hover-only styles */
}

/* Responsive breakpoints */
@mixin smaller-than sm {
}
@mixin larger-than md {
}

/* Color scheme */
@mixin light {
}
@mixin dark {
}

/* RTL support */
@mixin rtl {
}
@mixin ltr {
}
```

### Functions

```css
.element {
  /* rem() - convert to rem */
  font-size: rem(16px); /* 1rem */

  /* em() - convert to em */
  padding: em(24px); /* 1.5em */

  /* light-dark() - color scheme values */
  background: light-dark(white, black);

  /* alpha() - add opacity to color */
  background: alpha(var(--mantine-color-blue-5), 0.5);
}
```

## Styles API

Override internal component styles:

### classNames Prop

```tsx
import { TextInput } from '@mantine/core';
import classes from './TextInput.module.css';

// CSS module with selectors matching Styles API
// .root, .input, .label, .error, etc.

<TextInput
  classNames={{
    root: classes.root,
    input: classes.input,
    label: classes.label,
  }}
/>;
```

### styles Prop (CSS-in-JS)

```tsx
<TextInput
  styles={{
    root: { marginBottom: 20 },
    input: { backgroundColor: 'var(--mantine-color-gray-0)' },
    label: { fontWeight: 700 },
  }}
/>
```

### styles Function

```tsx
<TextInput
  styles={(theme, props) => ({
    input: {
      borderColor: props.error ? theme.colors.red[6] : theme.colors.gray[4],
    },
  })}
/>
```

### Finding Selectors

All Styles API selectors are documented for each component. Common patterns:

- `root` - Root element
- `label` - Label text
- `input` - Input element
- `wrapper` - Input wrapper
- `error` - Error message
- `description` - Description text
- `required` - Required asterisk
- `section` - Input sections (left/right icons)

## hiddenFrom / visibleFrom

Hide/show at breakpoints:

```tsx
import { Text } from '@mantine/core';

<Text hiddenFrom="sm">Hidden on sm and larger</Text>
<Text visibleFrom="md">Visible only on md and larger</Text>
```

## lightHidden / darkHidden

Hide based on color scheme:

```tsx
<Text lightHidden>Only in dark mode</Text>
<Text darkHidden>Only in light mode</Text>
```

## Box Component

Base component for custom styling:

```tsx
import { Box } from '@mantine/core';

<Box
  component='section' // Render as different element
  className={classes.wrapper}
  p='md'
  bg='gray.1'
  style={{ borderRadius: 'var(--mantine-radius-md)' }}
>
  Content
</Box>;
```

## Polymorphic Components

Many components accept `component` prop:

```tsx
import { Button } from '@mantine/core';
import { Link } from 'react-router-dom';

// Render Button as Link
<Button component={Link} to="/about">
  About
</Button>

// Render as native anchor
<Button component="a" href="https://example.com">
  External
</Button>
```

## CSS Variables in Styles

Access theme values:

```tsx
<Box
  style={{
    backgroundColor: 'var(--mantine-color-blue-6)',
    padding: 'var(--mantine-spacing-md)',
    borderRadius: 'var(--mantine-radius-sm)',
    boxShadow: 'var(--mantine-shadow-md)',
  }}
>
  Styled with CSS variables
</Box>
```

## Global Styles

```tsx
// In your CSS
:root {
  --my-custom-color: #ff6b6b;
}

/* Target Mantine root element */
[data-mantine-color-scheme="dark"] {
  --my-custom-color: #ff8787;
}

/* Global component overrides */
.mantine-Button-root {
  font-weight: 600;
}
```

## rem() and em() Utilities

```tsx
import { rem, em } from '@mantine/core';

// In styles or inline
<Box style={{ fontSize: rem(16), padding: rem(24) }} />;

// rem(16) => '1rem'
// em(24) => '1.5em'
```

## Style Props vs CSS Modules

| Use Case                   | Recommended |
| -------------------------- | ----------- |
| Quick prototyping          | Style props |
| Simple spacing/colors      | Style props |
| Complex hover/focus states | CSS modules |
| Responsive layouts         | CSS modules |
| Reusable component styles  | CSS modules |
| Performance critical       | CSS modules |

## Component Default Props (Theme)

Override defaults globally:

```tsx
const theme = createTheme({
  components: {
    Button: Button.extend({
      defaultProps: { variant: 'outline', size: 'md', radius: 'xl' },
    }),
    TextInput: TextInput.extend({
      defaultProps: { size: 'md' },
      classNames: { root: 'my-input-root', input: 'my-input' },
    }),
  },
});
```

## CSS Variables Reference

```
--mantine-color-{color}-{shade}     // Colors (0-9)
--mantine-primary-color-{shade}     // Primary color
--mantine-spacing-{size}            // xs, sm, md, lg, xl
--mantine-radius-{size}             // xs, sm, md, lg, xl
--mantine-font-family               // Main font
--mantine-font-size-{size}          // xs, sm, md, lg, xl
--mantine-breakpoint-{size}         // Responsive breakpoints
```
