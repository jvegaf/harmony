<!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/typescript-5-es2022.instructions.md -->
<!-- and: https://github.com/github/awesome-copilot/blob/main/instructions/reactjs.instructions.md -->
---
applyTo: "**/*.ts,**/*.tsx"
description: "TypeScript and React development standards for Harmony desktop app"
---

# TypeScript & React Guidelines for Harmony

## TypeScript Standards

### Core Principles
- **Target TypeScript 5.x / ES2022** - use native features over polyfills
- **Strict mode enabled** - use strict type checking throughout
- **Explicit typing** for public APIs and complex functions
- **Avoid `any`** - prefer `unknown` with type guards when uncertain

### Type Organization
- **Interfaces** for object shapes that may be extended
- **Type aliases** for unions, utility types, and simple aliases
- **Enums** sparingly - prefer string unions unless reverse mapping needed
- **Generic types** for reusable component patterns

### Naming & Style
- **PascalCase** for classes, interfaces, enums, type aliases
- **camelCase** for variables, functions, and properties
- **Descriptive names** that reflect domain meaning, not implementation
- **No interface prefixes** like `I` - rely on clear, descriptive names

### Error Handling
- **Always use try-catch** for async operations in main process
- **Structured error responses** for IPC communication
- **Log errors** with electron-log in main/preload processes
- **Graceful degradation** for non-critical failures

## React Development

### Component Architecture
- **Functional components** with hooks only (no class components)
- **Single responsibility** - keep components focused and small
- **Composition over inheritance** - use component composition patterns
- **Custom hooks** for reusable stateful logic
- **Mantine UI components** as base building blocks

### Hooks & State Management
- **useState** for local component state
- **useReducer** for complex state logic
- **useContext** for component tree sharing
- **Zustand stores** for global application state
- **Proper dependency arrays** in useEffect to avoid infinite loops
- **Cleanup functions** in effects to prevent memory leaks

### Performance Optimization
- **React.memo** for expensive component renders
- **useMemo/useCallback** for expensive computations (use judiciously)
- **Code splitting** with React.lazy and Suspense
- **Avoid anonymous functions** in render - they create new references

### Electron-Specific Patterns
- **IPC communication** via `window.Main.*` in renderer
- **Type-safe IPC** with shared type definitions from preload
- **Error boundaries** for component-level error handling
- **Process isolation** - keep main process logic separate from UI logic

## Code Style Standards

### Import Organization (Required)
```typescript
// 1. Node/Electron built-ins
import { app, BrowserWindow } from 'electron';
import { join } from 'path';

// 2. External packages
import log from 'electron-log';
import { DataSource } from 'typeorm';

// 3. Internal modules by alias
import ApplicationMenuModule from '@main/modules/ApplicationMenuModule';
import { Track } from '@preload/types/harmony';

// 4. Relative imports
import styles from './Component.module.css';
```

### Formatting Rules
- **Single quotes** for strings (except JSX attributes)
- **Semicolons required** - never rely on ASI
- **Trailing commas** always in objects/arrays
- **120 character** line limit
- **2 space** indentation

### Function Signatures
```typescript
// Explicit return types for public APIs
export async function processTrack(track: Track): Promise<ProcessResult> {
  // Implementation
}

// Async/await over Promises
async function handleIPC(data: unknown): Promise<void> {
  try {
    await processData(data);
  } catch (error) {
    log.error('IPC handling failed:', error);
    throw error;
  }
}
```

## Architecture Patterns

### Module Structure (Main Process)
```typescript
import { BaseModule } from './BaseModule';
import log from 'electron-log';

export default class ExampleModule extends BaseModule {
  async load(): Promise<void> {
    log.info('ExampleModule initializing');
    // Setup logic here
  }

  private handleSomething(): void {
    // Private implementation
  }
}
```

### IPC Communication
```typescript
// Preload: Type definitions
export interface TrackUpdateRequest {
  id: string;
  updates: Partial<Track>;
}

// Main: Handler implementation
ipcMain.handle(channels.TRACK_UPDATE, async (_, request: TrackUpdateRequest) => {
  try {
    const result = await trackService.update(request.id, request.updates);
    return { success: true, data: result };
  } catch (error) {
    log.error('Track update failed:', error);
    return { success: false, error: String(error) };
  }
});

// Renderer: Usage
const updateTrack = async (id: string, updates: Partial<Track>) => {
  const result = await window.Main.tracks.update({ id, updates });
  if (!result.success) {
    console.error('Failed to update track:', result.error);
  }
  return result;
};
```

### React Component Patterns
```typescript
import { memo, useCallback } from 'react';
import { Button } from '@mantine/core';
import styles from './TrackItem.module.css';

interface TrackItemProps {
  track: Track;
  onPlay: (track: Track) => void;
  onEdit: (track: Track) => void;
}

export const TrackItem = memo<TrackItemProps>(({ track, onPlay, onEdit }) => {
  const handlePlay = useCallback(() => {
    onPlay(track);
  }, [track, onPlay]);

  const handleEdit = useCallback(() => {
    onEdit(track);
  }, [track, onEdit]);

  return (
    <div className={styles.container}>
      <span className={styles.title}>{track.title}</span>
      <Button onClick={handlePlay} size="sm">Play</Button>
      <Button onClick={handleEdit} variant="subtle" size="sm">Edit</Button>
    </div>
  );
});

TrackItem.displayName = 'TrackItem';
```

## Testing Guidelines

### Unit Testing
- **Test component behavior**, not implementation details
- **Mock external dependencies** appropriately
- **Test error scenarios** and edge cases
- **Use descriptive test names** that explain expected behavior

### Integration Testing
- **Test IPC communication** between processes
- **Test database operations** with TypeORM
- **Test component interactions** within feature groups
- **Test critical user workflows** end-to-end

## Common Anti-Patterns to Avoid

### TypeScript
- Using `any` instead of proper typing
- Ignoring TypeScript errors with `@ts-ignore`
- Creating overly complex type hierarchies
- Not using strict mode settings

### React
- Class components instead of functional components
- Direct state mutation instead of immutable updates
- Missing dependency arrays in useEffect
- Anonymous functions in JSX props
- Overusing useMemo/useCallback for simple values

### Electron
- Blocking the main process with synchronous operations
- Using ipcRenderer directly instead of preload bridge
- Storing sensitive data in localStorage
- Not validating IPC message data
