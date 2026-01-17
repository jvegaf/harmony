# AGENTS.md - Harmony Project

## Project Overview

**Harmony** is an Electron-based music manager for old-school DJs, built with TypeScript, React, and Vite. The project uses:

- **Frontend**: React 18 with Mantine UI components and React Router
- **Backend**: Electron with TypeScript, TypeORM (SQLite), and IPC-based architecture
- **Build**: electron-vite, Vite, electron-builder
- **Package Manager**: Yarn (preferred over npm/pnpm)

---

## Build, Lint, Test Commands

### Development

```bash
yarn dev                # Start development mode with hot reload
yarn start              # Preview built app
```

### Build

```bash
yarn build              # TypeCheck + build for current platform
yarn build:win          # Build Windows installer
yarn build:linux        # Build Linux AppImage/deb
yarn release            # Create production release
```

### Code Quality

```bash
yarn lint               # ESLint with auto-fix
yarn format             # Prettier auto-format all files
yarn typecheck          # Run both node + web type checks
yarn typecheck:node     # TypeCheck main/preload (tsconfig.node.json)
yarn typecheck:web      # TypeCheck renderer (tsconfig.web.json)
```

### Makefile shortcuts

```bash
make dev                # Same as yarn dev
make lint               # Same as yarn lint
make check              # Same as yarn typecheck
make clean              # Remove out/ and dist/ folders
make build/linux        # Clean + build Linux
```

**Note**: There are no test files currently in the project. When adding tests, use a `.test.ts` or `.spec.ts` suffix.

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

**Never manually format**—run `yarn format` or let your IDE auto-format on save.

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

### Database (TypeORM + SQLite)

- **Location**: `~/.config/harmony/database/harmony.db` (Linux), similar on Win/Mac
- **Entities**: `TrackEntity`, `PlaylistEntity` in `src/main/lib/db/entities/`
- **Access**: Via `Database` class in `src/main/lib/db/database.ts`

---

## Common Pitfalls to Avoid

1. **Don't modify `package.json` scripts without checking dependencies**—yarn scripts are orchestrated
2. **Don't use `npm` or `pnpm`**—this is a Yarn project (see `yarn.lock`)
3. **Don't skip type checking**—always run `yarn typecheck` before committing
4. **Don't mix console.log and electron-log** in main process—use `log.*` only
5. **Don't use `any` as a crutch**—ESLint allows it but prefer proper typing
6. **Don't hardcode paths**—use Electron's `app.getPath()` for user data
7. **Don't commit without running `yarn lint`**—auto-fix is enabled

---

## Documentation

**Don't add AI-DEV notes in source code. If needed create a document in docs/ folder.**

---

## When Unsure, Ask!

- **Architecture decisions**: Consult before adding new modules or dependencies
- **Breaking changes**: Confirm before modifying shared types (`preload/types/`)
- **Database schema**: Migrations are auto-sync'd but check with team for production
- **Large refactors**: >300 LOC or >3 files requires human review

---

**Last Updated**: 2026-01-17
