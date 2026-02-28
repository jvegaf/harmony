# Harmony - GitHub Copilot Instructions

<!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/typescript-5-es2022.instructions.md -->
<!-- and: https://github.com/github/awesome-copilot/blob/main/instructions/reactjs.instructions.md -->

## Project Overview

**Harmony** is a Tauri v2-based music manager for old-school DJs, built with TypeScript, React, Rust, and Vite. This desktop application manages music libraries, provides DJ tools, and integrates with various music services.

## Technology Stack

- **Frontend**: React 18 with Mantine UI components and React Router
- **Backend**: Tauri v2 with Rust, rusqlite (SQLite), and Tauri command system
- **Build**: Tauri CLI, Vite, cargo
- **Package Manager**: pnpm
- **Database**: SQLite with rusqlite
- **Styling**: CSS Modules + Mantine UI components

## Core Development Principles

### Architecture Standards
- **Two-Process Model**: Backend (Rust/Tauri), Frontend (React UI in WebView)
- **IPC Communication**: Tauri commands via `invoke()` API from `@tauri-apps/api/core`
- **Abstraction Layer**: `src/lib/tauri-api.ts` provides unified API for frontend
- **Database Layer**: rusqlite with Rust structs in `src-tauri/src/libs/database.rs`

### Code Quality Standards
- **TypeScript Strict Mode**: All code must be TypeScript with strict type checking
- **Functional Components**: React functional components with hooks only (no class components)
- **Immutable Patterns**: Prefer immutable data structures and pure functions
- **Single Responsibility**: Components and modules should have clear, focused purposes

### Project File Organization
```
src/              # React frontend (WebView context)
src-tauri/        # Rust backend (Tauri commands, database, file I/O)
```

## Key Guidelines

### Import Organization
1. **Tauri API imports first**: `import { invoke } from '@tauri-apps/api/core';`
2. **External packages**: `import { Button } from '@mantine/core';`
3. **Internal modules by alias**: `@/*` → `src/*`
4. **Relative imports**: `import './styles.css';`
5. **No blank lines** within categories; **one blank line** between categories

### Naming Conventions
- **Files**: PascalCase for modules (`DatabaseModule.ts`), camelCase for utilities (`utils-cover.ts`)
- **Components**: PascalCase (`AppHeader.tsx`)
- **Functions/variables**: camelCase (`initModules`, `trackPlaying`)
- **Constants**: UPPER_SNAKE_CASE (`DB_PATH`)
- **Types/Interfaces**: PascalCase (`Track`, `PlayerStatus`)

### Error Handling & Logging
- **Backend (Rust)**: Use `log` crate macros (`info!`, `error!`, `warn!`, `debug!`)
- **Frontend (TypeScript)**: Use Tauri's logger plugin from `@tauri-apps/plugin-log`
- **Async Operations**: Always wrap in try-catch with structured error handling
- **Tauri Commands**: Return `Result<T, E>` in Rust for proper error propagation

### Package Manager
- **pnpm**: This project uses pnpm as its package manager
- **Scripts**: Use `pnpm run dev`, `pnpm run build`, `pnpm run lint`, `pnpm run typecheck`

## Development Workflow

### Before Code Changes
1. Run `pnpm run typecheck` to verify type safety
2. Run `pnpm run lint` to check code style
3. Understand the Tauri architecture and command system

### Implementation Standards
- **Tauri Commands**: Define commands in `src-tauri/src/libs/` with `#[tauri::command]` macro
- **Database**: Use rusqlite with Rust structs for schema and queries
- **UI Components**: Use Mantine UI components with CSS Modules for custom styling
- **State Management**: Zustand stores in `src/stores/`

### Testing & Validation
- Run `pnpm run build` to verify build process
- Test Tauri commands and frontend integration
- Validate database operations
- Test audio processing and metadata extraction

## Security Considerations
- **Tauri Security**: All commands validated, CSP configured in `tauri.conf.json`
- **File System Access**: Sanitize file paths to prevent directory traversal
- **Database Security**: Use parameterized queries through rusqlite
- **External APIs**: Validate and sanitize all external music service integrations

## Performance Guidelines
- **Database**: Use proper indexes and avoid N+1 queries
- **React**: Use React.memo, useMemo, useCallback for optimization
- **Tauri**: Minimize blocking operations, use async Rust functions
- **Build**: Leverage Vite's bundling optimizations and code splitting

## Documentation Standards
- **No AI-DEV notes in source code** - create docs in `docs/` folder if needed
- **JSDoc for public APIs** with `@example` when helpful
- **README updates** for significant architectural changes
- **Type definitions** must be comprehensive and exported from appropriate modules

## Common Patterns

### Tauri Command Template (Rust)
```rust
#[tauri::command]
async fn example_action(data: ExampleType) -> Result<ExampleResult, String> {
    info!("Processing example action");
    
    match process_data(data).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Example action failed: {}", e);
            Err(e.to_string())
        }
    }
}
```

### Frontend API Call Template
```typescript
import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/lib/tauri-api';

async function exampleAction(data: ExampleType): Promise<ExampleResult> {
  try {
    const result = await invoke<ExampleResult>('example_action', { data });
    return result;
  } catch (error) {
    logger.error('Example action failed:', error);
    throw error;
  }
}
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
- [Harmony AGENTS.md](../AGENTS.md) - Detailed development guidelines
- [Tauri Documentation](https://tauri.app/v2/)
- [React 18 Documentation](https://react.dev/)
- [Mantine UI Components](https://mantine.dev/)
- [rusqlite Documentation](https://docs.rs/rusqlite/)
