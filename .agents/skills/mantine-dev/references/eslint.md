# ESLint Configuration Reference

`eslint-config-mantine` provides ESLint rules and configurations used in Mantine projects.

## Installation

```bash
npm install -D @eslint/js eslint eslint-plugin-jsx-a11y eslint-plugin-react typescript-eslint eslint-config-mantine
```

## Configuration

Create `eslint.config.js` (ESLint flat config):

```js
import mantine from 'eslint-config-mantine';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  ...mantine,
  {
    ignores: ['**/*.{mjs,cjs,js,d.ts,d.mts}'],
  },
  {
    files: ['**/*.story.tsx'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
  },
];
```

## What's Included

eslint-config-mantine includes:

### TypeScript Rules

- `typescript-eslint/recommended` base rules
- Strict type checking
- No unused variables (except with `_` prefix)
- No explicit `any` (warning)

### React Rules

- React hooks rules (exhaustive-deps, rules-of-hooks)
- JSX-specific rules
- No unknown properties
- Self-closing components

### Accessibility (a11y)

- `eslint-plugin-jsx-a11y` rules
- Alt text requirements
- ARIA attribute validation
- Interactive element handling
- Focus management rules

### Import/Export

- Import order organization
- No duplicate imports
- No unresolved imports

### General

- No console.log (warning)
- Consistent code style
- No debugger

## Script Setup

Add to `package.json`:

```json
{
  "scripts": {
    "lint": "npm run eslint && npm run stylelint",
    "eslint": "eslint . --cache",
    "eslint:fix": "eslint . --cache --fix"
  }
}
```

## Common Configuration Adjustments

### Allow console in specific files

```js
export default [
  ...mantine,
  {
    files: ['**/*.test.tsx', '**/*.story.tsx'],
    rules: {
      'no-console': 'off',
    },
  },
];
```

### Disable specific rules

```js
export default [
  ...mantine,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react/jsx-no-target-blank': 'off',
    },
  },
];
```

### Add custom rules

```js
export default [
  ...mantine,
  {
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
    },
  },
];
```

### Configure for monorepo

```js
export default [
  ...mantine,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './packages/*/tsconfig.json'],
        tsconfigRootDir: process.cwd(),
      },
    },
  },
];
```

## Integration with Prettier

If using Prettier, add `eslint-config-prettier`:

```bash
npm install -D eslint-config-prettier
```

```js
import mantine from 'eslint-config-mantine';
import prettier from 'eslint-config-prettier';

export default [
  ...mantine,
  prettier, // Must be last to override conflicting rules
];
```

## VS Code Integration

Install ESLint extension, then add to `.vscode/settings.json`:

```json
{
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

## Stylelint (Optional)

For CSS linting, the Mantine Vite template also includes Stylelint:

```bash
npm install -D stylelint stylelint-config-standard-scss
```

Create `stylelint.config.js`:

```js
export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'selector-class-pattern': null,
  },
};
```

Add to scripts:

```json
{
  "scripts": {
    "stylelint": "stylelint '**/*.css' --cache"
  }
}
```

## Common ESLint Errors & Fixes

### React Hook Dependency Warning

```tsx
// Warning: React Hook useEffect has missing dependency
useEffect(() => {
  fetchData(id);
}, []); // Missing 'id' and 'fetchData'

// Fix: Add dependencies
useEffect(() => {
  fetchData(id);
}, [id, fetchData]);

// Or use useCallback for functions
const fetchData = useCallback(id => {
  /* ... */
}, []);
```

### Unused Variable

```tsx
// Error: 'x' is defined but never used
const x = 5;

// Fix: Prefix with underscore if intentionally unused
const _x = 5;
```

### Missing Key Prop

```tsx
// Error: Missing "key" prop
items.map(item => <Item>{item.name}</Item>);

// Fix: Add unique key
items.map(item => <Item key={item.id}>{item.name}</Item>);
```

### Accessibility Issues

```tsx
// Error: img elements must have an alt prop
<img src="photo.jpg" />

// Fix: Add alt text
<img src="photo.jpg" alt="Description" />

// Decorative image
<img src="decoration.jpg" alt="" role="presentation" />
```

## Template Configuration

The [Mantine Vite template](https://github.com/mantinedev/vite-template) includes a complete ESLint + Prettier + Stylelint setup that you can use as reference.
