#!/usr/bin/env node

/**
 * AIDEV-NOTE: Helper script to check for duplicate track paths in a Harmony database
 *
 * This script scans a Harmony database (SQLite) and reports any duplicate track paths.
 * It should be run BEFORE applying the unique constraint migration to identify
 * any existing duplicates that would cause the migration to fail.
 *
 * Usage:
 *   node scripts/check-duplicates.js [path-to-harmony.db]
 *
 * If no path is provided, it checks the default Harmony database location:
 *   - Windows: %APPDATA%\harmony\database\harmony.db
 *   - macOS: ~/Library/Application Support/harmony/database/harmony.db
 *   - Linux: ~/.config/harmony/database/harmony.db
 */

import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Determine default database path based on platform
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

function checkDuplicates(dbPath) {
  console.log(`\nChecking database: ${dbPath}\n`);

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found: ${dbPath}`);
    process.exit(1);
  }

  let db;
  try {
    db = new BetterSqlite3(dbPath, { readonly: true });

    // Query for duplicate paths
    const duplicateQuery = `
      SELECT path, COUNT(*) as count, GROUP_CONCAT(id, ', ') as ids
      FROM track
      GROUP BY path
      HAVING count > 1
      ORDER BY count DESC, path
    `;

    const duplicates = db.prepare(duplicateQuery).all();

    if (duplicates.length === 0) {
      console.log('✅ No duplicate paths found! Safe to apply unique constraint migration.');
      db.close();
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate path(s):\n`);

    duplicates.forEach((row, index) => {
      console.log(`${index + 1}. Path: ${row.path}`);
      console.log(`   Count: ${row.count}`);
      console.log(`   IDs: ${row.ids}`);
      console.log('');
    });

    // Get total track count
    const totalTracks = db.prepare('SELECT COUNT(*) as count FROM track').get().count;
    const duplicateCount = duplicates.reduce((sum, row) => sum + row.count, 0);
    const uniquePaths = totalTracks - duplicateCount + duplicates.length;

    console.log(`📊 Statistics:`);
    console.log(`   Total tracks: ${totalTracks}`);
    console.log(`   Duplicate entries: ${duplicateCount}`);
    console.log(`   Unique paths: ${uniquePaths}`);
    console.log(`   Duplicates to remove: ${duplicateCount - duplicates.length}\n`);

    console.log('❌ Cannot apply unique constraint migration until duplicates are resolved.');
    console.log('\n💡 Resolution options:');
    console.log('   1. Manually delete duplicate entries (keep the one with most metadata)');
    console.log('   2. Use a cleanup script to merge metadata and remove duplicates');
    console.log('   3. Re-import your library from scratch\n');

    db.close();
    process.exit(1);
  } catch (error) {
    console.error(`❌ Error reading database: ${error.message}`);
    if (db) db.close();
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
const dbPath = args[0] || getDefaultDbPath();

checkDuplicates(dbPath);
