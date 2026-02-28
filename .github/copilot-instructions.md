# Harmony - GitHub Copilot Instructions

<!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/typescript-5-es2022.instructions.md -->
<!-- and: https://github.com/github/awesome-copilot/blob/main/instructions/reactjs.instructions.md -->

## Project Overview

**Harmony** is an Electron-based music manager for old-school DJs, built with TypeScript, React, and Vite. This desktop application manages music libraries, provides DJ tools, and integrates with various music services.

## Technology Stack

- **Frontend**: React 18 with Mantine UI components and React Router
- **Backend**: Tauri v2 with Rust, rusqlite (SQLite), and Tauri command system
- **Build**: Tauri CLI, Vite, cargo
- **Package Manager**: pnpm
- **Database**: SQLite with rusqlite
- **Styling**: CSS Modules + Mantine UI components

## Core Development Principles

### Architecture Standards
- **Three-Process Model**: Main (Node.js/Electron), Preload (IPC bridge), Renderer (React UI)
- **Module System**: Base classes in `src/main/modules/` with standardized lifecycle methods
- **IPC Communication**: Strongly typed channels defined in `src/preload/lib/ipc-channels.ts`
- **Database Layer**: Drizzle schema in `src/main/lib/db/schema.ts`, Database singleton with better-sqlite3

### Code Quality Standards
- **TypeScript Strict Mode**: All code must be TypeScript with strict type checking
- **Functional Components**: React functional components with hooks only (no class components)
- **Immutable Patterns**: Prefer immutable data structures and pure functions
- **Single Responsibility**: Components and modules should have clear, focused purposes

### Project File Organization
```
src/
├── main/           # Electron main process (Node.js backend)
├── preload/        # IPC bridge and type definitions
└── renderer/       # React frontend (browser context)
```

## Key Guidelines

### Import Organization
1. **Node/Electron built-ins**: `import { app, BrowserWindow } from 'electron';`
2. **External packages**: `import log from 'electron-log';`
3. **Internal modules by alias**: `@main/*`, `@renderer/*`, `@preload/*`
4. **Relative imports**: `import './styles.css';`
5. **No blank lines** within categories; **one blank line** between categories

### Naming Conventions
- **Files**: PascalCase for modules (`DatabaseModule.ts`), camelCase for utilities (`utils-cover.ts`)
- **Components**: PascalCase (`AppHeader.tsx`)
- **Functions/variables**: camelCase (`initModules`, `trackPlaying`)
- **Constants**: UPPER_SNAKE_CASE (`DB_PATH`)
- **Types/Interfaces**: PascalCase (`Track`, `PlayerStatus`)

### Error Handling & Logging
- **Main/Preload**: Always use `electron-log` (never `console.*`)
- **Renderer**: `console.*` acceptable, but prefer IPC logging for critical errors
- **Async Operations**: Always wrap in try-catch with structured error handling
- **IPC Handlers**: Return error info to renderer rather than throwing

### Package Manager
- **pnpm**: This project uses pnpm as its package manager
- **Scripts**: Use `pnpm run dev`, `pnpm run build`, `pnpm run lint`, `pnpm run typecheck`

## Development Workflow

### Before Code Changes
1. Run `pnpm run typecheck` to verify type safety
2. Run `pnpm run lint` to check code style
3. Understand the Tauri architecture and command system

### Implementation Standards
- **Module Creation**: Extend `BaseModule` or `BaseWindowModule` for main process modules
- **IPC Channels**: Define typed channels in `preload/lib/ipc-channels.ts`
- **Database**: Use Drizzle ORM with schema-defined tables, better-sqlite3 for queries
- **UI Components**: Use Mantine UI components with CSS Modules for custom styling
- **State Management**: Zustand stores in `src/renderer/src/stores/`

### Testing & Validation
- Run `pnpm run build` to verify build process
- Test Tauri commands and frontend integration
- Validate database operations
- Test audio processing and metadata extraction

## Security Considerations
- **IPC Security**: Validate all data passing between main and renderer processes
- **File System Access**: Sanitize file paths to prevent directory traversal
- **Database Security**: Use parameterized queries through TypeORM
- **External APIs**: Validate and sanitize all external music service integrations

## Performance Guidelines
- **Database**: Use proper indexes and avoid N+1 queries
- **React**: Use React.memo, useMemo, useCallback for optimization
- **Electron**: Minimize main process blocking operations
- **Build**: Leverage Vite's bundling optimizations and code splitting

## Documentation Standards
- **No AI-DEV notes in source code** - create docs in `docs/` folder if needed
- **JSDoc for public APIs** with `@example` when helpful
- **README updates** for significant architectural changes
- **Type definitions** must be comprehensive and exported from appropriate modules

## Common Patterns

### Module Template (Main Process)
```typescript
import { BaseModule } from './BaseModule';
import log from 'electron-log';

export default class ExampleModule extends BaseModule {
  async load(): Promise<void> {
    log.info('ExampleModule loaded');
    // Initialization logic
  }
}
```

### IPC Handler Template
```typescript
ipcMain.handle(channels.EXAMPLE_ACTION, async (_, data: ExampleType) => {
  try {
    const result = await exampleService.process(data);
    return { success: true, data: result };
  } catch (error) {
    log.error('Example action failed:', error);
    return { success: false, error: String(error) };
  }
});
```

### React Component Template
```typescript
import { memo } from 'react';
import { Button } from '@mantine/core';
import styles from './ExampleComponent.module.css';

interface ExampleComponentProps {
  title: string;
  onClick: () => void;
}

export const ExampleComponent = memo<ExampleComponentProps>(({ title, onClick }) => {
  return (
    <Button
      className={styles.button}
      onClick={onClick}
    >
      {title}
    </Button>
  );
});

ExampleComponent.displayName = 'ExampleComponent';
```

## References
- [Harmony AGENTS.md](./AGENTS.md) - Detailed development guidelines
- [Electron Documentation](https://www.electronjs.org/docs/)
- [React 18 Documentation](https://react.dev/)
- [Mantine UI Components](https://mantine.dev/)
- [TypeORM Documentation](https://typeorm.io/)
