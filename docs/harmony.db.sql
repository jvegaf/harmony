BEGIN TRANSACTION;
DROP TABLE IF EXISTS "cue_point";
CREATE TABLE "cue_point" (
	"id"	varchar NOT NULL,
	"trackId"	varchar NOT NULL,
	"type"	varchar NOT NULL,
	"positionMs"	float NOT NULL,
	"lengthMs"	float,
	"hotcueSlot"	integer,
	"name"	varchar,
	"color"	varchar,
	"order"	integer,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "folder";
CREATE TABLE "folder" (
	"id"	varchar NOT NULL,
	"name"	varchar NOT NULL,
	"parentId"	varchar,
	"path"	varchar,
	PRIMARY KEY("id"),
	CONSTRAINT "FK_9ee3bd0f189fb242d488c0dfa39" FOREIGN KEY("parentId") REFERENCES "folder"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
DROP TABLE IF EXISTS "playlist";
CREATE TABLE "playlist" (
	"id"	varchar NOT NULL,
	"name"	varchar NOT NULL,
	"folderId"	varchar,
	PRIMARY KEY("id"),
	CONSTRAINT "FK_dc3c334a3f27077b90dcdde2264" FOREIGN KEY("folderId") REFERENCES "folder"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
DROP TABLE IF EXISTS "playlist_track";
CREATE TABLE "playlist_track" (
	"id"	varchar NOT NULL,
	"playlistId"	varchar NOT NULL,
	"trackId"	varchar NOT NULL,
	"order"	integer NOT NULL,
	PRIMARY KEY("id"),
	CONSTRAINT "FK_4a8364886ef4f5988bf7c3a19c8" FOREIGN KEY("playlistId") REFERENCES "playlist"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "FK_dd416fc96a9a3d3384f9f508b30" FOREIGN KEY("trackId") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
DROP TABLE IF EXISTS "track";
CREATE TABLE "track" (
	"id"	varchar NOT NULL,
	"path"	varchar NOT NULL,
	"title"	varchar NOT NULL,
	"artist"	varchar,
	"album"	varchar,
	"genre"	varchar,
	"year"	integer,
	"duration"	integer NOT NULL,
	"bitrate"	integer,
	"comment"	varchar,
	"bpm"	integer,
	"initialKey"	varchar,
	"rating"	json,
	"waveformPeaks"	json,
	PRIMARY KEY("id")
);
DROP INDEX IF EXISTS "IDX_cuePoint_trackId";
CREATE INDEX "IDX_cuePoint_trackId" ON "cue_point" (
	"trackId"
);
DROP INDEX IF EXISTS "IDX_cuePoint_type";
CREATE INDEX "IDX_cuePoint_type" ON "cue_point" (
	"type"
);
DROP INDEX IF EXISTS "IDX_folder_parentId";
CREATE INDEX "IDX_folder_parentId" ON "folder" (
	"parentId"
);
DROP INDEX IF EXISTS "IDX_folder_path";
CREATE INDEX "IDX_folder_path" ON "folder" (
	"path"
);
COMMIT;
