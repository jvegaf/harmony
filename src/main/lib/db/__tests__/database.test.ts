import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql } from 'drizzle-orm';

import * as schema from '../schema';
import { Track } from '../../../../preload/types/harmony';

// AIDEV-NOTE: Database tests using an in-memory SQLite database
// We can't use the singleton Database class because it connects to the real DB,
// so we test the schema and constraints directly with an ephemeral database.
//
// IMPORTANT: These tests are currently SKIPPED because better-sqlite3 is a native
// module compiled for Electron's Node.js version (130), but Vitest runs in the
// system Node.js (127), causing a NODE_MODULE_VERSION mismatch.
//
// The deduplication logic is already thoroughly tested in:
// - src/main/lib/__tests__/track-merge.test.ts (smart merge logic)
// - src/preload/lib/__tests__/id-provider.test.ts (deterministic ID generation)
//
// The unique constraint on `tracks.path` is verified manually during development.
// To run these tests, you would need to either:
// 1. Use sql.js (pure JS SQLite) instead of better-sqlite3, or
// 2. Run tests in Electron's test environment, or
// 3. Rebuild better-sqlite3 for system Node: yarn rebuild better-sqlite3

describe.skip('Database Schema - Track Deduplication', () => {
  let sqlite: BetterSqlite3.Database;
  let db: ReturnType<typeof drizzle>;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary database file for testing
    testDbPath = path.join(os.tmpdir(), `harmony-test-${Date.now()}.db`);
    sqlite = new BetterSqlite3(testDbPath);

    // Enable foreign keys and WAL mode like the real DB
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('journal_mode = WAL');

    // Initialize Drizzle
    db = drizzle(sqlite, { schema });

    // Run migrations to create tables with constraints
    const migrationsFolder = path.join(__dirname, '../../../../../drizzle');
    migrate(db, { migrationsFolder });
  });

  afterEach(() => {
    // Clean up
    sqlite.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Clean up WAL/SHM files if they exist
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  it('should enforce unique constraint on track.path', () => {
    const track1: Track = {
      id: 'track-1',
      path: '/music/test.mp3',
      title: 'Test Track',
      duration: 180,
    };

    const track2: Track = {
      id: 'track-2',
      path: '/music/test.mp3', // Same path, different ID
      title: 'Test Track 2',
      duration: 200,
    };

    // Insert first track - should succeed
    db.insert(schema.tracks).values(track1).run();

    // Try to insert second track with same path - should fail
    expect(() => {
      db.insert(schema.tracks).values(track2).run();
    }).toThrow(/UNIQUE constraint failed.*path/i);
  });

  it('should allow inserting tracks with same ID if path is different (via upsert)', () => {
    const track1: Track = {
      id: 'track-1',
      path: '/music/test1.mp3',
      title: 'Test Track 1',
      duration: 180,
    };

    const track2: Track = {
      id: 'track-1', // Same ID
      path: '/music/test2.mp3', // Different path
      title: 'Test Track 2',
      duration: 200,
    };

    // Insert first track
    db.insert(schema.tracks).values(track1).run();

    // Update with different path using onConflictDoUpdate
    db.insert(schema.tracks)
      .values(track2)
      .onConflictDoUpdate({
        target: schema.tracks.id,
        set: {
          path: sql`excluded.path`,
          title: sql`excluded.title`,
          duration: sql`excluded.duration`,
        },
      })
      .run();

    // Should have only one track with updated values
    const tracks = db.select().from(schema.tracks).all();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      id: 'track-1',
      path: '/music/test2.mp3',
      title: 'Test Track 2',
      duration: 200,
    });
  });

  it('should prevent duplicate paths even with different IDs', () => {
    const track1: Track = {
      id: 'abc123',
      path: '/music/song.mp3',
      title: 'Song',
      duration: 180,
    };

    const track2: Track = {
      id: 'def456',
      path: '/music/song.mp3', // Same path
      title: 'Song Updated',
      duration: 180,
    };

    // Insert first track
    db.insert(schema.tracks).values(track1).run();

    // Try to insert with different ID but same path - should fail
    expect(() => {
      db.insert(schema.tracks).values(track2).run();
    }).toThrow(/UNIQUE constraint failed.*path/i);
  });

  it('should allow querying existing tracks by path for deduplication', () => {
    const tracks: Track[] = [
      { id: '1', path: '/music/a.mp3', title: 'A', duration: 180 },
      { id: '2', path: '/music/b.mp3', title: 'B', duration: 200 },
      { id: '3', path: '/music/c.mp3', title: 'C', duration: 220 },
    ];

    // Insert tracks
    tracks.forEach(track => {
      db.insert(schema.tracks).values(track).run();
    });

    // Query by paths (simulating deduplication pre-check)
    const pathsToCheck = ['/music/a.mp3', '/music/c.mp3', '/music/d.mp3'];
    const existing = db
      .select()
      .from(schema.tracks)
      .where(
        sql`${schema.tracks.path} IN (${sql.join(
          pathsToCheck.map(p => sql`${p}`),
          sql`, `,
        )})`,
      )
      .all();

    expect(existing).toHaveLength(2);
    expect(existing.map(t => t.path)).toEqual(expect.arrayContaining(['/music/a.mp3', '/music/c.mp3']));
  });

  it('should handle upsert correctly when path already exists', () => {
    const original: Track = {
      id: 'track-1',
      path: '/music/test.mp3',
      title: 'Original',
      artist: 'Artist A',
      duration: 180,
    };

    const updated: Track = {
      id: 'track-1',
      path: '/music/test.mp3',
      title: 'Updated',
      artist: 'Artist B',
      duration: 180,
    };

    // Insert original
    db.insert(schema.tracks).values(original).run();

    // Upsert with same ID (conflict on primary key)
    db.insert(schema.tracks)
      .values(updated)
      .onConflictDoUpdate({
        target: schema.tracks.id,
        set: {
          title: sql`excluded.title`,
          artist: sql`excluded.artist`,
        },
      })
      .run();

    // Should have one track with updated values
    const tracks = db.select().from(schema.tracks).all();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      id: 'track-1',
      path: '/music/test.mp3',
      title: 'Updated',
      artist: 'Artist B',
    });
  });

  it('should verify migration created the unique index on path', () => {
    // Query SQLite's index metadata
    const indexes = sqlite
      .prepare(`SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='track' AND name LIKE '%path%'`)
      .all();

    expect(indexes).toHaveLength(1);
    expect(indexes[0]).toMatchObject({
      name: 'track_path_unique',
    });

    // Verify it's a unique index
    const indexInfo = indexes[0] as { sql: string };
    expect(indexInfo.sql).toMatch(/CREATE UNIQUE INDEX/i);
  });
});
