export enum PlayerStatus {
	PLAY = "play",
	PAUSE = "pause",
	STOP = "stop",
}

/**
 * App models
 */

export type TrackId = string;
export type TrackSrc = string;

export interface Artwork {
	mime: string;
	type: { id: number };
	description?: string;
	imageBuffer: Buffer;
}

export interface TrackRating {
	source?: string;
	rating: number;
}

export interface Track {
	id: TrackId;
	album?: string;
	artist?: string;
	bpm?: number;
	genre?: string;
	initialKey?: string;
	duration: number;
	time?: string;
	path: TrackSrc;
	title: string;
	year?: number;
	bitrate?: number;
	rating?: TrackRating;
	comment?: string;
}

export interface ResultTag {
	id?: string | number;
	album?: string;
	artist?: string;
	bpm?: number;
	genre?: string;
	duration: number;
	key?: string;
	title: string;
	year?: string;
	artworkUrl?: string;
	tokens: string[];
}

export interface Playlist {
	id: string;
	name: string;
	tracks?: Track[];
}

export interface MatchResult {
	tag: ResultTag;
	trackTokens: string[];
	matches: number;
	of: number;
}

export interface ArtTrack {
	reqTrack: Track;
	selectedArtUrl?: string;
}

export interface ArtsTrackDTO extends ArtTrack {
	artsUrls: string[];
}

export const enum LogLevel {
	INFO,
	WARN,
	DEBUG,
	ERROR,
	VERBOSE,
}

export type TrackEditableFields = Pick<
	Track,
	| "title"
	| "artist"
	| "album"
	| "genre"
	| "year"
	| "comment"
	| "bpm"
	| "initialKey"
>;

export type LogProps = {
	level: LogLevel;
	params: any[];
};

export type CtxMenuPayload = {
	selected: Track[];
	playlists: Playlist[];
	currentPlaylist: string | null;
};

export type CommandPayload = {
	playlistId: string;
	selected: Track[];
};

export type UpdateRatingPayload = {
	trackSrc: TrackSrc;
	rating: number;
};

export interface Config {
	audioVolume: number;
	audioOutputDevice: string;
	audioMuted: boolean;
	sleepBlocker: boolean;
	displayNotifications: boolean;
	audioPreCuePosition: number;
}
