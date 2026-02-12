# Harmony Theme System - Quick Reference

**Last Updated**: February 12, 2026

## For Developers: How to Use Themes

### CSS: Use Design Tokens

**✅ DO THIS:**

```css
.myComponent {
  background-color: var(--hm-bg-card);
  color: var(--hm-text);
  border: 1px solid var(--hm-border);
}

.myComponent:hover {
  background-color: var(--hm-bg-hover);
}
```

**❌ DON'T DO THIS:**

```css
.myComponent {
  background-color: rgba(31, 41, 55, 0.7);
  color: #9ca3af;
  border: 1px solid #4b5563;
}
```

### When You Need a Custom Color

Use the `light-dark()` function:

```css
.specialElement {
  color: light-dark(#dc2626, #f87171); /* red-600 in light, red-400 in dark */
  box-shadow: 0 4px 12px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.3));
}
```

### TypeScript/React: Detect Current Theme

```typescript
import { useMantineColorScheme } from '@mantine/core';

const MyComponent = () => {
  const { colorScheme } = useMantineColorScheme();

  // colorScheme is 'light' or 'dark'
  const isDark = colorScheme === 'dark';

  return <div>Current theme: {colorScheme}</div>;
};
```

### Change Theme Programmatically

```typescript
import { useMantineColorScheme } from '@mantine/core';

const ThemeSwitcher = () => {
  const { setColorScheme } = useMantineColorScheme();

  return (
    <button onClick={() => setColorScheme('light')}>Light Mode</button>
    <button onClick={() => setColorScheme('dark')}>Dark Mode</button>
    <button onClick={() => setColorScheme('auto')}>Auto Mode</button>
  );
};
```

## Available Design Tokens

### Backgrounds

| Token              | Usage               | Dark Value           | Light Value             |
| ------------------ | ------------------- | -------------------- | ----------------------- |
| `--hm-bg-app`      | Main app background | `#231a0f`            | `#f8f7f5`               |
| `--hm-bg-main`     | Content areas       | `rgba(17,24,39,0.7)` | `#ffffff`               |
| `--hm-bg-sidebar`  | Sidebar             | `rgba(17,24,39,0.4)` | `#f1f0ee`               |
| `--hm-bg-header`   | Header bar          | `rgba(31,41,55,0.5)` | `rgba(255,255,255,0.9)` |
| `--hm-bg-card`     | Cards/panels        | `rgba(31,41,55,0.7)` | `#ffffff`               |
| `--hm-bg-elevated` | Modals, dropdowns   | `rgba(31,41,55,0.8)` | `#f9fafb`               |
| `--hm-bg-input`    | Input fields        | `rgba(31,41,55,0.6)` | `#ffffff`               |
| `--hm-bg-button`   | Buttons             | `#374151`            | `#e5e7eb`               |
| `--hm-bg-hover`    | Hover states        | `rgba(55,65,81,0.5)` | `rgba(0,0,0,0.05)`      |
| `--hm-bg-overlay`  | Modal overlays      | `rgba(0,0,0,0.7)`    | `rgba(0,0,0,0.4)`       |
| `--hm-bg-modal`    | Modal content       | `rgb(17,24,39)`      | `#ffffff`               |

### Text

| Token                  | Usage                 | Dark Value | Light Value |
| ---------------------- | --------------------- | ---------- | ----------- |
| `--hm-text`            | Primary text          | `#f3f4f6`  | `#1a1b1e`   |
| `--hm-text-secondary`  | Secondary text        | `#9ca3af`  | `#495057`   |
| `--hm-text-muted`      | Muted/disabled        | `#6b7280`  | `#868e96`   |
| `--hm-text-on-primary` | Text on primary color | `white`    | `white`     |

### Borders

| Token                | Usage            | Dark Value           | Light Value        |
| -------------------- | ---------------- | -------------------- | ------------------ |
| `--hm-border`        | Standard borders | `rgba(75,85,99,0.5)` | `rgba(0,0,0,0.12)` |
| `--hm-border-subtle` | Dividers         | `rgba(55,65,81,0.3)` | `rgba(0,0,0,0.06)` |

### Brand Colors (Theme-Independent)

| Token                 | Usage               | Value                  |
| --------------------- | ------------------- | ---------------------- |
| `--hm-primary`        | Primary brand color | `#fa8905`              |
| `--hm-primary-hover`  | Primary hover       | `#fb9f2d`              |
| `--hm-primary-light`  | Primary backgrounds | `rgba(250,137,5,0.2)`  |
| `--hm-primary-muted`  | Selected states     | `rgba(250,137,5,0.15)` |
| `--hm-primary-subtle` | Subtle highlights   | `rgba(250,137,5,0.1)`  |
| `--hm-primary-ghost`  | Very subtle         | `rgba(250,137,5,0.05)` |

### Semantic Colors (Theme-Independent)

| Token                | Usage               | Value                  |
| -------------------- | ------------------- | ---------------------- |
| `--hm-success`       | Success states      | `#22c55e`              |
| `--hm-success-light` | Success backgrounds | `rgba(34,197,94,0.2)`  |
| `--hm-warning`       | Warning states      | `#eab308`              |
| `--hm-warning-light` | Warning backgrounds | `rgba(234,179,8,0.2)`  |
| `--hm-danger`        | Error states        | `#ef4444`              |
| `--hm-danger-light`  | Error backgrounds   | `rgba(239,68,68,0.2)`  |
| `--hm-info`          | Info states         | `#3b82f6`              |
| `--hm-info-light`    | Info backgrounds    | `rgba(59,130,246,0.2)` |

## Common Patterns

### Card/Panel

```css
.card {
  background-color: var(--hm-bg-card);
  border: 1px solid var(--hm-border);
  border-radius: 0.5rem;
  padding: 1rem;
}
```

### Button

```css
.button {
  background-color: var(--hm-bg-button);
  color: var(--hm-text);
  border: 1px solid var(--hm-border);
  border-radius: var(--hm-button-radius);
}

.button:hover {
  background-color: var(--hm-bg-hover);
}

.buttonPrimary {
  background-color: var(--hm-primary);
  color: var(--hm-text-on-primary);
}

.buttonPrimary:hover {
  background-color: var(--hm-primary-hover);
}
```

### Input Field

```css
.input {
  background-color: var(--hm-bg-input);
  color: var(--hm-text);
  border: 1px solid var(--hm-border);
  border-radius: 0.375rem;
}

.input:focus {
  border-color: var(--hm-primary);
  outline: 2px solid var(--hm-primary-light);
}
```

### Modal

```css
.modalOverlay {
  background-color: var(--hm-bg-overlay);
}

.modalContent {
  background-color: var(--hm-bg-modal);
  border: 1px solid var(--hm-border);
  box-shadow: 0 25px 50px -12px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.25));
}
```

### Scrollbar

```css
.scrollable {
  scrollbar-color: var(--hm-scrollbar-thumb) var(--hm-scrollbar-track);
}

.scrollable::-webkit-scrollbar {
  width: 8px;
  background-color: var(--hm-scrollbar-track);
}

.scrollable::-webkit-scrollbar-thumb {
  background-color: var(--hm-scrollbar-thumb);
  border-radius: 4px;
}

.scrollable::-webkit-scrollbar-thumb:hover {
  background-color: var(--hm-scrollbar-thumb-hover);
}
```

## Migration Checklist

When adding new UI components:

- [ ] Use `var(--hm-*)` CSS variables for all colors
- [ ] Use `light-dark()` for custom colors not in the token system
- [ ] Test component in both light and dark modes
- [ ] Verify hover states work in both themes
- [ ] Check color contrast meets WCAG AA standards
- [ ] Add AIDEV-NOTE comments for complex theme logic
- [ ] Preserve brand colors (Beatport, Traxsource, etc.)

## Troubleshooting

### Theme not updating?

1. Check if `useMantineColorScheme()` is imported from `@mantine/core`
2. Verify component is wrapped in `<MantineProvider>`
3. Check browser console for errors

### Colors look wrong?

1. Ensure you're using `var(--hm-*)` not old variables
2. Check if `App.css` is imported in root component
3. Verify PostCSS is configured correctly

### AG Grid colors not updating?

AG Grid uses a separate theme system - check `TrackList.tsx` for the pattern.

## Need Help?

Refer to the full documentation: `docs/aidev-notes/theme-system-implementation.md`
