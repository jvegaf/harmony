#!/usr/bin/env node

/**
 * AIDEV-NOTE: Cleanup script to remove duplicate track paths in a Harmony database
 *
 * This script scans for duplicate tracks (same path), merges their metadata using
 * the smart merge logic, keeps the entry with the most complete metadata, and
 * deletes the duplicates.
 *
 * ⚠️  WARNING: This script MODIFIES your database. Make a backup first!
 *
 * Usage:
 *   node scripts/cleanup-duplicates.js [path-to-harmony.db] [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *
 * If no path is provided, it uses the default Harmony database location.
 */

import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Determine default database path
function getDefaultDbPath() {
  const platform = process.platform;
  let userDataPath;

  if (platform === 'win32') {
    userDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (platform === 'darwin') {
    userDataPath = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    userDataPath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  }

  return path.join(userDataPath, 'harmony', 'database', 'harmony.db');
}

// Smart merge: prefer non-null, non-empty values
function smartMerge(tracks) {
  const merged = { ...tracks[0] };

  for (const track of tracks.slice(1)) {
    for (const [key, value] of Object.entries(track)) {
      if (key === 'id') continue; // Skip ID

      // If merged value is empty/null and incoming has a value, use incoming
      if (
        (merged[key] === null || merged[key] === undefined || merged[key] === '') &&
        value !== null &&
        value !== undefined &&
        value !== ''
      ) {
        merged[key] = value;
      }
    }
  }

  return merged;
}

function cleanupDuplicates(dbPath, dryRun) {
  console.log(`\n${dryRun ? '🔍 DRY RUN MODE' : '⚙️  CLEANUP MODE'}: ${dbPath}\n`);

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found: ${dbPath}`);
    process.exit(1);
  }

  // Create backup unless dry run
  if (!dryRun) {
    const backupPath = `${dbPath}.backup-${Date.now()}`;
    console.log(`📦 Creating backup: ${backupPath}`);
    fs.copyFileSync(dbPath, backupPath);
  }

  let db;
  try {
    db = new BetterSqlite3(dbPath, { readonly: dryRun });

    // Find duplicates
    const duplicateQuery = `
      SELECT path, COUNT(*) as count
      FROM track
      GROUP BY path
      HAVING count > 1
      ORDER BY count DESC
    `;

    const duplicatePaths = db.prepare(duplicateQuery).all();

    if (duplicatePaths.length === 0) {
      console.log('✅ No duplicates found!');
      db.close();
      return;
    }

    console.log(`Found ${duplicatePaths.length} paths with duplicates\n`);

    let totalDeleted = 0;
    let totalMerged = 0;

    for (const { path: trackPath, count } of duplicatePaths) {
      // Get all tracks with this path
      const tracks = db.prepare('SELECT * FROM track WHERE path = ?').all(trackPath);

      console.log(`\n📁 ${trackPath} (${count} duplicates)`);

      // Merge metadata
      const merged = smartMerge(tracks);
      const keepId = merged.id;

      console.log(`   Keeping ID: ${keepId}`);
      tracks.forEach(t => {
        if (t.id !== keepId) {
          console.log(`   Deleting ID: ${t.id}`);
        }
      });

      if (!dryRun) {
        // Update the kept track with merged metadata
        const updateStmt = db.prepare(`
          UPDATE track
          SET title = ?, artist = ?, album = ?, genre = ?, year = ?,
              duration = ?, bitrate = ?, comment = ?, bpm = ?,
              initialKey = ?, rating = ?, label = ?, waveformPeaks = ?
          WHERE id = ?
        `);

        updateStmt.run(
          merged.title,
          merged.artist,
          merged.album,
          merged.genre,
          merged.year,
          merged.duration,
          merged.bitrate,
          merged.comment,
          merged.bpm,
          merged.initialKey,
          merged.rating,
          merged.label,
          merged.waveformPeaks,
          keepId,
        );

        // Delete duplicates
        const idsToDelete = tracks.filter(t => t.id !== keepId).map(t => t.id);
        if (idsToDelete.length > 0) {
          const deleteStmt = db.prepare(`DELETE FROM track WHERE id = ?`);
          for (const id of idsToDelete) {
            deleteStmt.run(id);
            totalDeleted++;
          }
        }

        totalMerged++;
      }
    }

    if (dryRun) {
      console.log(`\n✅ Dry run complete. Would merge ${duplicatePaths.length} groups of duplicates.`);
      console.log(`   Run without --dry-run to apply changes.`);
    } else {
      console.log(`\n✅ Cleanup complete!`);
      console.log(`   Merged: ${totalMerged} groups`);
      console.log(`   Deleted: ${totalDeleted} duplicate entries`);
      console.log(`\n   You can now apply the unique constraint migration.`);
    }

    db.close();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (db) db.close();
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dbPath = args.find(arg => !arg.startsWith('--')) || getDefaultDbPath();

cleanupDuplicates(dbPath, dryRun);
