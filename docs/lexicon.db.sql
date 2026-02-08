BEGIN TRANSACTION;
DROP TABLE IF EXISTS "AlbumartPreview";
CREATE TABLE "AlbumartPreview" (
	"trackId"	INTEGER NOT NULL UNIQUE,
	"data"	BLOB,
	FOREIGN KEY("trackId") REFERENCES "Track"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "ChartItem";
CREATE TABLE "ChartItem" (
	"id"	INTEGER NOT NULL UNIQUE,
	"type"	TEXT NOT NULL,
	"externalId"	TEXT NOT NULL,
	"owned"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "CloudFile";
CREATE TABLE "CloudFile" (
	"id"	INTEGER NOT NULL,
	"locationUnique"	TEXT,
	"cloudId"	TEXT,
	"state"	INTEGER NOT NULL,
	"trackId"	INTEGER,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "Cuepoint";
CREATE TABLE "Cuepoint" (
	"id"	INTEGER NOT NULL UNIQUE,
	"trackId"	INTEGER NOT NULL,
	"name"	TEXT,
	"type"	TEXT NOT NULL,
	"startTime"	REAL NOT NULL,
	"endTime"	REAL,
	"position"	INTEGER NOT NULL,
	"color"	TEXT,
	"activeLoop"	INTEGER,
	"data"	TEXT DEFAULT '{}',
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("trackId") REFERENCES "Track"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "Database";
CREATE TABLE "Database" (
	"version"	INTEGER,
	"uuid"	TEXT
);
DROP TABLE IF EXISTS "LinkTagTrack";
CREATE TABLE "LinkTagTrack" (
	"id"	INTEGER NOT NULL UNIQUE,
	"tagId"	INTEGER NOT NULL,
	"trackId"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE,
	FOREIGN KEY("trackId") REFERENCES "Track"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "LinkTrackPlaylist";
CREATE TABLE "LinkTrackPlaylist" (
	"id"	INTEGER NOT NULL UNIQUE,
	"playlistId"	INTEGER NOT NULL,
	"trackId"	INTEGER NOT NULL,
	"position"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE,
	FOREIGN KEY("trackId") REFERENCES "Track"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "Playlist";
CREATE TABLE "Playlist" (
	"id"	INTEGER NOT NULL UNIQUE,
	"name"	TEXT NOT NULL,
	"dateAdded"	TEXT NOT NULL,
	"dateModified"	TEXT NOT NULL,
	"type"	TEXT NOT NULL,
	"folderType"	TEXT,
	"smartlist"	TEXT,
	"parentId"	INTEGER,
	"position"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("parentId") REFERENCES "Playlist"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "Setting";
CREATE TABLE "Setting" (
	"id"	INTEGER NOT NULL UNIQUE,
	"feature"	TEXT NOT NULL,
	"name"	TEXT NOT NULL,
	"data"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "Tag";
CREATE TABLE "Tag" (
	"id"	INTEGER NOT NULL UNIQUE,
	"categoryId"	INTEGER NOT NULL,
	"label"	TEXT NOT NULL,
	"position"	INTEGER NOT NULL,
	"shortcut"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("categoryId") REFERENCES "TagCategory"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "TagCategory";
CREATE TABLE "TagCategory" (
	"id"	INTEGER NOT NULL UNIQUE,
	"label"	TEXT NOT NULL,
	"position"	INTEGER NOT NULL,
	"color"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "Tempomarker";
CREATE TABLE "Tempomarker" (
	"id"	INTEGER NOT NULL UNIQUE,
	"trackId"	INTEGER NOT NULL,
	"startTime"	REAL NOT NULL,
	"bpm"	REAL NOT NULL,
	"data"	TEXT DEFAULT '{}',
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("trackId") REFERENCES "Track"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "Track";
CREATE TABLE "Track" (
	"id"	INTEGER UNIQUE,
	"title"	TEXT NOT NULL,
	"artist"	TEXT NOT NULL,
	"dateAdded"	TEXT NOT NULL,
	"dateModified"	TEXT NOT NULL,
	"location"	TEXT NOT NULL,
	"locationUnique"	TEXT NOT NULL UNIQUE,
	"type"	TEXT NOT NULL,
	"streamingService"	TEXT,
	"streamingId"	TEXT,
	"albumTitle"	TEXT NOT NULL,
	"bitrate"	INTEGER NOT NULL,
	"genre"	TEXT NOT NULL,
	"comment"	TEXT NOT NULL,
	"key"	TEXT NOT NULL,
	"playCount"	INTEGER NOT NULL,
	"lastPlayed"	TEXT,
	"duration"	INTEGER NOT NULL,
	"rating"	INTEGER NOT NULL DEFAULT 0,
	"sizeBytes"	INTEGER NOT NULL,
	"bpm"	REAL NOT NULL,
	"color"	TEXT NOT NULL,
	"remixer"	TEXT NOT NULL,
	"mix"	TEXT NOT NULL,
	"importSource"	TEXT NOT NULL,
	"label"	TEXT NOT NULL,
	"composer"	TEXT NOT NULL,
	"producer"	TEXT NOT NULL,
	"grouping"	TEXT NOT NULL,
	"lyricist"	TEXT NOT NULL,
	"year"	INTEGER NOT NULL,
	"sampleRate"	INTEGER NOT NULL,
	"trackNumber"	INTEGER NOT NULL,
	"energy"	INTEGER NOT NULL DEFAULT 0,
	"danceability"	INTEGER NOT NULL DEFAULT 0,
	"popularity"	INTEGER NOT NULL DEFAULT 0,
	"happiness"	INTEGER NOT NULL DEFAULT 0,
	"archived"	INTEGER NOT NULL DEFAULT 0,
	"archivedSince"	TEXT,
	"incoming"	INTEGER NOT NULL DEFAULT 0,
	"extra1"	TEXT NOT NULL,
	"extra2"	TEXT NOT NULL,
	"beatshiftCase"	TEXT,
	"fingerprint"	TEXT,
	"data"	TEXT DEFAULT '{}',
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "Waveform";
CREATE TABLE "Waveform" (
	"trackId"	INTEGER NOT NULL UNIQUE,
	"data"	BLOB,
	"previewCues"	TEXT,
	"iteration"	INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY("trackId") REFERENCES "Track"("id") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "sqlite_stat4";
CREATE TABLE "sqlite_stat4" (
	"tbl"	,
	"idx"	,
	"neq"	,
	"nlt"	,
	"ndlt"	,
	"sample"	
);
DROP VIEW IF EXISTS "Tracks_Archived";
CREATE VIEW Tracks_Archived AS SELECT * FROM Track WHERE archived == 1;
DROP VIEW IF EXISTS "Tracks_Incoming";
CREATE VIEW Tracks_Incoming AS SELECT * FROM Track WHERE incoming == 1 and archived == 0;
DROP VIEW IF EXISTS "Tracks_NonArchived";
CREATE VIEW Tracks_NonArchived AS SELECT * FROM Track WHERE archived == 0;
DROP INDEX IF EXISTS "ChartItem_TypeExternalId";
CREATE UNIQUE INDEX "ChartItem_TypeExternalId" ON "ChartItem" (
	"type",
	"externalId"
);
DROP INDEX IF EXISTS "CloudFile_CloudId";
CREATE UNIQUE INDEX "CloudFile_CloudId" ON "CloudFile" (
	"cloudId"
);
DROP INDEX IF EXISTS "CloudFile_LocationUnique";
CREATE UNIQUE INDEX "CloudFile_LocationUnique" ON "CloudFile" (
	"locationUnique"
);
DROP INDEX IF EXISTS "CloudFile_State";
CREATE INDEX "CloudFile_State" ON "CloudFile" (
	"state"
);
DROP INDEX IF EXISTS "CloudFile_TrackId";
CREATE UNIQUE INDEX "CloudFile_TrackId" ON "CloudFile" (
	"trackId"
);
DROP INDEX IF EXISTS "Cuepoint_TrackIdPositionType";
CREATE UNIQUE INDEX "Cuepoint_TrackIdPositionType" ON "Cuepoint" (
	"trackId",
	"position",
	"type"
);
DROP INDEX IF EXISTS "LinkTagTrack_TagIdTrackId";
CREATE UNIQUE INDEX "LinkTagTrack_TagIdTrackId" ON "LinkTagTrack" (
	"trackId",
	"tagId"
);
DROP INDEX IF EXISTS "LinkTrackPlaylist_PlaylistIdPosition";
CREATE INDEX "LinkTrackPlaylist_PlaylistIdPosition" ON "LinkTrackPlaylist" (
	"playlistId"	ASC,
	"position"	ASC
);
DROP INDEX IF EXISTS "LinkTrackPlaylist_PlaylistIdTrackId";
CREATE UNIQUE INDEX "LinkTrackPlaylist_PlaylistIdTrackId" ON "LinkTrackPlaylist" (
	"trackId",
	"playlistId"
);
DROP INDEX IF EXISTS "Setting_FeatureName";
CREATE UNIQUE INDEX "Setting_FeatureName" ON "Setting" (
	"feature",
	"name"
);
DROP INDEX IF EXISTS "TagCategory_Label";
CREATE UNIQUE INDEX "TagCategory_Label" ON "TagCategory" (
	"label"
);
DROP INDEX IF EXISTS "Tempomarker_TrackId";
CREATE INDEX "Tempomarker_TrackId" ON "Tempomarker" (
	"trackId"
);
DROP INDEX IF EXISTS "Track_StreamingIdService";
CREATE UNIQUE INDEX "Track_StreamingIdService" ON "Track" (
	"streamingService",
	"streamingId"
);
DROP INDEX IF EXISTS "Track_albumTitle";
CREATE INDEX "Track_albumTitle" ON "Track" (
	"albumTitle" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_artist";
CREATE INDEX "Track_artist" ON "Track" (
	"artist" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_bitrate";
CREATE INDEX "Track_bitrate" ON "Track" (
	"bitrate",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_bpm";
CREATE INDEX "Track_bpm" ON "Track" (
	"bpm",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_color";
CREATE INDEX "Track_color" ON "Track" (
	"color" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_comment";
CREATE INDEX "Track_comment" ON "Track" (
	"comment" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_composer";
CREATE INDEX "Track_composer" ON "Track" (
	"composer" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_danceability";
CREATE INDEX "Track_danceability" ON "Track" (
	"danceability",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_dateAdded";
CREATE INDEX "Track_dateAdded" ON "Track" (
	"dateAdded" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_dateModified";
CREATE INDEX "Track_dateModified" ON "Track" (
	"dateModified" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_duration";
CREATE INDEX "Track_duration" ON "Track" (
	"duration",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_energy";
CREATE INDEX "Track_energy" ON "Track" (
	"energy",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_extra1";
CREATE INDEX "Track_extra1" ON "Track" (
	"extra1" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_extra2";
CREATE INDEX "Track_extra2" ON "Track" (
	"extra2" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_genre";
CREATE INDEX "Track_genre" ON "Track" (
	"genre" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_grouping";
CREATE INDEX "Track_grouping" ON "Track" (
	"grouping" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_happiness";
CREATE INDEX "Track_happiness" ON "Track" (
	"happiness",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_key";
CREATE INDEX "Track_key" ON "Track" (
	"key" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_label";
CREATE INDEX "Track_label" ON "Track" (
	"label" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_lastPlayed";
CREATE INDEX "Track_lastPlayed" ON "Track" (
	"lastPlayed" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_location";
CREATE INDEX "Track_location" ON "Track" (
	"location" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_locationUnique";
CREATE UNIQUE INDEX "Track_locationUnique" ON "Track" (
	"locationUnique"
);
DROP INDEX IF EXISTS "Track_lyricist";
CREATE INDEX "Track_lyricist" ON "Track" (
	"lyricist" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_mix";
CREATE INDEX "Track_mix" ON "Track" (
	"mix" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_playCount";
CREATE INDEX "Track_playCount" ON "Track" (
	"playCount",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_popularity";
CREATE INDEX "Track_popularity" ON "Track" (
	"popularity",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_producer";
CREATE INDEX "Track_producer" ON "Track" (
	"producer" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_rating";
CREATE INDEX "Track_rating" ON "Track" (
	"rating",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_remixer";
CREATE INDEX "Track_remixer" ON "Track" (
	"remixer" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_sampleRate";
CREATE INDEX "Track_sampleRate" ON "Track" (
	"sampleRate",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_sizeBytes";
CREATE INDEX "Track_sizeBytes" ON "Track" (
	"sizeBytes",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_title";
CREATE INDEX "Track_title" ON "Track" (
	"title" COLLATE NOCASE,
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_trackNumber";
CREATE INDEX "Track_trackNumber" ON "Track" (
	"trackNumber",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Track_year";
CREATE INDEX "Track_year" ON "Track" (
	"year",
	"incoming",
	"archived"
);
DROP INDEX IF EXISTS "Waveform_TrackIteration";
CREATE INDEX "Waveform_TrackIteration" ON "Waveform" (
	"trackId",
	"iteration"
);
COMMIT;
