export interface DabResponse {
	tracks: DabTrack[];
	pagination: DabPagination;
}

export interface DabTrack {
	id: number;
	title: string;
	artist: string;
	artistId: number;
	albumTitle: string;
	albumCover: string;
	albumId: string;
	releaseDate: string;
	genre: string;
	duration: number;
	audioQuality: DabAudioQuality;
	version?: string;
	label: string;
	labelId: number;
	upc: string;
	mediaCount: number;
	parental_warning: boolean;
	streamable: boolean;
	purchasable: boolean;
	previewable: boolean;
	genreId: number;
	genreSlug: string;
	genreColor: string;
	releaseDateStream: string;
	releaseDateDownload: string;
	maximumChannelCount: number;
	images: DabImages;
	isrc: string;
}

export interface DabAudioQuality {
	maximumBitDepth: number;
	maximumSamplingRate: number;
	isHiRes: boolean;
}

export interface DabImages {
	small: string;
	thumbnail: string;
	large: string;
	back: any;
}

export interface DabPagination {
	offset: number;
	limit: number;
	total: number;
	hasMore: boolean;
	returned: number;
}
