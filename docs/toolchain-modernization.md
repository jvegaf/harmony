# Toolchain Modernization Notes (Aug 2026)

Documents the dependency modernization pass and the two breakages it caused
(peer dependency conflicts, missing Electron binary), their root causes,
resolutions, and the conventions introduced by the newer toolchain.

## Summary of Version Moves

| Package | Before | After | Constraint driving the move |
| --- | --- | --- | --- |
| typescript | ^7.0.2 | ^6.0.3 | `typescript-eslint@8.67.0` requires `<6.1.0`; no published release supports TS 7 yet |
| vite | ^8.2.2 | ^7.3.6 | `electron-vite@5` (stable) requires `^5 \|\| ^6 \|\| ^7`; vite 8 support only exists in electron-vite 6 betas |
| @vitejs/plugin-react | ^6.1.0 | ^5.2.0 | plugin-react 6.x requires vite `^8`; 5.2 supports `^4–^8` |
| eslint | ^10.9.0 | ^9.39.5 | `eslint-plugin-react@7.37.5` supports at most `^9.7` |
| @eslint/js | ^10.0.1 | ^9.39.5 | must match the eslint major |

Rejected alternative: upgrading to `electron-vite@6.0.0-beta.x` to keep vite 8.
Beta build tooling is not acceptable for a production app; revisit when
electron-vite 6 goes stable.

## Verification Gate: `pnpm peers check`

Run this after any dependency change:

```bash
pnpm peers check   # exits clean when no peer conflicts remain
```

The full check pipeline after dependency work:

```bash
pnpm peers check && pnpm run typecheck && pnpm run lint && pnpm run test:run
```

## TypeScript 6 Migration (tsconfig)

TypeScript 6 deprecates `baseUrl`. Both project tsconfigs were migrated:

- Removed `"baseUrl": "."` from `tsconfig.node.json` and `tsconfig.web.json`
- Removed the stale `"ignoreDeprecations": "5.0"` from `tsconfig.node.json`
- Made all `paths` values explicitly relative (`"./src/main/*"` instead of
  `"src/main/*"`); without `baseUrl`, non-relative path values are a hard
  error (`TS5090`)

Note: TS 7 is the Go-based compiler and did not report errors that classic
tsc 6 catches. Downgrading surfaced real bugs — see below.

## Type Errors Surfaced by the Downgrade (and Their Patterns)

These are the canonical fixes to reuse when similar errors reappear:

### 1. Worker `'error'` handlers receive `unknown`

With current `@types/node`, `worker.on('error', ...)` gives `unknown`.
Normalize with the established codebase pattern before passing to typed
callbacks:

```typescript
error instanceof Error ? error : new Error(String(error))
```

Applied in `src/main/lib/audio-analysis/worker-pool.ts` and
`src/main/lib/traktor/sync/worker-pool.ts`.

### 2. Axios response headers are not `string`

`response.headers['content-type']` is `AxiosHeaderValue`
(`string | string[] | number | boolean | AxiosHeaders | null`):

```typescript
mime: String(response.headers['content-type'] ?? '')
```

### 3. `music-metadata` picture data is `Uint8Array`, not `Buffer`

Since music-metadata v11, `common.picture[n].data` is a plain `Uint8Array`,
whose `toString()` takes no encoding argument. Base64-encode via Buffer:

```typescript
Buffer.from(picture.data).toString('base64')
```

### 4. Nullable fields need explicit guards

Electron's `app.dock` is optional (undefined off macOS); music-metadata's
`IRating.rating` is optional. Guard instead of asserting.

### 5. React 19 typing rules (renderer)

- The global `JSX` namespace no longer exists. Use
  `ComponentPropsWithoutRef<'tag'>` instead of
  `JSX.IntrinsicElements['tag']` (applied in `Setting.tsx`,
  `ControlButton.tsx`)
- `useRef<T>(null)` returns `RefObject<T | null>`; hook signatures receiving
  refs must accept the `| null` variant (see `useWavesurfer.ts`)
- Refs must match the real element type (`HTMLDivElement` for divs, not
  `HTMLInputElement`)

## Mantine 9 Renames

Per the official 8x-to-9x migration guide:

- `Collapse` prop `in` → `expanded`

Applied in `LibraryChangesModal.tsx` and `SettingsTraktor.tsx`.

## Incident: "Error: Electron uninstall" on `pnpm run dev`

**Symptom**: builds succeed, then electron-vite throws
`Error: Electron uninstall` at startup.

**Root cause**: the `electron` package was present but its postinstall
(binary download) never ran — `node_modules/electron/path.txt` and
`node_modules/electron/dist/` were missing. pnpm does not re-run build
scripts for already-present packages, so later reinstalls never healed it.

**Resolution**:

```bash
node node_modules/electron/install.js   # downloads dist/ + writes path.txt
```

Gotcha: `pnpm rebuild electron` was a silent no-op despite
`allowBuilds.electron: true` in `pnpm-workspace.yaml`. When rebuild does
nothing, bypass with the package's own install script.

**Native module check** (better-sqlite3): binding lives at
`build/Release/linux-x64.node` (platform-named prebuilds, not
`better_sqlite3.node`). Verify ABI compatibility against Electron, not
system Node:

```bash
ELECTRON_RUN_AS_NODE=1 node_modules/.bin/electron -e \
  "require('better-sqlite3')(':memory:').prepare('select 1').get()"
```

## Build Warnings That Are Safe to Ignore

- Rollup warning about a `#__PURE__` annotation comment inside `terser`
- "Use of eval" warnings from `bottleneck` (Redis paths, unused by Harmony)
