# AGENTS.md - Harmony Project

## Project Overview

**Harmony** is an Electron-based music manager for old-school DJs, built with TypeScript, React, and Vite. The project uses:

- **Frontend**: React 18 with Mantine UI components and React Router
- **Backend**: Electron with TypeScript, Drizzle ORM (SQLite), and IPC-based architecture
- **Build**: electron-vite, Vite, electron-builder
- **Package Manager**: npm

---

## Build, Lint, Test Commands

### Development

```bash
npm run dev             # Start development mode with hot reload
npm start               # Preview built app
```

### Build

```bash
npm run build           # TypeCheck + build for current platform
npm run build:win       # Build Windows installer
npm run build:linux     # Build Linux AppImage/deb
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

1. **Node/Electron built-ins first**: `import { app, shell } from 'electron';`
2. **External packages**: `import log from 'electron-log';`
3. **Internal modules by alias**:
   - `@main/*` → `src/main/*`
   - `@renderer/*` → `src/renderer/src/*`
   - `@preload/*` → `src/preload/*`
4. **Relative imports last**: `import styles from './Root.module.css';`
5. **No blank lines** between imports of the same category; **one blank line** between categories

**Example**:

```typescript
import { app, BrowserWindow } from 'electron';
import { join } from 'path';

import log from 'electron-log';
import { DataSource } from 'typeorm';

import ApplicationMenuModule from './modules/ApplicationMenuModule';
import * as ModulesManager from './lib/modules-manager';

import icon from '../../resources/icon.png?asset';
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

#### Logger (electron-log)

- **Always use `electron-log`** in main/preload processes (never `console.*`)
- **Import**: `import log from 'electron-log';`
- **Usage**:
  ```typescript
  log.info('Starting Harmony...');
  log.error('Database init failed:', error);
  log.warn('Deprecated API used');
  ```
- In **renderer** (browser): `console.*` is acceptable but prefer IPC logging for critical errors
- **Avoid** bare `console.log` in production code (test/debug code is OK)

#### Error Handling Patterns

- **Use try-catch** for async operations that may fail:
  ```typescript
  try {
    await db.insertTracks(tracks);
  } catch (error) {
    log.error('Failed to insert tracks:', error);
    throw error; // or handle gracefully
  }
  ```
- **Avoid silent failures**—always log errors at minimum
- For IPC handlers, return error info to renderer rather than throwing:
  ```typescript
  ipcMain.handle(channels.TRACK_UPDATE, async (_, track: Track) => {
    try {
      await db.updateTrack(track);
      return { success: true };
    } catch (error) {
      log.error('Track update failed:', error);
      return { success: false, error: String(error) };
    }
  });
  ```

### React/JSX Patterns

- **Functional components only** (no class components)
- **Hooks**: Use built-in hooks + custom hooks from `src/renderer/src/hooks/`
- **State management**: Zustand stores in `src/renderer/src/stores/`
- **Styling**: CSS Modules (`.module.css`) for component styles, Mantine components for UI
- **IPC calls**: Access via `window.Main.*` in renderer (defined in preload)

---

## Architecture Notes

### Three-Process Model

1. **Main** (`src/main/`): Node.js/Electron backend, database, file system, IPC handlers
2. **Preload** (`src/preload/`): IPC bridge, type definitions shared between main and renderer
3. **Renderer** (`src/renderer/`): React UI, runs in browser context with limited Node access

### Module System (Main Process)

- Base class: `ModuleWindow` in `src/main/modules/BaseWindowModule.ts`
- Each module has a `load()` method called by `ModulesManager.init()`
- Examples: `DatabaseModule`, `IPCLibraryModule`, `PowerModule`

### IPC Communication

- **Channels** defined in `src/preload/lib/ipc-channels.ts`
- **Main**: `ipcMain.handle()` for async request/response
- **Renderer**: `window.Main.db.*`, `window.Main.cover.*`, etc. (see `preload/index.d.ts`)

### Database (Drizzle ORM + SQLite)

- **Location**: `~/.config/harmony/database/harmony.db` (Linux), similar on Win/Mac
- **Schema**: Tables defined in `src/main/lib/db/schema.ts` (tracks, playlists, playlistTracks, cuePoints, folders)
- **Access**: Via `Database` singleton class in `src/main/lib/db/database.ts` with better-sqlite3

---

## Common Pitfalls to Avoid

1. **Don't modify `package.json` scripts without checking dependencies**—npm scripts are orchestrated
2. **Don't use `pnpm` or `yarn`**—this is an npm project (see `package-lock.json`)
3. **Don't skip type checking**—always run `npm run typecheck` before committing
4. **Don't mix console.log and electron-log** in main process—use `log.*` only
5. **Don't use `any` as a crutch**—ESLint allows it but prefer proper typing
6. **Don't hardcode paths**—use Electron's `app.getPath()` for user data
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
- **Breaking changes**: Confirm before modifying shared types (`preload/types/`)
- **Database schema**: Migrations are auto-sync'd but check with team for production
- **Large refactors**: >300 LOC or >3 files requires human review
- **Skill selection**: If uncertain which skill applies, ask for guidance

---

**Last Updated**: 2026-02-13
