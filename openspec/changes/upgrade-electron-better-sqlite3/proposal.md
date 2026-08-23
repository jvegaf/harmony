# Proposal: Upgrade Electron + better-sqlite3 (Joint)

Change: `upgrade-electron-better-sqlite3` · 2026-08-23 · Single PR · Budget: 800 lines (forecast ~100–150 authored LOC — fits, no splitting needed)

## Intent

Electron 33 (ABI 130) and better-sqlite3 12.x are stale-coupled: the NAN-era native binary needs an ABI-specific rebuild per Electron bump and cannot load under system Node (ABI 137), which is why `src/main/lib/db/__tests__/database.test.ts` ships fully skipped. better-sqlite3 v13 is N-API — prebuilds work across Node AND Electron, dissolving the coupling. This change moves both together to restore a sustainable upgrade path, pull Chromium/security updates, and gain real DB test coverage.

## Scope

### In Scope
- Version bumps (registry-verified 2026-08-23): `electron` → **^43.4.1**, `better-sqlite3` → **^13.0.3**, `@types/better-sqlite3` → **^9.6.0**, `drizzle-orm` → **^0.45.2** (patch).
- Remove or gate `nodeSqliteStub()` in `electron.vite.config.ts` (**HIGH** risk item: `node:sqlite` is builtin since Electron 35; the stub would replace a working require with a thrower and break undici/cheerio scraping paths).
- Toolchain adjustments: revisit `postinstall` / `allowBuilds` (pnpm-workspace.yaml) / `npmRebuild:false`; handle Electron ≥42 lazy binary download (`npx install-electron`) in CI/dev; review `electron-builder.yml` asarUnpack globs for the N-API prebuild layout.
- Un-skip `src/main/lib/db/__tests__/database.test.ts` (acceptance gate).

### Out of Scope (Non-Goals)
- Schema or migration changes.
- Refactors not forced by the upgrade.
- UI work beyond forced Electron deltas (E43 dialog defaultPath → Downloads; Linux rounded-corners/WCO visuals are QA notes only).
- Electron 44 (stable 2026-08-25; deferred follow-up).

## Capabilities

### New Capabilities
None — dependency/toolchain upgrade introduces no new behavior.

### Modified Capabilities
None — DB access, IPC surface, and renderer boundary requirements unchanged.

## Approach

Exploration Approach 1 (joint): N-API prebuilds make one coherent verification pass viable and let DB tests run under system Node. Sequence: bump deps → remove stub plugin → toolchain fixes → typecheck/tests → packaged smoke run.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json`, `pnpm-lock.yaml` | Modified | Four version bumps |
| `electron.vite.config.ts` | Modified | Remove/gate `nodeSqliteStub()` |
| `.npmrc`, `pnpm-workspace.yaml`, postinstall | Modified | Drop per-ABI rebuild assumptions |
| `electron-builder.yml` | Modified | asarUnpack glob review |
| `src/main/lib/db/__tests__/database.test.ts` | Modified | Un-skip tests |
| CI scripts | Modified | Lazy Electron download handling |

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stub left in place breaks scraping (undici detection) | HIGH | Remove in same PR; smoke-test bandcamp/soundcloud/googlethis |
| Lazy Electron download breaks CI/dev automation | MEDIUM | Call `npx install-electron`; warm cache |
| asarUnpack mismatch for N-API prebuild layout | MEDIUM | Packaged smoke proves DB loads from asar |
| @types v9 typing drift fails typecheck | LOW-MED | Typecheck gate; minimal narrowing fixes |
| Linux visual regressions (hidden title bar) | LOW-MED | Manual QA X11/Wayland |
| Prebuild gap fails un-skipped tests on other platforms | LOW | Feature-detect fallback re-skip until confirmed |

## Rollback Plan

Data-safe by construction: SQLite format is stable across library versions; no schema changes; drizzle `migrate()` idempotent; user DB at `~/.config/harmony/database/harmony.db` untouched. Recommend copying `database/` before first prod run (zero cost). Code rollback: `git revert` the PR + `pnpm install`; legacy postinstall rebuilds better-sqlite3 12 for Electron 33 ABI automatically.

## IPC Boundary Note

No preload/IPC surface changes; renderer never gains direct Node access. Native module remains main-process-only (workers verified not to import better-sqlite3).

## Success Criteria

- [ ] `pnpm run typecheck` green on @types/better-sqlite3 ^9.6.0
- [ ] `pnpm run test:run` green WITH database tests un-skipped
- [ ] Linux AppImage packaged smoke: DB loads from asar, migrations run, library scan + playlist CRUD OK
- [ ] Scrapers verified after stub removal
