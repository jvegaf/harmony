# Testing Reference

Guide for testing Mantine applications with Vitest and React Testing Library.

## Installation

```bash
npm install -D vitest jsdom @testing-library/dom @testing-library/jest-dom @testing-library/react @testing-library/user-event
```

## Vitest Configuration

Add to `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  },
});
```

## Setup File

Create `vitest.setup.mjs`:

```js
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Fix for getComputedStyle
const { getComputedStyle } = window;
window.getComputedStyle = elt => getComputedStyle(elt);

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {};

// Mock matchMedia (required by Mantine)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver (required by some Mantine components)
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;
```

## Custom Render Function

All Mantine components require MantineProvider. Create custom render:

```tsx
// test-utils/render.tsx
import { render as testingLibraryRender } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { theme } from '../src/theme'; // Your theme if any

export function render(ui: React.ReactNode) {
  return testingLibraryRender(<>{ui}</>, {
    wrapper: ({ children }) => (
      <MantineProvider
        theme={theme}
        env='test'
      >
        {children}
      </MantineProvider>
    ),
  });
}
```

### Important: env="test"

Setting `env="test"` on MantineProvider:

- Disables CSS transitions (tests run faster)
- Disables portals (elements render in place, easier to query)

## Export Test Utilities

```tsx
// test-utils/index.ts
import userEvent from '@testing-library/user-event';

export * from '@testing-library/react';
export { render } from './render';
export { userEvent };
```

## Writing Tests

### Basic Component Test

```tsx
// Button.test.tsx
import { render, screen } from '../test-utils';
import { Button } from '@mantine/core';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Form Inputs

```tsx
import { render, screen } from '../test-utils';
import { userEvent } from '../test-utils';
import { TextInput } from '@mantine/core';

describe('TextInput', () => {
  it('accepts user input', async () => {
    const onChange = vi.fn();
    render(
      <TextInput
        onChange={onChange}
        label='Name'
      />,
    );

    const input = screen.getByLabelText('Name');
    await userEvent.type(input, 'John Doe');

    expect(input).toHaveValue('John Doe');
    expect(onChange).toHaveBeenCalled();
  });

  it('displays error', () => {
    render(
      <TextInput
        label='Email'
        error='Invalid email'
      />,
    );
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });
});
```

### Testing useForm

```tsx
import { render, screen, waitFor } from '../test-utils';
import { userEvent } from '../test-utils';
import { useForm } from '@mantine/form';
import { TextInput, Button } from '@mantine/core';

function TestForm() {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { email: '' },
    validate: {
      email: v => (!v.includes('@') ? 'Invalid email' : null),
    },
  });

  return (
    <form onSubmit={form.onSubmit(values => console.log(values))}>
      <TextInput
        label='Email'
        key={form.key('email')}
        {...form.getInputProps('email')}
      />
      <Button type='submit'>Submit</Button>
    </form>
  );
}

describe('Form', () => {
  it('validates on submit', async () => {
    render(<TestForm />);

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('clears error on valid input', async () => {
    render(<TestForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@email.com');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.queryByText('Invalid email')).not.toBeInTheDocument();
  });
});
```

### Testing Modals

With `env="test"`, modals render in place (no portal):

```tsx
import { render, screen } from '../test-utils';
import { userEvent } from '../test-utils';
import { useDisclosure } from '@mantine/hooks';
import { Modal, Button } from '@mantine/core';

function ModalDemo() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button onClick={open}>Open</Button>
      <Modal
        opened={opened}
        onClose={close}
        title='Test Modal'
      >
        Modal Content
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('opens when button is clicked', async () => {
    render(<ModalDemo />);

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /open/i }));

    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });
});
```

### Testing Select/Dropdown

```tsx
import { render, screen } from '../test-utils';
import { userEvent } from '../test-utils';
import { Select } from '@mantine/core';

describe('Select', () => {
  it('selects an option', async () => {
    const onChange = vi.fn();
    render(
      <Select
        label='Country'
        data={['USA', 'Canada', 'UK']}
        onChange={onChange}
      />,
    );

    // Open dropdown
    await userEvent.click(screen.getByLabelText('Country'));

    // Select option
    await userEvent.click(screen.getByRole('option', { name: 'Canada' }));

    expect(onChange).toHaveBeenCalledWith('Canada');
  });
});
```

### Testing Color Scheme

```tsx
import { render, screen } from '../test-utils';
import { useMantineColorScheme } from '@mantine/core';

function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  return <button onClick={toggleColorScheme}>Current: {colorScheme}</button>;
}

describe('Color Scheme', () => {
  it('toggles color scheme', async () => {
    render(<ColorSchemeToggle />);

    expect(screen.getByText(/current: light/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByText(/current: dark/i)).toBeInTheDocument();
  });
});
```

### Testing Notifications

```tsx
import { render, screen, waitFor } from '../test-utils';
import { notifications } from '@mantine/notifications';
import { Notifications } from '@mantine/notifications';
import { Button } from '@mantine/core';

function NotificationDemo() {
  return (
    <>
      <Notifications />
      <Button onClick={() => notifications.show({ message: 'Hello!' })}>Show Notification</Button>
    </>
  );
}

describe('Notifications', () => {
  it('shows notification', async () => {
    render(<NotificationDemo />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });
  });
});
```

## Testing Hooks

```tsx
import { renderHook, act } from '@testing-library/react';
import { useDisclosure } from '@mantine/hooks';

describe('useDisclosure', () => {
  it('toggles state', () => {
    const { result } = renderHook(() => useDisclosure(false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1].open();
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1].close();
    });

    expect(result.current[0]).toBe(false);
  });
});
```

## Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Common Issues

### matchMedia Error

Ensure `matchMedia` mock is in setup file.

### ResizeObserver Error

Ensure `ResizeObserver` mock is in setup file.

### Portal Elements Not Found

Use `env="test"` on MantineProvider to disable portals.

### Transitions Cause Timing Issues

Use `env="test"` to disable transitions.

### Elements Not in Document

Make sure to use custom `render` that includes MantineProvider.

## Testing Checklist

- [ ] Setup file mocks matchMedia and ResizeObserver
- [ ] Custom render includes MantineProvider with `env="test"`
- [ ] Use `userEvent` for user interactions (not `fireEvent`)
- [ ] Use `waitFor` for async operations
- [ ] Use `getByRole` with accessible names when possible
- [ ] Test error states and edge cases
