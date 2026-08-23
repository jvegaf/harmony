# Exploration: Upgrade Electron + better-sqlite3 (together)

Change: `upgrade-electron-better-sqlite3`
Date: 2026-08-23 · Mode: auto · Delivery: single PR · Review budget: 800 lines

## Current State (verified)

### Exact versions — declared vs lockfile-installed

| Package | Declared (package.json) | Installed (pnpm-lock) | Latest on registry |
|---|---|---|---|
| electron | ^33.3.0 | **33.4.11** | **43.4.1** (`latest` tag; 44.0.0 stable scheduled 2026-08-25) |
| better-sqlite3 | ^12.6.2 | **12.8.0** | **13.0.3** (v13 major: 2026-07-21) |
| drizzle-orm | ^0.45.1 | 0.45.1 | 0.45.2 |
| @types/better-sqlite3 | ^7.6.13 | 7.6.13 | 9.6.0 |
| electron-vite | ^5.0.0 | 5.0.0 | 5.x (peer vite ^5‖^6‖^7 ✓) |
| vite | ^7.3.1 | 7.3.1 | 7.x |
| drizzle-kit | ^0.31.9 | 0.31.9 | — |
| electron-builder | ^26.7.0 | 26.8.1 (+ squirrel-windows) | 26.x |
| typescript | ^5.3.3 | 5.9.3 | — |

Runtime: pnpm 11.3.0, system Node v24.19.0 (**ABI 137**), Electron 33 bundles Node 20.18 (Electron ABI **130**).

### ABI coupling (why both must move together)

- better-sqlite3 ≤12.x is a V8/NAN-era native addon: its binary is tied to one `NODE_MODULE_VERSION`. The installed binary at `node_modules/better-sqlite3/build/Release/better_sqlite3.node` was built for Electron ABI 130 by the repo's `postinstall` (`electron-builder install-app-deps`, `.forge-meta` present). It cannot load under system Node 24 (ABI 137) — which is exactly why `src/main/lib/db/__tests__/database.test.ts` is entirely `describe.skip` (its header comment cites this mismatch).
- Any Electron major bump changes the ABI → forces a rebuild of better-sqlite3 against new Electron headers.
- **better-sqlite3 v13.0.0 changed this**: it is the first N-API release (node-addon-api ^8, `prebuild-install` removed, prebuilds shipped inside the package). Prebuilt binaries work across Node.js AND Electron versions without per-ABI rebuilds. Upgrading to 13 dissolves the coupling that makes upgrades painful — and should allow un-skipping the DB tests under system Node.
- Drizzle compat: `drizzle-orm@0.45.2` declares peer `"better-sqlite3": ">=7"` and `"@types/better-sqlite3": "*"` → compatible with v13.

### Native-module toolchain today

- `.npmrc`: `node-linker=hoisted` (flat node_modules, npm-like layout).
- `pnpm-workspace.yaml`: `allowBuilds` whitelists build scripts for `better-sqlite3`, `electron`, `electron-winstaller`, `esbuild`.
- `package.json` postinstall: `electron-builder install-app-deps`.
- `electron-builder.yml`: `npmRebuild: false`; `asarUnpack` includes `node_modules/better-sqlite3` and `out/main/chunks/*.node`.
- DB access: only main process (`src/main/lib/db/database.ts`). Worker threads (`analysis-worker`, `sync-worker`, `export-worker`, `tagger-worker`) do NOT import better-sqlite3.

## Upgrade Targets

- **Electron 43.4.1** (`latest`, Chromium M150, Node 24.18.1). Supported stables today: 41/42/43; E41 goes EOL 2026-08-25, so target ≥42. E44 stable lands 2026-08-25 (M152, Node 24.18) if we prefer newest — same Node line, so ABI/toolchain story identical.
- **better-sqlite3 13.0.3** + `@types/better-sqlite3@^9.6.0` + `drizzle-orm@0.45.2`.

## Affected Areas

- `package.json` / `pnpm-lock.yaml` — version bumps (electron, better-sqlite3, @types/better-sqlite3, drizzle-orm patch).
- `electron.vite.config.ts` — **`nodeSqliteStub()` Rollup plugin must be removed/reworked** (see Breaking Changes #1).
- `.npmrc` / `pnpm-workspace.yaml` / postinstall script — revisit now that better-sqlite3 13 needs no rebuild and Electron ≥42 no longer downloads its binary in postinstall (E42 behavior change).
- `src/main/lib/db/__tests__/database.test.ts` — candidate to UN-skip once N-API binary loads under system Node.
- `src/main/modules/DialogsModule.ts`, `IPCTraktorModule.ts`, `IPCPlaylistModule.ts` — dialog UX affected by E43 defaultPath change (no code required; QA note).
- `src/main/index.ts` — uses `titleBarStyle:'hidden'`; Linux visual changes in E43 (rounded corners, WCO title-bar layout).
- CI/packaging scripts — E42 lazy Electron download affects install flows.

## Approaches

1. **Together (recommended)** — bump Electron 33→43(44) AND better-sqlite3 12→13 (+@types 9, drizzle patch) in one PR.
   - Pros: N-API prebuilds make the native story runtime-agnostic; one coherent verification pass; enables re-enabling skipped DB tests; removes fragile ABI dance; fits single-PR delivery and 800-line budget (<~100 LOC expected).
   - Cons: larger atomic jump; harder bisect if something breaks.
   - Effort: Medium.

2. **SQLite-first staged** — better-sqlite3 13 under Electron 33 first, Electron later.
   - Cons: v13 declares `engines.node >= 22`; Electron 33 ships Node 20.18 — unsupported combination (pnpm won't block without engine-strict, but runtime support is not guaranteed); keeps two risky PRs.
   - Effort: Medium-High risk. Not recommended.

3. **Electron-first staged** — Electron 43 keeping better-sqlite3 12 (rebuild via install-app-deps), then bump sqlite.
   - Pros: isolates Chromium/Electron breakage from driver change.
   - Cons: perpetuates the ABI-rebuild fragility and skipped tests for one more cycle; double CI churn.
   - Effort: Medium.

## Recommendation

Approach 1 (together), targeting Electron 43.4.x + better-sqlite3 13.0.x in a single PR. Rationale: v13's N-API migration is precisely designed for cross-runtime binaries; pairing the two upgrades eliminates the historical reason these bumps were scary, and the repo's own test suite becomes stronger afterwards (un-skip DB tests).

## Breaking-Change Blast Radius (33 → 43/44)

Relevant to this repo's actual API surface (Menu ×58, BrowserWindow ×29, shell ×5, powerSaveBlocker ×5, dialog ×4, app.on ×3, powerMonitor ×2, nativeImage ×2, net ×1; preload: contextBridge/ipcRenderer/shell):

1. **HIGH — `nodeSqliteStub()` inversion** (`electron.vite.config.ts`): plugin exists because `require('node:sqlite')` didn't exist in Electron 33's Node 20.18 and undici (via cheerio) expects a clean failure. From Electron 35+ (Node ≥22.13) `node:sqlite` is available by default (regression in 37.2.x fixed upstream, PR #47706). The stub would replace a *working* builtin require with a throwing stub — potentially breaking undici's feature detection/scraping paths. MUST remove or gate the plugin; verify bandcamp/soundcloud/googlethis scraping after upgrade.
2. **MEDIUM — Electron ≥42 install model**: electron binary no longer downloads via its own postinstall script; downloads lazily on first run of the bin (RFC #22). `ELECTRON_SKIP_BINARY_DOWNLOAD` no longer supported; use `install-electron` script or let first `electron-vite dev/build` fetch it. Update CI/Docker caching accordingly.
3. **LOW-MED — E43 Linux window visuals**: frameless windows default rounded corners on Linux; WCO adopts native title-bar layout. Affects `titleBarStyle:'hidden'` main window — visual QA on GNOME/KDE/X11+Wayland needed.
4. **LOW — E43 dialog default directory**: `showOpenDialog/showSaveDialog` without `defaultPath` now defaults to Downloads (affects DialogsModule + Traktor XML open + M3U save UX).
5. **LOW — E38 Wayland default**: `--ozone-platform=auto` on Wayland sessions (AppImage/deb targets). Generally beneficial; test window controls.
6. **NON-ISSUES verified**: renderer has zero `clipboard` usage (E40 deprecation / E44 removal safe); no `utilityProcess` (workers are `worker_threads`, unaffected by E37 utility-process changes); no `session.clearStorageData`, `protocol.handle`, BrowserView, webFrame routingId, desktopCapturer, `app.commandLine`, PrinterInfo usage; nativeImage used trivially (2 refs, no `toBitmap` color-space dependence found).
7. **better-sqlite3 13 JS API**: additive only (`db.explain()`, `stmt.toString()`); synchronous Database/pragma/transaction API unchanged → Drizzle driver (`drizzle-orm/better-sqlite3`) unaffected. Only packaging/runtime model changed (N-API).
8. **Dev-only**: `electron-devtools-installer@4` against Chromium 150 — watch for extension-install noise in dev.

## Verification Plan Feasibility

Existing coverage:
- `pnpm run typecheck:node && typecheck:web` — covers main/preload + renderer typing (catches @types/better-sqlite3 9 drift).
- `pnpm run test:run` — Vitest 4; DB-layer tests exist but are skipped (`describe.skip`) due to ABI mismatch; **after upgrade they should load the N-API binary under system Node — attempt un-skip as part of acceptance criteria**.
- No E2E framework (per openspec config) → packaged smoke test is manual/scripted:
  - `pnpm dev`: library scan/import, playlist CRUD + reorder, cue points, Traktor sync, scraping modules (post-stub-removal!), audio analysis worker.
  - `pnpm build:linux` + run AppImage: proves asarUnpack of `node_modules/better-sqlite3` still resolves (v13 may no longer need unpacking — N-API .node inside package; verify path resolution from asar) and migrations run from `app.getAppPath()/drizzle`.

## Rollback & Data Safety

- User data DB lives at `~/.config/harmony/database/harmony.db` (WAL mode). SQLite file format is stable across SQLite library versions bundled by better-sqlite3 releases; no schema changes are part of this upgrade; drizzle `migrate()` is journal-based and idempotent. Rolling the app back to old versions after running new ones is safe (same migration set).
- Code rollback: git revert of the single PR + `pnpm install` restores lockfile; postinstall rebuilds old better-sqlite3 for old Electron ABI automatically.
- Backup recommendation before first prod run: copy the `database/` folder (cheap, zero-risk).

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| nodeSqliteStub left in place breaks scraping on new Electron | HIGH | Remove plugin in same PR; smoke-test all scraper IPC modules |
| E42 lazy Electron download breaks CI/dev automation assumptions | MEDIUM | Update CI to call `npx install-electron` or warm cache; drop ELECTRON_SKIP_BINARY_DOWNLOAD usage if any |
| asarUnpack strategy wrong for N-API prebuilds (path/layout differs from build/Release) | MEDIUM | Verify packaged app loads DB; adjust asarUnpack globs if needed |
| Linux visual regressions (rounded corners/WCO) with hidden title bar | LOW-MED | Manual QA on X11+Wayland; `roundedCorners:false` opt-out available |
| Un-skipped DB tests fail on platforms lacking linux-x64 prebuild | LOW | Keep skip fallback behind feature detection until confirmed on CI matrix |
| electron-devtools-installer dev-only incompat | LOW | Guard already try/catch'd; ignore in prod |

## Ready for Proposal

Yes — recommend proceeding to `sdd-propose` with Approach 1 (single PR: electron ^43.4.1, better-sqlite3 ^13.0.3, @types/better-sqlite3 ^9.6.0, drizzle-orm ^0.45.2; remove/gate nodeSqliteStub; revisit allowBuilds/postinstall; acceptance includes un-skipping database.test.ts and a packaged smoke run).
