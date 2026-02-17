import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

import type { TrackRating } from '../../../preload/types/harmony';

// AIDEV-NOTE: Drizzle ORM schema definition for Harmony database
// Replaces TypeORM EntitySchema pattern with declarative Drizzle tables
// All table names match exactly with previous TypeORM schema for compatibility

// ═══════════════════════════════════════════════════════════════════════════
// ── Track Table ──
// ═══════════════════════════════════════════════════════════════════════════

export const tracks = sqliteTable(
  'track',
  {
    id: text('id').primaryKey(),
    path: text('path').notNull().unique(),
    title: text('title').notNull(),
    artist: text('artist'),
    album: text('album'),
    genre: text('genre'),
    year: integer('year'),
    duration: integer('duration').notNull(),
    bitrate: integer('bitrate'),
    comment: text('comment'),
    bpm: integer('bpm'),
    initialKey: text('initialKey'),
    // AIDEV-NOTE: JSON columns use text with mode 'json' in SQLite
    // SQLite doesn't have native JSON type, stores as TEXT with JSON functions support
    rating: text('rating', { mode: 'json' }).$type<TrackRating | null>(),
    label: text('label'),
    waveformPeaks: text('waveformPeaks', { mode: 'json' }).$type<number[] | null>(),
    // AIDEV-NOTE: Timestamp when the track was added to Harmony (Unix timestamp in milliseconds)
    addedAt: integer('addedAt'),
    // AIDEV-NOTE: URL of the track page from the tag provider (Beatport, Traxsource, Bandcamp)
    // Persisted as WOAR frame (artistUrl in node-id3) / common.website in music-metadata
    url: text('url'),
  },
  table => [
    // Performance indexes for frequently queried columns
    index('IDX_track_addedAt').on(table.addedAt),
    index('IDX_track_artist').on(table.artist),
    index('IDX_track_genre').on(table.genre),
    index('IDX_track_bpm').on(table.bpm),
  ],
);

// ═══════════════════════════════════════════════════════════════════════════
// ── Folder Table (for playlist hierarchy) ──
// ═══════════════════════════════════════════════════════════════════════════

export const folders = sqliteTable(
  'folder',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    parentId: text('parentId'), // Self-reference for tree structure
    path: text('path'),
  },
  table => [index('IDX_folder_parentId').on(table.parentId), index('IDX_folder_path').on(table.path)],
);

// ═══════════════════════════════════════════════════════════════════════════
// ── Playlist Table ──
// ═══════════════════════════════════════════════════════════════════════════

export const playlists = sqliteTable('playlist', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // AIDEV-NOTE: Optional folder ID for Traktor playlist hierarchy support
  folderId: text('folderId').references(() => folders.id),
});

// ═══════════════════════════════════════════════════════════════════════════
// ── PlaylistTrack Table (junction table for many-to-many) ──
// ═══════════════════════════════════════════════════════════════════════════

export const playlistTracks = sqliteTable('playlistTrack', {
  id: text('id').primaryKey(),
  playlistId: text('playlistId')
    .notNull()
    .references(() => playlists.id, { onDelete: 'cascade' }),
  trackId: text('trackId')
    .notNull()
    .references(() => tracks.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
});

// ═══════════════════════════════════════════════════════════════════════════
// ── CuePoint Table (hotcues, loops, beatgrid markers) ──
// ═══════════════════════════════════════════════════════════════════════════

export const cuePoints = sqliteTable(
  'cuePoint',
  {
    id: text('id').primaryKey(),
    trackId: text('trackId').notNull(),
    type: text('type').notNull(), // CueType enum value
    // AIDEV-NOTE: real() for float precision (Traktor uses milliseconds with microsecond precision)
    positionMs: real('positionMs').notNull(),
    lengthMs: real('lengthMs'),
    hotcueSlot: integer('hotcueSlot'),
    name: text('name'),
    color: text('color'),
    order: integer('order'),
  },
  table => [index('IDX_cuePoint_trackId').on(table.trackId), index('IDX_cuePoint_type').on(table.type)],
);

// ═══════════════════════════════════════════════════════════════════════════
// ── RELATIONS (for Drizzle relational queries) ──
// ═══════════════════════════════════════════════════════════════════════════

// AIDEV-NOTE: Relations enable the db.query.* relational API for eager loading
// These do NOT affect the database schema, only how Drizzle constructs joins

export const tracksRelations = relations(tracks, ({ many }) => ({
  playlistTracks: many(playlistTracks),
  cuePoints: many(cuePoints),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: 'folder_hierarchy',
  }),
  children: many(folders, { relationName: 'folder_hierarchy' }),
  playlists: many(playlists),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  folder: one(folders, {
    fields: [playlists.folderId],
    references: [folders.id],
  }),
  playlistTracks: many(playlistTracks),
}));

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistTracks.playlistId],
    references: [playlists.id],
  }),
  track: one(tracks, {
    fields: [playlistTracks.trackId],
    references: [tracks.id],
  }),
}));

export const cuePointsRelations = relations(cuePoints, ({ one }) => ({
  track: one(tracks, {
    fields: [cuePoints.trackId],
    references: [tracks.id],
  }),
}));
