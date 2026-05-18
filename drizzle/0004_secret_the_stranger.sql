ALTER TABLE `track` ADD `color` integer;--> statement-breakpoint
CREATE INDEX `IDX_track_addedAt` ON `track` (`addedAt`);--> statement-breakpoint
CREATE INDEX `IDX_track_artist` ON `track` (`artist`);--> statement-breakpoint
CREATE INDEX `IDX_track_genre` ON `track` (`genre`);--> statement-breakpoint
CREATE INDEX `IDX_track_bpm` ON `track` (`bpm`);