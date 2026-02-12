# Hooks Reference

`@mantine/hooks` provides 75+ React hooks. No styles needed — works independently.

```bash
npm install @mantine/hooks
```

## State Management

### useDisclosure

Boolean state for modals/menus:

```tsx
import { useDisclosure } from '@mantine/hooks';

const [opened, { open, close, toggle }] = useDisclosure(false);

// With callbacks
const [opened, handlers] = useDisclosure(false, {
  onOpen: () => console.log('Opened'),
  onClose: () => console.log('Closed'),
});
```

### useToggle

Cycle through values:

```tsx
import { useToggle } from '@mantine/hooks';

const [value, toggle] = useToggle(['blue', 'orange', 'cyan']);
// toggle() cycles, toggle('cyan') sets specific

// Boolean
const [active, toggle] = useToggle([false, true]);
```

### useCounter

Numeric counter with min/max:

```tsx
import { useCounter } from '@mantine/hooks';

const [count, { increment, decrement, set, reset }] = useCounter(0, { min: 0, max: 10 });
```

### useListState

Array state management:

```tsx
import { useListState } from '@mantine/hooks';

const [values, handlers] = useListState([1, 2, 3]);

handlers.append(4); // Add to end
handlers.prepend(0); // Add to start
handlers.insert(2, 99); // Insert at index
handlers.remove(1); // Remove at index
handlers.reorder({ from: 0, to: 2 }); // Move item
handlers.filter(item => item > 2); // Filter
handlers.apply(item => item * 2); // Transform all
```

### useSetState

Object state with partial updates:

```tsx
import { useSetState } from '@mantine/hooks';

const [state, setState] = useSetState({ name: '', email: '', age: 0 });
setState({ name: 'John' }); // Partial update, others unchanged
```

## Storage

### useLocalStorage / useSessionStorage

```tsx
import { useLocalStorage } from '@mantine/hooks';

const [value, setValue, removeValue] = useLocalStorage({
  key: 'my-key',
  defaultValue: 'light',
});

// Auto-serializes objects
const [user, setUser] = useLocalStorage({
  key: 'user',
  defaultValue: { name: '', preferences: {} },
});
```

## Input/Debounce

### useDebouncedValue

```tsx
import { useDebouncedValue } from '@mantine/hooks';

const [value, setValue] = useState('');
const [debounced] = useDebouncedValue(value, 300);

useEffect(() => {
  // API call with debounced value
}, [debounced]);
```

### useDebouncedCallback

```tsx
import { useDebouncedCallback } from '@mantine/hooks';

const search = useDebouncedCallback(async (query: string) => {
  await searchAPI(query);
}, 300);

<TextInput onChange={e => search(e.target.value)} />;
```

### useInputState

Simpler input handling:

```tsx
import { useInputState } from '@mantine/hooks';

const [name, setName] = useInputState('');
<TextInput
  value={name}
  onChange={setName}
/>;

const [checked, setChecked] = useInputState(false);
<Checkbox
  checked={checked}
  onChange={setChecked}
/>;
```

## UI Interactions

### useClickOutside

```tsx
import { useClickOutside } from '@mantine/hooks';

const ref = useClickOutside(() => close());
<Paper ref={ref}>Click outside to close</Paper>;
```

### useHover

```tsx
import { useHover } from '@mantine/hooks';

const { hovered, ref } = useHover();
<Box
  ref={ref}
  bg={hovered ? 'blue' : 'gray'}
>
  Hover me
</Box>;
```

### useFocusWithin

```tsx
import { useFocusWithin } from '@mantine/hooks';

const { ref, focused } = useFocusWithin();
<Box
  ref={ref}
  style={{ outline: focused ? '2px solid blue' : 'none' }}
>
  <TextInput />
  <TextInput />
</Box>;
```

### useMediaQuery

```tsx
import { useMediaQuery } from '@mantine/hooks';

const isMobile = useMediaQuery('(max-width: 768px)');
const matches = useMediaQuery('(min-width: 48em)'); // sm breakpoint

return isMobile ? <MobileNav /> : <DesktopNav />;
```

### useViewportSize

```tsx
import { useViewportSize } from '@mantine/hooks';

const { width, height } = useViewportSize();
```

### useElementSize

```tsx
import { useElementSize } from '@mantine/hooks';

const { ref, width, height } = useElementSize();
<Box ref={ref}>Tracks this element's size</Box>;
```

### useScrollIntoView

```tsx
import { useScrollIntoView } from '@mantine/hooks';

const { scrollIntoView, targetRef } = useScrollIntoView<HTMLDivElement>({
  offset: 60,
  duration: 500,
});

<Button onClick={() => scrollIntoView()}>Scroll</Button>
<div ref={targetRef}>Target</div>
```

### useIntersection / useInViewport

```tsx
import { useIntersection, useInViewport } from '@mantine/hooks';

// Detailed intersection info
const { ref, entry } = useIntersection({ threshold: 0.5 });

// Simple visibility check
const { ref, inViewport } = useInViewport();
```

## Utilities

### useClipboard

```tsx
import { useClipboard } from '@mantine/hooks';

const clipboard = useClipboard({ timeout: 500 });

<Button
  onClick={() => clipboard.copy('Text')}
  color={clipboard.copied ? 'teal' : 'blue'}
>
  {clipboard.copied ? 'Copied!' : 'Copy'}
</Button>;
```

### useHotkeys

```tsx
import { useHotkeys, getHotkeyHandler } from '@mantine/hooks';

useHotkeys([
  ['mod+S', () => save()],
  ['ctrl+K', () => search()],
]);

// On specific input
<input
  onKeyDown={getHotkeyHandler([
    ['mod+Enter', submit],
    ['Escape', cancel],
  ])}
/>;
```

### useFullscreen

```tsx
import { useFullscreen } from '@mantine/hooks';

const { toggle, fullscreen } = useFullscreen();
<Button onClick={toggle}>{fullscreen ? 'Exit' : 'Enter'} Fullscreen</Button>;
```

### useIdle

```tsx
import { useIdle } from '@mantine/hooks';

const idle = useIdle(5000); // 5 seconds
<Text>{idle ? 'User is idle' : 'User is active'}</Text>;
```

### useInterval / useTimeout

```tsx
import { useInterval, useTimeout } from '@mantine/hooks';

const interval = useInterval(() => tick(), 1000);
interval.start();
interval.stop();
interval.toggle();

const { start, clear } = useTimeout(() => action(), 3000);
```

### useDocumentTitle

```tsx
import { useDocumentTitle } from '@mantine/hooks';

useDocumentTitle('My Page Title');
```

### useOs

```tsx
import { useOs } from '@mantine/hooks';

const os = useOs(); // 'macos' | 'ios' | 'windows' | 'android' | 'linux'
<Text>Shortcut: {os === 'macos' ? '⌘' : 'Ctrl'}</Text>;
```

### useNetwork

```tsx
import { useNetwork } from '@mantine/hooks';

const { online, downlink, effectiveType } = useNetwork();
return online ? <App /> : <OfflineMessage />;
```

### usePrevious

```tsx
import { usePrevious } from '@mantine/hooks';

const [value, setValue] = useState(0);
const previous = usePrevious(value);
```

### useMergedRef

Combine multiple refs:

```tsx
import { useMergedRef } from '@mantine/hooks';

const myRef = useRef<HTMLDivElement>(null);
const { ref: hookRef } = useHover();
const mergedRef = useMergedRef(myRef, hookRef);

<Box ref={mergedRef}>Content</Box>;
```

## Complete Hook List

**State:** useDisclosure, useToggle, useCounter, useListState, useSetState, useQueue, usePagination

**Storage:** useLocalStorage, useSessionStorage, readLocalStorageValue

**Input:** useDebouncedValue, useDebouncedState, useDebouncedCallback, useInputState, useValidatedState, useUncontrolled

**UI:** useClickOutside, useHover, useFocusWithin, useFocusReturn, useFocusTrap, useMediaQuery, useViewportSize, useElementSize, useResizeObserver, useScrollIntoView, useIntersection, useInViewport, useWindowScroll, useMouse, useMove

**Utilities:** useClipboard, useHotkeys, useFullscreen, useIdle, useInterval, useTimeout, useDocumentTitle, useDocumentVisibility, useFavicon, useOs, useNetwork, usePrevious, useMergedRef, useId, useForceUpdate, useReducedMotion, useTextSelection, useWindowEvent, useEventListener, useEyeDropper, useHash, useHeadroom, useLogger, useMutationObserver, useOrientation, usePageLeave, usePinchToZoom, useStateHistory
