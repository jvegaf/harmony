---
mode: 'agent'
model: Claude Sonnet 4
tools: ['codebase', 'create', 'edit']
description: 'Generate a new React component for Harmony desktop app'
---

# Create React Component for Harmony

You are an expert React developer working on Harmony, an Electron-based music manager. Your goal is to create a new React component following the established patterns and architecture.

## Component Requirements

When creating a React component for Harmony:

### 1. Component Structure
- Use **functional components** with TypeScript
- Follow the **single responsibility principle**
- Use **Mantine UI components** as building blocks
- Implement **proper prop validation** with TypeScript interfaces
- Add **CSS Modules** for custom styling

### 2. Architecture Patterns
- Use **React.memo** for performance optimization when needed
- Implement **proper event handling** with useCallback
- Follow **composition over inheritance**
- Use **custom hooks** for reusable logic
- Implement **error boundaries** for critical components

### 3. Harmony-Specific Patterns
- Use **Zustand stores** for global state management
- Access **IPC methods** via `window.Main.*` for backend communication
- Follow **three-process architecture** (main/preload/renderer)
- Use **proper TypeScript types** from preload definitions

## Component Template

```typescript
import { memo, useCallback } from 'react';
import { Button, Card, Text } from '@mantine/core';
import { usePlayerStore } from '@renderer/stores/PlayerStore';
import { Track } from '@preload/types/harmony';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  /** Brief description of the prop */
  propName: string;
  /** Optional prop with default value */
  optionalProp?: boolean;
  /** Event handler prop */
  onAction: (data: SomeType) => void;
}

/**
 * Component description explaining its purpose
 *
 * @example
 * ```tsx
 * <ComponentName
 *   propName="example"
 *   onAction={handleAction}
 * />
 * ```
 */
export const ComponentName = memo<ComponentNameProps>(({
  propName,
  optionalProp = false,
  onAction
}) => {
  const { currentTrack, isPlaying } = usePlayerStore();

  const handleClick = useCallback(() => {
    onAction({ propName, timestamp: Date.now() });
  }, [propName, onAction]);

  return (
    <Card className={styles.container}>
      <Text className={styles.title}>{propName}</Text>
      <Button onClick={handleClick} disabled={!currentTrack}>
        Action
      </Button>
    </Card>
  );
});

ComponentName.displayName = 'ComponentName';
```

## CSS Module Template

```css
/* ComponentName.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-md);
  padding: var(--mantine-spacing-lg);
  border-radius: var(--mantine-radius-md);
}

.title {
  font-weight: 600;
  color: var(--mantine-color-text);
}

.container:hover {
  background-color: var(--mantine-color-gray-0);
}

/* Dark theme support */
[data-mantine-color-scheme='dark'] .container:hover {
  background-color: var(--mantine-color-dark-6);
}
```

## Implementation Steps

1. **Analyze Requirements**
   - What is the component's primary responsibility?
   - What data does it need (props vs store)?
   - How does it interact with other components?
   - Does it need backend communication via IPC?

2. **Define TypeScript Interfaces**
   - Create prop interface with proper documentation
   - Define any custom types needed
   - Import types from preload definitions

3. **Implement Component Logic**
   - Set up state management (local state vs Zustand)
   - Implement event handlers with useCallback
   - Add any custom hooks needed
   - Handle loading/error states

4. **Style the Component**
   - Create CSS module file
   - Use Mantine design tokens
   - Implement responsive design
   - Add dark theme support

5. **Add Tests**
   - Unit tests for component behavior
   - Integration tests for store interactions
   - Accessibility tests

## Common Patterns

### IPC Communication
```typescript
const handleSaveTrack = useCallback(async (trackData: Partial<Track>) => {
  try {
    const result = await window.Main.tracks.update(trackId, trackData);
    if (result.success) {
      // Update UI state
      setTrackData(result.data);
    } else {
      // Handle error
      console.error('Failed to save track:', result.error);
    }
  } catch (error) {
    console.error('IPC error:', error);
  }
}, [trackId]);
```

### Store Integration
```typescript
const {
  tracks,
  currentTrack,
  isPlaying,
  setCurrentTrack,
  togglePlayback
} = usePlayerStore();
```

### Form Handling
```typescript
import { useForm } from '@mantine/form';

const form = useForm({
  initialValues: {
    title: '',
    artist: '',
  },
  validate: {
    title: (value) => value.length < 1 ? 'Title is required' : null,
  },
});
```

## Questions to Ask

If requirements are unclear, ask:

1. **Component Purpose**: What specific functionality should this component provide?
2. **Data Requirements**: What data does it need? Where does it come from?
3. **User Interactions**: What actions can users perform?
4. **Integration Points**: How does it interact with the player, library, or playlists?
5. **Visual Design**: Are there specific design requirements or references?
6. **Performance Considerations**: Will it handle large datasets or frequent updates?

## Validation Checklist

Before completing the component:
- [ ] TypeScript interfaces are properly defined
- [ ] Component follows functional pattern with hooks
- [ ] Mantine UI components are used appropriately
- [ ] CSS modules are implemented with design tokens
- [ ] IPC communication is properly typed and error-handled
- [ ] Store integration follows established patterns
- [ ] Component is memoized if needed for performance
- [ ] Accessibility attributes are included
- [ ] Component is exported with proper displayName
- [ ] Documentation/comments explain complex logic

Generate the component following these guidelines and ask for clarification if any requirements are unclear.
