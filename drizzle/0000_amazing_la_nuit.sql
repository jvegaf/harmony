CREATE TABLE `cuePoint` (
	`id` text PRIMARY KEY NOT NULL,
	`trackId` text NOT NULL,
	`type` text NOT NULL,
	`positionMs` real NOT NULL,
	`lengthMs` real,
	`hotcueSlot` integer,
	`name` text,
	`color` text,
	`order` integer
);
--> statement-breakpoint
CREATE INDEX `IDX_cuePoint_trackId` ON `cuePoint` (`trackId`);--> statement-breakpoint
CREATE INDEX `IDX_cuePoint_type` ON `cuePoint` (`type`);--> statement-breakpoint
CREATE TABLE `folder` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parentId` text,
	`path` text
);
--> statement-breakpoint
CREATE INDEX `IDX_folder_parentId` ON `folder` (`parentId`);--> statement-breakpoint
CREATE INDEX `IDX_folder_path` ON `folder` (`path`);--> statement-breakpoint
CREATE TABLE `playlistTrack` (
	`id` text PRIMARY KEY NOT NULL,
	`playlistId` text NOT NULL,
	`trackId` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`playlistId`) REFERENCES `playlist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`trackId`) REFERENCES `track`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `playlist` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`folderId` text,
	FOREIGN KEY (`folderId`) REFERENCES `folder`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `track` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`title` text NOT NULL,
	`artist` text,
	`album` text,
	`genre` text,
	`year` integer,
	`duration` integer NOT NULL,
	`bitrate` integer,
	`comment` text,
	`bpm` integer,
	`initialKey` text,
	`rating` text,
	`waveformPeaks` text
);
