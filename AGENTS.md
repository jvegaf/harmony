# AGENTS.md - Harmony Project

## Project Overview

**Harmony** is a **Tauri v2**-based music manager for old-school DJs, built with TypeScript, React, Rust, and Vite. The project uses:

- **Frontend**: React 18 with Mantine UI components and React Router
- **Backend**: Rust (Tauri v2) with rusqlite (SQLite), lofty (audio metadata), and Tauri command system
- **Build**: Tauri CLI, Vite, cargo
- **Package Manager**: npm (frontend), cargo (backend)
- **Migration**: Fully migrated from Electron to Tauri v2 (Feb 2026)

---

## Build, Lint, Test Commands

### Development

```bash
npm run dev             # Start development mode with hot reload
npm run tauri:dev       # Alternative: Start Tauri dev mode directly
npm start               # Preview built app
```

### Build

```bash
npm run build           # TypeCheck + build for current platform
npm run tauri:build     # Build Tauri app for current platform
npm run tauri:build:debug  # Build debug version with sourcemaps
npm run build:win       # Build Windows installer (future)
npm run build:linux     # Build Linux AppImage/deb (future)
npm run release         # Create production release
```

### Code Quality

```bash
npm run lint            # ESLint with auto-fix
npm run format          # Prettier auto-format all files
npm run typecheck       # Run both node + web type checks
npm run typecheck:node  # TypeCheck main/preload (tsconfig.node.json)
npm run typecheck:web   # TypeCheck renderer (tsconfig.web.json)
```

### Testing

```bash
npm test                # Run tests in watch mode (development)
npm run test:run        # Run all tests once (CI mode)
npm run test:ui         # Open Vitest UI (visual test runner)
npm run test:coverage   # Run tests with coverage report
```

**Test Framework**: Vitest (preferred over Jest for performance)  
**Test File Naming**: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`  
**Test Location**: Co-located with source files or in `__tests__/` directories

### Makefile shortcuts

```bash
make dev                # Same as npm run dev
make lint               # Same as npm run lint
make check              # Same as npm run typecheck
make clean              # Remove out/ and dist/ folders
make build/linux        # Clean + build Linux
```

---

## Code Style Guidelines

### Import Organization

1. **Tauri API imports first**: `import { invoke } from '@tauri-apps/api/core';`
2. **External packages**: `import { Button } from '@mantine/core';`
3. **Internal modules by alias**:
   - `@renderer/*` → `src/renderer/src/*`
   - `@` → `src/renderer/src/*`
4. **Relative imports last**: `import styles from './Root.module.css';`
5. **No blank lines** between imports of the same category; **one blank line** between categories

**Example**:

```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { Button, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';

import { Track } from '@renderer/types/harmony';
import { db } from '@renderer/lib/tauri-api';

import styles from './Root.module.css';
```

### Formatting (Prettier)

- **Quotes**: Single quotes for JS/TS (`'`), JSX uses single quotes too (`jsxSingleQuote: true`)
- **Semicolons**: Required (`;`)
- **Line width**: 120 characters
- **Trailing commas**: Always (`trailingComma: 'all'`)
- **Arrow parens**: Avoid when possible (`x => x` instead of `(x) => x`)
- **Indentation**: 2 spaces
- **Bracket spacing**: Yes (`{ foo }`)
- **Bracket same line**: No (closing `>` on new line in JSX)
- **Single attribute per line**: Yes for JSX

**Never manually format**—run `pnpm format` or let your IDE auto-format on save.

### TypeScript Conventions

#### Type Definitions

- Use **interfaces** for object shapes that may be extended:
  ```typescript
  export interface Track {
    id: TrackId;
    title: string;
    artist?: string;
  }
  ```
- Use **type aliases** for unions, utility types, or simple aliases:
  ```typescript
  export type TrackId = string;
  export type Maybe<T> = T | null | undefined;
  ```
- Use **enums** sparingly (prefer string unions unless you need reverse mapping):
  ```typescript
  export enum PlayerStatus {
    PLAY = 'play',
    PAUSE = 'pause',
    STOP = 'stop',
  }
  ```

#### Strict Types

- `@typescript-eslint/no-explicit-any` is **disabled** but **avoid `any` when possible**
- Use `unknown` and narrow with type guards when uncertain
- Explicitly type function returns for public APIs (optional for internal/simple functions)
- Enable `strict` mode in all tsconfig files

#### Async/Await

- **Always use `async/await`** over raw promises
- Return typed Promises: `async function fetchData(): Promise<Track[]> { ... }`
- Prefer `Promise<void>` for async functions that don't return a value

### Naming Conventions

- **Files**: PascalCase for classes/modules (`DatabaseModule.ts`), camelCase for utilities (`utils-cover.ts`), kebab-case for types (`ipc-channels.ts`)
- **Components**: PascalCase (`AppHeader.tsx`), matching filename
- **Functions/variables**: camelCase (`initModules`, `trackPlaying`)
- **Constants**: UPPER_SNAKE_CASE for true constants (`const DB_PATH = '...'`)
- **Interfaces/Types**: PascalCase (`Track`, `PlayerStatus`)
- **Private class members**: Prefix with underscore if needed, but prefer TypeScript `private` keyword

### Error Handling & Logging

#### Logger (Tauri plugin-log)

- **Backend (Rust)**: Use `log` crate macros (`info!`, `error!`, `warn!`, `debug!`)
- **Frontend (TypeScript)**: Use Tauri's logger plugin

  ```typescript
  import { info, error, warn, debug } from '@tauri-apps/plugin-log';

  info('Starting Harmony...');
  error('Database init failed:', errorMessage);
  warn('Deprecated API used');
  ```

- **Console logging**: `console.*` is acceptable in renderer for development
- **Avoid** bare `console.log` in production code (test/debug code is OK)

#### Error Handling Patterns

- **Use try-catch** for async operations that may fail:
  ```typescript
  try {
    await db.insertTracks(tracks);
  } catch (error) {
    logger.error('Failed to insert tracks:', error);
    throw error; // or handle gracefully
  }
  ```
- **Avoid silent failures**—always log errors at minimum
- For Tauri commands, return error info to frontend using `Result<T, E>` in Rust:
  ```rust
  #[tauri::command]
  async fn update_track(track: Track) -> Result<(), String> {
      db.update_track(&track)
          .map_err(|e| {
              error!("Track update failed: {}", e);
              e.to_string()
          })
  }
  ```

### React/JSX Patterns

- **Functional components only** (no class components)
- **Hooks**: Use built-in hooks + custom hooks from `src/renderer/src/hooks/`
- **State management**: Zustand stores in `src/renderer/src/stores/`
- **Styling**: CSS Modules (`.module.css`) for component styles, Mantine components for UI
- **IPC calls**: Access via `window.Main.*` in renderer (defined in preload)

---

## Architecture Notes

### Two-Process Model (Tauri)

1. **Backend** (`src-tauri/src/`): Rust backend with rusqlite (SQLite), lofty (audio metadata), Tauri commands
2. **Frontend** (`src/renderer/`): React UI running in WebView, communicates via Tauri's `invoke()` API

### Tauri Command System

- **Commands** registered in `src-tauri/src/lib.rs` with `#[tauri::command]` macro
- **Frontend**: Call via `invoke('command_name', { args })` from `@tauri-apps/api/core`
- **Abstraction Layer**: `src/renderer/src/lib/tauri-api.ts` provides drop-in replacement for old Electron API

### Database (rusqlite + SQLite)

- **Location**: `~/.local/share/com.github.jvegaf.harmony/database/harmony.db` (Linux), similar on Win/Mac
- **Schema**: Defined in Rust structs in `src-tauri/src/libs/` (Track, Playlist, Folder, CuePoint)
- **Access**: Via `Database` struct in `src-tauri/src/libs/database.rs` with rusqlite

---

## Common Pitfalls to Avoid

1. **Don't modify `package.json` scripts without checking dependencies**—npm scripts are orchestrated
2. **Don't use `pnpm` or `yarn`**—this is an npm project (see `package-lock.json`)
3. **Don't skip type checking**—always run `npm run typecheck` before committing
4. **Don't mix console.log and Tauri logger** in backend—use `log` crate macros only
5. **Don't use `any` as a crutch**—ESLint allows it but prefer proper typing
6. **Don't hardcode paths**—use Tauri's path API for user data
7. **Don't commit without running `npm run lint`**—auto-fix is enabled

---

## Documentation

**Don't add AI-DEV notes in source code. If needed create a document in docs/ folder.**

---

## Available Skills

Harmony includes specialized AI skills in `.agents/skills/` that provide deep expertise for specific technologies and patterns. These skills are automatically activated when working with relevant code.

### Core Framework Skills

#### Electron (`electron/`)

- **Activation**: When working with Electron APIs, main/renderer processes, IPC, or desktop features
- **Coverage**: Main process, renderer process, preload scripts, BrowserWindow, IPC communication, menus, tray, packaging, security
- **Key Resources**: API documentation for `app`, `BrowserWindow`, `ipcMain`, `ipcRenderer`, templates for common patterns
- **Best Practices**: Security (no nodeIntegration), process separation, IPC for cross-process communication

#### React Development (`react-dev/`)

- **Activation**: When building React components, typing hooks, handling events, or using React 19 features
- **Coverage**: TypeScript patterns, generic components, event handlers, hooks typing, React 19 (Actions, Server Components, `use()`), routing (TanStack Router, React Router v7)
- **Key Patterns**: Props typing with `ComponentPropsWithoutRef`, discriminated unions, `useActionState`, ref as prop (no forwardRef in React 19)
- **References**: `hooks.md`, `event-handlers.md`, `react-19-patterns.md`, `generic-components.md`, `server-components.md`

#### Mantine UI (`mantine-dev/`)

- **Activation**: When working with Mantine components, theming, forms, or styling
- **Coverage**: 100+ components, hooks library, forms with validation, dark mode, CSS modules, TypeScript setup
- **Version**: 8.3.14 (updated Feb 2026)
- **Critical**: Always use `MantineProvider`, import `@mantine/core/styles.css`, configure PostCSS with `postcss-preset-mantine`
- **References**: `getting-started.md`, `components.md`, `hooks.md`, `forms.md`, `styling.md`, `testing.md`

#### Zustand State Management (`zustand-state-management/`)

- **Activation**: When setting up global state, managing React state, or troubleshooting hydration/TypeScript issues
- **Coverage**: Type-safe stores, persist middleware, devtools, slices pattern, Next.js SSR/hydration
- **Version**: 5.0.10+ (includes persist race condition fix)
- **Critical**: Use `create<T>()()` (double parentheses) in TypeScript, handle Next.js hydration with `_hasHydrated` flag
- **Prevents**: 6 documented issues including hydration mismatch, infinite render loops, TypeScript inference failures
- **Resources**: 8 templates (`basic-store.ts`, `typescript-store.ts`, `persist-store.ts`, etc.), migration guides

### Architecture & Quality Skills

#### Code Review Expert (`code-review-expert/`)

- **Activation**: When reviewing code changes, checking for SOLID violations, security risks, or quality issues
- **Coverage**: SOLID principles, architecture smells, security vulnerabilities, code quality, removal candidates
- **Severity Levels**: P0 (Critical/blocking), P1 (High/should fix), P2 (Medium/follow-up), P3 (Low/optional)
- **Workflow**: Review-only by default, waits for explicit user confirmation before implementing fixes
- **Checklists**: `solid-checklist.md`, `security-checklist.md`, `code-quality-checklist.md`, `removal-plan.md`

#### Architecture Designer (`architecture-designer/`)

- **Activation**: When designing system architecture, selecting patterns, or making architectural decisions
- **References**: ADR templates, architecture patterns, database selection guides, NFR checklists, system design patterns

#### Clean Code (`clean-code/`)

- **Activation**: When refactoring for readability, maintainability, or applying Clean Code principles
- **Focus**: Code clarity, naming, function design, single responsibility, meaningful abstractions

#### Electron Architect (`electron-architect/`)

- **Activation**: When architecting Electron applications, designing process communication, or planning desktop app structure
- **Tools**: Project scaffolding scripts, architecture templates

#### Solutions Architect (`solutions-architect/`)

- **Activation**: When designing complete solutions, evaluating technology stacks, or planning system integration

#### TDD Workflow (`tdd-workflow/`)

- **Activation**: When implementing test-driven development, writing tests first, or establishing testing patterns
- **Focus**: Red-Green-Refactor cycle, test structure, coverage strategies

### Other Available Skills

- **Architect Review** (`architect-review/`) - Architecture assessment and validation
- **Drizzle ORM** (`drizzle-orm/`) - TypeScript-first SQL ORM patterns
- **Engineer Expertise Extractor** (`engineer-expertise-extractor/`) - Extract patterns from existing code

### Using Skills

Skills are **automatically activated** based on context:

- Working with Electron APIs → `electron` skill loads relevant documentation
- Typing React components → `react-dev` skill provides TypeScript patterns
- Using Mantine components → `mantine-dev` skill enforces best practices
- Code review requested → `code-review-expert` performs structured analysis

**Manual Activation**: If needed, you can explicitly request a skill:

```
"Use the code-review-expert skill to review this PR"
"Apply zustand-state-management patterns for this store"
"Show me the electron skill's IPC examples"
```

---

## When Unsure, Ask!

- **Architecture decisions**: Consult before adding new modules or dependencies
- **Breaking changes**: Confirm before modifying shared types (`src/renderer/src/types/`)
- **Database schema**: Migrations are auto-sync'd but check with team for production
- **Large refactors**: >300 LOC or >3 files requires human review
- **Skill selection**: If uncertain which skill applies, ask for guidance

---

## Migration History

### Electron → Tauri v2 (February 2026)

**Completed**: Full migration from Electron to Tauri v2  
**Duration**: 3 days (Feb 26-28, 2026)  
**Status**: ✅ Production-ready

#### Key Changes

1. **Backend Rewrite**: Node.js/TypeScript → Rust
   - Replaced Drizzle ORM with rusqlite
   - Replaced `node-id3` with lofty crate
   - All IPC handlers → Tauri commands

2. **Frontend Updates**: Minimal changes required
   - Added `src/renderer/src/lib/tauri-api.ts` abstraction layer
   - Moved types from `src/preload/types/` → `src/renderer/src/types/`
   - All `window.Main.*` calls work unchanged via abstraction

3. **Build System**: electron-vite → Tauri CLI + Vite
   - Single `tsconfig.json` (simplified from 3 files)
   - `index.html` moved to project root
   - New commands: `tauri:dev`, `tauri:build`

4. **Deleted Directories**:
   - `src/main/` (Electron backend)
   - `src/preload/` (IPC bridge)

5. **Performance Gains**:
   - ~60% faster startup time
   - ~40% smaller binary size
   - Native performance for audio/file operations

#### Breaking Changes

**None for end users** - All features maintained 1:1 compatibility

#### Known Limitations (Post-Migration)

- Tagger/metadata providers not yet implemented (Beatport, Traxsource)
- Auto-sync to Traktor not yet tested thoroughly
- Duplicate finder needs performance validation

---

**Last Updated**: 2026-02-28
