# SQLite SQLITE_BUSY Fix

## Problem

When starting Harmony with `yarn dev`, the application would crash with:

```
RuntimeError: abort(QueryFailedError: SQLITE_BUSY: database is locked)
```

This occurred due to:

1. **Multiple Database Instances**: Each module (`DatabaseModule`, `IPCTraktorModule`, `IPCAudioAnalysisModule`) was creating its own `Database` instance, leading to multiple SQLite connections
2. **Stale Journal Files**: Leftover `harmony.db-journal` files from crashed sessions caused lock conflicts
3. **Default Journal Mode**: SQLite's default journal mode is more restrictive with concurrent access

## Solution Implemented

### 1. Singleton Pattern for Database Class

Modified `src/main/lib/db/database.ts` to implement a strict singleton pattern:

```typescript
// Before
export class Database {
  public constructor() {
    this.initPromise = this.init();
  }
}

// After
let databaseInstance: Database | null = null;

export class Database {
  private constructor() {
    this.initPromise = this.init();
  }

  public static getInstance(): Database {
    if (!databaseInstance) {
      databaseInstance = new Database();
    }
    return databaseInstance;
  }
}
```

### 2. WAL Mode Configuration

Enabled Write-Ahead Logging (WAL) mode for better concurrency:

```typescript
// Set busy timeout to 10 seconds
extra: {
  busyTimeout: 10000,
}

// Enable WAL mode with optimized pragmas
await AppDataSource.query('PRAGMA journal_mode = WAL');
await AppDataSource.query('PRAGMA synchronous = NORMAL');
await AppDataSource.query('PRAGMA cache_size = 10000');
await AppDataSource.query('PRAGMA temp_store = MEMORY');
```

**Benefits of WAL mode:**

- Multiple readers can access the database simultaneously
- Writers don't block readers
- Better crash recovery
- Improved performance

### 3. Journal File Cleanup

Added automatic cleanup of stale journal files on startup:

```typescript
private cleanJournalFiles(): void {
  const journalPath = `${dbPath}-journal`;
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  try {
    if (fs.existsSync(journalPath)) {
      log.warn(`[db] Found stale journal file, removing: ${journalPath}`);
      fs.unlinkSync(journalPath);
    }
  } catch (err) {
    log.error(`[db] Error cleaning journal files: ${err}`);
  }
}
```

### 4. Updated Module Constructors

Changed all modules to use the singleton instance:

- `src/main/modules/DatabaseModule.ts`
- `src/main/modules/IPCTraktorModule.ts`
- `src/main/modules/IPCAudioAnalysisModule.ts`

```typescript
// Before
constructor(window: Electron.BrowserWindow) {
  super(window);
  this.db = new Database();
}

// After
constructor(window: Electron.BrowserWindow) {
  super(window);
  this.db = Database.getInstance();
}
```

## Testing

After these changes:

1. Clean start: `rm -f ~/.config/harmony/database/harmony.db-journal`
2. Run: `yarn dev`
3. The application should start without `SQLITE_BUSY` errors
4. Database will be in WAL mode with three files:
   - `harmony.db` (main database)
   - `harmony.db-wal` (write-ahead log)
   - `harmony.db-shm` (shared memory index)

## Technical Details

### WAL Mode Files

- **harmony.db**: Main database file (read by SQLite)
- **harmony.db-wal**: Write-Ahead Log (contains recent changes not yet checkpointed)
- **harmony.db-shm**: Shared memory index (helps coordinate readers/writers)

These files work together to provide ACID guarantees while allowing concurrent access.

### Busy Timeout

The `busyTimeout: 10000` setting gives SQLite 10 seconds to retry operations if the database is temporarily locked, preventing immediate `SQLITE_BUSY` errors during high concurrency.

## Migration Notes

- **No database schema changes**: Existing databases will work without modification
- **Automatic WAL conversion**: On first launch after update, SQLite converts the database to WAL mode
- **Backward compatible**: If you need to revert, delete the `-wal` and `-shm` files and SQLite will recreate them in journal mode

## References

- [SQLite WAL Mode](https://www.sqlite.org/wal.html)
- [TypeORM SQLite Configuration](https://typeorm.io/data-source-options#sqlite-data-source-options)
- [Singleton Pattern](https://refactoring.guru/design-patterns/singleton)
