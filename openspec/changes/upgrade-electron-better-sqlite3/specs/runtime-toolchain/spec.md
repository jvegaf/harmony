# Runtime Toolchain Specification

## Purpose

Constraints keeping Harmony's Electron runtime, native SQLite driver, install/build toolchain, and packaged artifacts mutually compatible. Established by change `upgrade-electron-better-sqlite3` (Electron 33→43, better-sqlite3 12→13 N-API); future toolchain changes MODIFY these requirements. Introduces no user-facing behavior.

## ADDED Requirements

### Requirement: Upgraded dependency baseline

The system SHALL declare `electron ^43.4.1`, `better-sqlite3 ^13.0.3`, `@types/better-sqlite3 ^9.6.0`, and `drizzle-orm ^0.45.2`. A fresh install MUST resolve these declarations without peer-dependency or lockfile errors.

#### Scenario: Clean install resolves declared ranges

- GIVEN a clean checkout with no `node_modules`
- WHEN `pnpm install` completes
- THEN `pnpm ls electron better-sqlite3 @types/better-sqlite3 drizzle-orm` reports installed versions within the declared ranges

### Requirement: Native SQLite driver loads across runtimes

With better-sqlite3 v13 shipping N-API prebuilds, one installed package MUST load under both system Node (Vitest) and the Electron main process, with no per-runtime rebuild.

#### Scenario: Driver loads under system Node

- GIVEN dependencies are installed
- WHEN `node -e "require('better-sqlite3')"` runs with the system interpreter
- THEN it exits 0 with no NODE_MODULE_VERSION mismatch

#### Scenario: Driver loads in Electron main process

- GIVEN the app starts via `pnpm dev`
- WHEN the main process opens the user database through better-sqlite3
- THEN the connection succeeds and drizzle queries execute without error

### Requirement: node:sqlite stub removal preserves scraping

`electron.vite.config.ts` SHALL NOT intercept or replace `require('node:sqlite')` on Electron ≥35 (the `nodeSqliteStub` plugin is removed, or gated to older majors only). Scraping stacks using undici/cheerio MUST keep working after removal.

#### Scenario: Scraping smoke after stub removal

- GIVEN the built bundle no longer injects the `node:sqlite` thrower
- WHEN the bandcamp, soundcloud, and googlethis scraper flows execute against live targets
- THEN each returns results with no `ERR_UNKNOWN_BUILTIN_MODULE` failures

### Requirement: Database tests un-skipped

`src/main/lib/db/__tests__/database.test.ts` SHALL drop its blanket `describe.skip` and execute under system Node. A conditional skip MAY remain only behind explicit N-API prebuild feature detection, and MUST log loudly when taken.

#### Scenario: Acceptance gate — suite executes green

- GIVEN the un-skipped suite
- WHEN `pnpm run test:run` executes
- THEN `database.test.ts` reports executed passing tests (not skipped) covering unique-path constraint, upsert deduplication, and migration index checks

#### Scenario: Feature-detected fallback on platforms without prebuild

- GIVEN a platform where no v13 prebuild is available
- WHEN the suite initializes the native driver
- THEN it skips with an explicit logged reason instead of failing or silently skipping

### Requirement: Typecheck green under updated typings

`pnpm run typecheck` MUST pass with `@types/better-sqlite3 ^9.6.0`. Fixes SHALL be limited to minimal typing narrowings; refactors beyond upgrade needs are out of scope.

#### Scenario: Typecheck gate

- GIVEN upgraded dependencies
- WHEN `pnpm run typecheck` runs
- THEN the node and web projects both report zero errors

### Requirement: Install toolchain free of per-ABI rebuild assumptions

`postinstall`, `allowBuilds` (pnpm-workspace.yaml), `.npmrc`, and `npmRebuild: false` SHALL be reconciled so no step assumes rebuilding better-sqlite3 per Electron ABI. Dev and automation flows MUST tolerate Electron ≥42's lazy binary download (e.g., `npx install-electron` or first-run fetch) without manual intervention.

#### Scenario: Hands-off bootstrap

- GIVEN a clean checkout
- WHEN install, typecheck, tests, and `pnpm run build` run in sequence
- THEN each completes with no manual rebuild steps and no missing-Electron-binary failure; no `ELECTRON_SKIP_BINARY_DOWNLOAD` usage remains

### Requirement: Packaged app loads native driver from asar

`electron-builder.yml` `asarUnpack` globs MUST match the v13 N-API prebuild layout so the packaged Linux AppImage loads better-sqlite3 and runs migrations successfully.

#### Scenario: Packaged smoke run

- GIVEN `pnpm run build:linux` produced an AppImage
- WHEN the packaged app boots and performs a library scan plus playlist CRUD
- THEN the DB loads from the packaged layout, migrations run idempotently, and all operations succeed

### Requirement: Upgrade boundary preservation

The upgrade MUST NOT alter the IPC surface, preload typings, DB schema, or migration set. The renderer SHALL NOT gain direct Node access, and better-sqlite3 SHALL remain main-process-only (worker threads excluded).

#### Scenario: Boundary diff check

- GIVEN the change diff against base
- WHEN reviewed
- THEN `src/preload/lib/ipc-channels.ts`, preload typings, `src/main/lib/db/schema.ts`, and the `drizzle/` migrations folder are unchanged
