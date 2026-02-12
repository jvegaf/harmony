# Getting Started Reference

## Vite Template (Recommended)

The fastest way to start — official template includes everything:

```bash
# Clone template
git clone https://github.com/mantinedev/vite-template my-app
cd my-app

# Install dependencies
yarn install  # or npm install

# Start development
yarn dev
```

### Template Features

- PostCSS with `postcss-preset-mantine`
- TypeScript configured
- Storybook setup
- Vitest with React Testing Library
- ESLint with `eslint-config-mantine`
- Prettier configured

## Manual Setup

### 1. Create Vite Project

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
```

### 2. Install Packages

```bash
# Core (required)
npm install @mantine/core @mantine/hooks

# PostCSS (required for responsive styles)
npm install -D postcss postcss-preset-mantine postcss-simple-vars

# Optional packages
npm install @mantine/form          # Forms with validation
npm install @mantine/dates dayjs   # Date/time components
npm install @mantine/notifications # Toast notifications
npm install @mantine/modals        # Modal manager
npm install @mantine/charts recharts # Charts
npm install @mantine/dropzone      # File upload
npm install @mantine/spotlight     # Command palette (Cmd+K)
npm install @mantine/code-highlight # Code syntax highlighting
npm install @mantine/carousel embla-carousel-react # Carousel
npm install @mantine/tiptap @tiptap/react @tiptap/pm @tiptap/starter-kit # Rich text editor
```

### 3. Configure PostCSS

Create `postcss.config.cjs`:

```js
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

### 4. Import Styles

In your entry file (e.g., `src/main.tsx` or `src/App.tsx`):

```tsx
// Required - core styles
import '@mantine/core/styles.css';

// Package-specific styles (import only what you use)
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/code-highlight/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/spotlight/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/tiptap/styles.css';
// Note: @mantine/form and @mantine/hooks have no styles
```

### 5. Setup MantineProvider

```tsx
// src/App.tsx
import '@mantine/core/styles.css';

import { MantineProvider, createTheme } from '@mantine/core';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const theme = createTheme({
  // Your theme customization
  primaryColor: 'blue',
  fontFamily: 'Inter, sans-serif',
});

function App() {
  return (
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <Routes>{/* Your routes */}</Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
```

## Project Structure

Recommended structure for Mantine projects:

```
src/
├── components/
│   ├── Layout/
│   │   ├── AppShell.tsx
│   │   ├── Header.tsx
│   │   └── Navbar.tsx
│   └── ui/                # Custom UI components
├── pages/
│   ├── Home.tsx
│   └── Settings.tsx
├── hooks/                  # Custom hooks
├── theme/
│   ├── index.ts           # createTheme export
│   └── components.ts      # Component default props
├── utils/
├── App.tsx
├── main.tsx
└── App.module.css         # CSS modules
```

## VS Code Setup

Install recommended extensions:

1. **PostCSS Intellisense and Highlighting**  
   For postcss syntax support and `$variable` recognition.

2. **CSS Variable Autocomplete**  
   For Mantine CSS variables autocomplete.

Create `.vscode/settings.json`:

```json
{
  "cssVariables.lookupFiles": ["**/*.css", "node_modules/@mantine/core/styles.css"]
}
```

## TypeScript Configuration

Mantine is fully typed. Your `tsconfig.json` should have:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "skipLibCheck": true
  }
}
```

## Common Issues

### Styles Not Loading

Ensure `@mantine/core/styles.css` is imported before any component usage.

### PostCSS Mixins Not Working

Check that `postcss-preset-mantine` is installed and configured in `postcss.config.cjs`.

### Dark Mode Flash

For SSR apps, add `ColorSchemeScript` to `<head>`:

```tsx
import { ColorSchemeScript } from '@mantine/core';

// In your HTML head
<ColorSchemeScript defaultColorScheme='auto' />;
```

### Hydration Warning

Spread `mantineHtmlProps` on `<html>` element:

```tsx
import { mantineHtmlProps } from '@mantine/core';

<html {...mantineHtmlProps}>
```
