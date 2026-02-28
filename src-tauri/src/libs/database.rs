// AIDEV-NOTE: Database module - SQLite connection and schema management
// Replaces src/main/lib/db/database.ts + schema.ts
// Uses rusqlite with bundled SQLite for cross-platform consistency

use log::info;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::libs::cue_point::{CuePoint, CueType};
use crate::libs::folder::Folder;
use crate::libs::playlist::Playlist;
use crate::libs::track::Track;
use crate::libs::Result;

// AIDEV-NOTE: Database wrapper with Mutex for thread-safe access
// Used as Tauri managed state
pub struct Database {
  conn: Mutex<Connection>,
}

impl Database {
  /// Initialize database connection and create schema
  pub fn new(db_path: PathBuf) -> Result<Self> {
    info!("Opening database at: {:?}", db_path);

    // Create parent directory if it doesn't exist
    if let Some(parent) = db_path.parent() {
      std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(&db_path)?;

    // Enable WAL mode for better concurrency
    conn.pragma_update(None, "journal_mode", "WAL")?;
    // Enable foreign keys
    conn.pragma_update(None, "foreign_keys", true)?;

    let db = Database {
      conn: Mutex::new(conn),
    };

    db.init_schema()?;
    info!("Database initialized successfully");

    Ok(db)
  }

  /// Create all tables and indexes
  fn init_schema(&self) -> Result<()> {
    let conn = self.conn.lock().unwrap();

    // Track table
    conn.execute(
      "CREATE TABLE IF NOT EXISTS track (
                id TEXT PRIMARY KEY NOT NULL,
                path TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL DEFAULT '',
                artist TEXT,
                album TEXT,
                genre TEXT,
                year INTEGER,
                duration INTEGER NOT NULL DEFAULT 0,
                bitrate INTEGER,
                comment TEXT,
                bpm INTEGER,
                initialKey TEXT,
                rating TEXT,
                label TEXT,
                waveformPeaks TEXT,
                addedAt INTEGER,
                url TEXT
            )",
      [],
    )?;

    // Indexes for track table
    conn.execute(
      "CREATE INDEX IF NOT EXISTS IDX_track_addedAt ON track(addedAt)",
      [],
    )?;
    conn.execute(
      "CREATE INDEX IF NOT EXISTS IDX_track_artist ON track(artist)",
      [],
    )?;
    conn.execute(
      "CREATE INDEX IF NOT EXISTS IDX_track_genre ON track(genre)",
      [],
    )?;
    conn.execute("CREATE INDEX IF NOT EXISTS IDX_track_bpm ON track(bpm)", [])?;

    // Folder table (for Traktor playlist hierarchy)
    conn.execute(
      "CREATE TABLE IF NOT EXISTS folder (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                parentId TEXT,
                path TEXT
            )",
      [],
    )?;

    conn.execute(
      "CREATE INDEX IF NOT EXISTS IDX_folder_parentId ON folder(parentId)",
      [],
    )?;
    conn.execute(
      "CREATE INDEX IF NOT EXISTS IDX_folder_path ON folder(path)",
      [],
    )?;

    // Playlist table
    conn.execute(
      "CREATE TABLE IF NOT EXISTS playlist (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                folderId TEXT REFERENCES folder(id)
            )",
      [],
    )?;

    // PlaylistTrack junction table
    conn.execute(
      "CREATE TABLE IF NOT EXISTS playlistTrack (
                id TEXT PRIMARY KEY NOT NULL,
                playlistId TEXT NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
                trackId TEXT NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                \"order\" INTEGER NOT NULL
            )",
      [],
    )?;

    // CuePoint table
    conn.execute(
      "CREATE TABLE IF NOT EXISTS cuePoint (
                id TEXT PRIMARY KEY NOT NULL,
                trackId TEXT NOT NULL,
                type TEXT NOT NULL,
                positionMs REAL NOT NULL,
                lengthMs REAL,
                hotcueSlot INTEGER,
                name TEXT,
                color TEXT,
                \"order\" INTEGER
            )",
      [],
    )?;

    conn.execute(
      "CREATE INDEX IF NOT EXISTS IDX_cuePoint_trackId ON cuePoint(trackId)",
      [],
    )?;
    conn.execute(
      "CREATE INDEX IF NOT EXISTS IDX_cuePoint_type ON cuePoint(type)",
      [],
    )?;

    Ok(())
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Track CRUD Operations ──
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get all tracks from the database
  pub fn get_all_tracks(&self) -> Result<Vec<Track>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, path, title, artist, album, genre, year, duration, bitrate, 
                    comment, bpm, initialKey, rating, label, waveformPeaks, addedAt, url 
             FROM track",
    )?;

    let tracks = stmt
      .query_map([], |row| {
        Ok(Track {
          id: row.get(0)?,
          path: row.get(1)?,
          title: row.get(2)?,
          artist: row.get(3)?,
          album: row.get(4)?,
          genre: row.get(5)?,
          year: row.get(6)?,
          duration: row.get(7)?,
          bitrate: row.get(8)?,
          comment: row.get(9)?,
          bpm: row.get(10)?,
          initial_key: row.get(11)?,
          rating: row
            .get::<_, Option<String>>(12)?
            .and_then(|s| serde_json::from_str(&s).ok()),
          label: row.get(13)?,
          waveform_peaks: row
            .get::<_, Option<String>>(14)?
            .and_then(|s| serde_json::from_str(&s).ok()),
          added_at: row.get(15)?,
          url: row.get(16)?,
        })
      })?
      .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(tracks)
  }

  /// Get a single track by ID
  pub fn get_track_by_id(&self, track_id: &str) -> Result<Option<Track>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, path, title, artist, album, genre, year, duration, bitrate, 
                    comment, bpm, initialKey, rating, label, waveformPeaks, addedAt, url 
             FROM track WHERE id = ?1",
    )?;

    let track = stmt
      .query_row([track_id], |row| {
        Ok(Track {
          id: row.get(0)?,
          path: row.get(1)?,
          title: row.get(2)?,
          artist: row.get(3)?,
          album: row.get(4)?,
          genre: row.get(5)?,
          year: row.get(6)?,
          duration: row.get(7)?,
          bitrate: row.get(8)?,
          comment: row.get(9)?,
          bpm: row.get(10)?,
          initial_key: row.get(11)?,
          rating: row
            .get::<_, Option<String>>(12)?
            .and_then(|s| serde_json::from_str(&s).ok()),
          label: row.get(13)?,
          waveform_peaks: row
            .get::<_, Option<String>>(14)?
            .and_then(|s| serde_json::from_str(&s).ok()),
          added_at: row.get(15)?,
          url: row.get(16)?,
        })
      })
      .optional()?;

    Ok(track)
  }

  /// Insert multiple tracks (used during library import)
  pub fn insert_tracks(&self, tracks: &[Track]) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "INSERT INTO track (id, path, title, artist, album, genre, year, duration, bitrate,
                               comment, bpm, initialKey, rating, label, waveformPeaks, addedAt, url)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                artist = excluded.artist,
                album = excluded.album,
                genre = excluded.genre,
                year = excluded.year,
                duration = excluded.duration,
                bitrate = excluded.bitrate,
                comment = excluded.comment,
                bpm = excluded.bpm,
                initialKey = excluded.initialKey,
                rating = excluded.rating,
                label = excluded.label,
                waveformPeaks = excluded.waveformPeaks,
                url = excluded.url",
    )?;

    for track in tracks {
      let rating_json = track
        .rating
        .as_ref()
        .and_then(|r| serde_json::to_string(r).ok());
      let waveform_json = track
        .waveform_peaks
        .as_ref()
        .and_then(|w| serde_json::to_string(w).ok());

      stmt.execute(params![
        track.id,
        track.path,
        track.title,
        track.artist,
        track.album,
        track.genre,
        track.year,
        track.duration,
        track.bitrate,
        track.comment,
        track.bpm,
        track.initial_key,
        rating_json,
        track.label,
        waveform_json,
        track.added_at,
        track.url,
      ])?;
    }

    Ok(())
  }

  /// Update a single track
  pub fn update_track(&self, track: &Track) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    let rating_json = track
      .rating
      .as_ref()
      .and_then(|r| serde_json::to_string(r).ok());
    let waveform_json = track
      .waveform_peaks
      .as_ref()
      .and_then(|w| serde_json::to_string(w).ok());

    conn.execute(
      "UPDATE track SET 
                path = ?2, title = ?3, artist = ?4, album = ?5, genre = ?6, year = ?7,
                duration = ?8, bitrate = ?9, comment = ?10, bpm = ?11, initialKey = ?12,
                rating = ?13, label = ?14, waveformPeaks = ?15, url = ?16
             WHERE id = ?1",
      params![
        track.id,
        track.path,
        track.title,
        track.artist,
        track.album,
        track.genre,
        track.year,
        track.duration,
        track.bitrate,
        track.comment,
        track.bpm,
        track.initial_key,
        rating_json,
        track.label,
        waveform_json,
        track.url,
      ],
    )?;

    Ok(())
  }

  /// Delete tracks by IDs
  pub fn delete_tracks(&self, track_ids: &[String]) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare("DELETE FROM track WHERE id = ?1")?;

    for id in track_ids {
      stmt.execute([id])?;
    }

    Ok(())
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Playlist CRUD Operations ──
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get all playlists (without tracks)
  pub fn get_all_playlists(&self) -> Result<Vec<Playlist>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, folderId FROM playlist")?;

    let playlists = stmt
      .query_map([], |row| {
        Ok(Playlist {
          id: row.get(0)?,
          name: row.get(1)?,
          folder_id: row.get(2)?,
          tracks: vec![], // Tracks loaded separately if needed
        })
      })?
      .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(playlists)
  }

  /// Get a single playlist by ID with tracks
  pub fn get_playlist_by_id(&self, playlist_id: &str) -> Result<Option<Playlist>> {
    let conn = self.conn.lock().unwrap();

    // Get playlist metadata
    let playlist_opt: Option<(String, String, Option<String>)> = conn
      .query_row(
        "SELECT id, name, folderId FROM playlist WHERE id = ?1",
        [playlist_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
      )
      .optional()?;

    if let Some((id, name, folder_id)) = playlist_opt {
      // Get tracks for this playlist ordered by 'order'
      let mut stmt = conn.prepare(
        "SELECT t.id, t.path, t.title, t.artist, t.album, t.genre, t.year, t.duration,
                       t.bitrate, t.comment, t.bpm, t.initialKey, t.rating, t.label,
                       t.waveformPeaks, t.addedAt, t.url
                FROM track t
                INNER JOIN playlistTrack pt ON t.id = pt.trackId
                WHERE pt.playlistId = ?1
                ORDER BY pt.\"order\" ASC",
      )?;

      let tracks = stmt
        .query_map([playlist_id], |row| {
          Ok(Track {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            genre: row.get(5)?,
            year: row.get(6)?,
            duration: row.get(7)?,
            bitrate: row.get(8)?,
            comment: row.get(9)?,
            bpm: row.get(10)?,
            initial_key: row.get(11)?,
            rating: row
              .get::<_, Option<String>>(12)?
              .and_then(|s| serde_json::from_str(&s).ok()),
            label: row.get(13)?,
            waveform_peaks: row
              .get::<_, Option<String>>(14)?
              .and_then(|s| serde_json::from_str(&s).ok()),
            added_at: row.get(15)?,
            url: row.get(16)?,
          })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

      Ok(Some(Playlist {
        id,
        name,
        folder_id,
        tracks,
      }))
    } else {
      Ok(None)
    }
  }

  /// Create a new playlist
  pub fn create_playlist(&self, playlist: &Playlist) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO playlist (id, name, folderId) VALUES (?1, ?2, ?3)",
      params![playlist.id, playlist.name, playlist.folder_id],
    )?;
    Ok(())
  }

  /// Update playlist metadata (name, folder)
  pub fn update_playlist(&self, playlist: &Playlist) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE playlist SET name = ?2, folderId = ?3 WHERE id = ?1",
      params![playlist.id, playlist.name, playlist.folder_id],
    )?;
    Ok(())
  }

  /// Delete a playlist by ID
  pub fn delete_playlist(&self, playlist_id: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute("DELETE FROM playlist WHERE id = ?1", [playlist_id])?;
    Ok(())
  }

  /// Add tracks to a playlist (replaces existing tracks)
  pub fn set_playlist_tracks(&self, playlist_id: &str, track_ids: &[String]) -> Result<()> {
    let conn = self.conn.lock().unwrap();

    // Delete existing playlist tracks
    conn.execute(
      "DELETE FROM playlistTrack WHERE playlistId = ?1",
      [playlist_id],
    )?;

    // Insert new tracks with order indices
    let mut stmt = conn.prepare(
      "INSERT INTO playlistTrack (id, playlistId, trackId, \"order\") VALUES (?1, ?2, ?3, ?4)",
    )?;

    for (order, track_id) in track_ids.iter().enumerate() {
      let pt_id = uuid::Uuid::new_v4().to_string();
      stmt.execute(params![pt_id, playlist_id, track_id, order as i64])?;
    }

    Ok(())
  }

  /// Add a single track to the end of a playlist
  pub fn add_track_to_playlist(&self, playlist_id: &str, track_id: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();

    // Get current max order
    let max_order: Option<i64> = conn
      .query_row(
        "SELECT MAX(\"order\") FROM playlistTrack WHERE playlistId = ?1",
        [playlist_id],
        |row| row.get(0),
      )
      .optional()?
      .flatten();

    let next_order = max_order.unwrap_or(-1) + 1;
    let pt_id = uuid::Uuid::new_v4().to_string();

    conn.execute(
      "INSERT INTO playlistTrack (id, playlistId, trackId, \"order\") VALUES (?1, ?2, ?3, ?4)",
      params![pt_id, playlist_id, track_id, next_order],
    )?;

    Ok(())
  }

  /// Remove tracks from a playlist
  pub fn remove_tracks_from_playlist(&self, playlist_id: &str, track_ids: &[String]) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    let mut stmt =
      conn.prepare("DELETE FROM playlistTrack WHERE playlistId = ?1 AND trackId = ?2")?;

    for track_id in track_ids {
      stmt.execute(params![playlist_id, track_id])?;
    }

    Ok(())
  }

  /// Reorder tracks in a playlist (provide full ordered list of track IDs)
  pub fn reorder_playlist_tracks(
    &self,
    playlist_id: &str,
    ordered_track_ids: &[String],
  ) -> Result<()> {
    let conn = self.conn.lock().unwrap();

    // Update order indices for existing tracks
    let mut stmt = conn
      .prepare("UPDATE playlistTrack SET \"order\" = ?1 WHERE playlistId = ?2 AND trackId = ?3")?;

    for (order, track_id) in ordered_track_ids.iter().enumerate() {
      stmt.execute(params![order as i64, playlist_id, track_id])?;
    }

    Ok(())
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Folder CRUD Operations ──
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get all folders
  pub fn get_all_folders(&self) -> Result<Vec<Folder>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, parentId, path FROM folder ORDER BY path")?;

    let folders = stmt
      .query_map([], |row| {
        Ok(Folder {
          id: row.get(0)?,
          name: row.get(1)?,
          parent_id: row.get(2)?,
          path: row.get(3)?,
        })
      })?
      .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(folders)
  }

  /// Get a single folder by ID
  pub fn get_folder_by_id(&self, folder_id: &str) -> Result<Option<Folder>> {
    let conn = self.conn.lock().unwrap();
    let folder = conn
      .query_row(
        "SELECT id, name, parentId, path FROM folder WHERE id = ?1",
        [folder_id],
        |row| {
          Ok(Folder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            path: row.get(3)?,
          })
        },
      )
      .optional()?;

    Ok(folder)
  }

  /// Create a new folder
  pub fn create_folder(&self, folder: &Folder) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "INSERT INTO folder (id, name, parentId, path) VALUES (?1, ?2, ?3, ?4)",
      params![folder.id, folder.name, folder.parent_id, folder.path],
    )?;
    Ok(())
  }

  /// Update folder metadata
  pub fn update_folder(&self, folder: &Folder) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute(
      "UPDATE folder SET name = ?2, parentId = ?3, path = ?4 WHERE id = ?1",
      params![folder.id, folder.name, folder.parent_id, folder.path],
    )?;
    Ok(())
  }

  /// Delete a folder by ID
  pub fn delete_folder(&self, folder_id: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute("DELETE FROM folder WHERE id = ?1", [folder_id])?;
    Ok(())
  }

  /// Save/upsert multiple folders (for Traktor sync)
  pub fn save_folders(&self, folders: &[Folder]) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "INSERT INTO folder (id, name, parentId, path) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                parentId = excluded.parentId,
                path = excluded.path",
    )?;

    for folder in folders {
      stmt.execute(params![
        folder.id,
        folder.name,
        folder.parent_id,
        folder.path
      ])?;
    }

    info!("Saved {} folders", folders.len());
    Ok(())
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── CuePoint CRUD Operations ──
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get all cue points for a track
  pub fn get_cue_points_for_track(&self, track_id: &str) -> Result<Vec<CuePoint>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "SELECT id, trackId, type, positionMs, lengthMs, hotcueSlot, name, color, \"order\"
             FROM cuePoint WHERE trackId = ?1 ORDER BY positionMs",
    )?;

    let cue_points = stmt
      .query_map([track_id], |row| {
        let type_str: String = row.get(2)?;
        let cue_type = CueType::from_str(&type_str).ok_or_else(|| {
          rusqlite::Error::FromSqlConversionFailure(
            2,
            rusqlite::types::Type::Text,
            Box::new(std::io::Error::new(
              std::io::ErrorKind::InvalidData,
              format!("Invalid cue type: {}", type_str),
            )),
          )
        })?;

        Ok(CuePoint {
          id: row.get(0)?,
          track_id: row.get(1)?,
          cue_type,
          position_ms: row.get(3)?,
          length_ms: row.get(4)?,
          hotcue_slot: row.get(5)?,
          name: row.get(6)?,
          color: row.get(7)?,
          order: row.get(8)?,
        })
      })?
      .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(cue_points)
  }

  /// Get cue points for multiple tracks (batch operation)
  pub fn get_cue_points_for_tracks(&self, track_ids: &[String]) -> Result<Vec<CuePoint>> {
    if track_ids.is_empty() {
      return Ok(vec![]);
    }

    let conn = self.conn.lock().unwrap();
    let placeholders = track_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!(
      "SELECT id, trackId, type, positionMs, lengthMs, hotcueSlot, name, color, \"order\"
             FROM cuePoint WHERE trackId IN ({}) ORDER BY trackId, positionMs",
      placeholders
    );

    let mut stmt = conn.prepare(&query)?;
    let params: Vec<&dyn rusqlite::ToSql> = track_ids
      .iter()
      .map(|id| id as &dyn rusqlite::ToSql)
      .collect();

    let cue_points = stmt
      .query_map(params.as_slice(), |row| {
        let type_str: String = row.get(2)?;
        let cue_type = CueType::from_str(&type_str).ok_or_else(|| {
          rusqlite::Error::FromSqlConversionFailure(
            2,
            rusqlite::types::Type::Text,
            Box::new(std::io::Error::new(
              std::io::ErrorKind::InvalidData,
              format!("Invalid cue type: {}", type_str),
            )),
          )
        })?;

        Ok(CuePoint {
          id: row.get(0)?,
          track_id: row.get(1)?,
          cue_type,
          position_ms: row.get(3)?,
          length_ms: row.get(4)?,
          hotcue_slot: row.get(5)?,
          name: row.get(6)?,
          color: row.get(7)?,
          order: row.get(8)?,
        })
      })?
      .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(cue_points)
  }

  /// Save/upsert cue points
  pub fn save_cue_points(&self, cue_points: &[CuePoint]) -> Result<()> {
    if cue_points.is_empty() {
      return Ok(());
    }

    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
      "INSERT INTO cuePoint (id, trackId, type, positionMs, lengthMs, hotcueSlot, name, color, \"order\")
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
                trackId = excluded.trackId,
                type = excluded.type,
                positionMs = excluded.positionMs,
                lengthMs = excluded.lengthMs,
                hotcueSlot = excluded.hotcueSlot,
                name = excluded.name,
                color = excluded.color,
                \"order\" = excluded.\"order\"",
    )?;

    for cue in cue_points {
      stmt.execute(params![
        cue.id,
        cue.track_id,
        cue.cue_type.to_string(),
        cue.position_ms,
        cue.length_ms,
        cue.hotcue_slot,
        cue.name,
        cue.color,
        cue.order,
      ])?;
    }

    info!("Saved {} cue points", cue_points.len());
    Ok(())
  }

  /// Delete all cue points for a track
  pub fn delete_cue_points_for_track(&self, track_id: &str) -> Result<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute("DELETE FROM cuePoint WHERE trackId = ?1", [track_id])?;
    info!("Deleted cue points for track {}", track_id);
    Ok(())
  }

  /// Delete specific cue points by ID
  pub fn delete_cue_points(&self, cue_point_ids: &[String]) -> Result<()> {
    if cue_point_ids.is_empty() {
      return Ok(());
    }

    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare("DELETE FROM cuePoint WHERE id = ?1")?;

    for id in cue_point_ids {
      stmt.execute([id])?;
    }

    info!("Deleted {} cue points", cue_point_ids.len());
    Ok(())
  }

  /// Replace all cue points for a track (delete existing, insert new)
  pub fn replace_cue_points_for_track(
    &self,
    track_id: &str,
    cue_points: &[CuePoint],
  ) -> Result<()> {
    let conn = self.conn.lock().unwrap();

    // Delete existing
    conn.execute("DELETE FROM cuePoint WHERE trackId = ?1", [track_id])?;

    // Insert new if any
    if !cue_points.is_empty() {
      let mut stmt = conn.prepare(
        "INSERT INTO cuePoint (id, trackId, type, positionMs, lengthMs, hotcueSlot, name, color, \"order\")
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
      )?;

      for cue in cue_points {
        stmt.execute(params![
          cue.id,
          cue.track_id,
          cue.cue_type.to_string(),
          cue.position_ms,
          cue.length_ms,
          cue.hotcue_slot,
          cue.name,
          cue.color,
          cue.order,
        ])?;
      }
    }

    info!(
      "Replaced cue points for track {} with {} new cue points",
      track_id,
      cue_points.len()
    );
    Ok(())
  }
}
