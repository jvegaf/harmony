import { ResultTag } from "../../../../preload/types/harmony";
import { GetStringTokens } from "../../../../preload/lib/utils-id3";
import { DabResponse, DabTrack } from "./dab.interfaces";

interface track {
	mix_name: string;
	name: string;
	artists?: [{ name: string }];
	id: string;
	key: { camelot_number: string; camelot_letter: string };
	release: { name: string; image: { uri: string } };
	publish_date: string;
	genre: { name: string };
	bpm: number;
	length_ms: number;
}

const CreateTagResult = (track: DabTrack): ResultTag => {
	const tagTrackTitle: string = track.version
		? `${track.title} (${track.version})`
		: track.title;

	const tagValues = [track.artist, track.title];
	if (track.version) {
		tagValues.push(track.version);
	}
	const tagTokens = GetStringTokens(tagValues);

	return {
		id: track.id,
		title: tagTrackTitle,
		artist: track.artist,
		album: track.albumTitle,
		year: track.releaseDate.substring(0, 4),
		genre: track.genre,
		duration: track.duration,
		artworkUrl: track.images.large,
		tokens: tagTokens,
	} as ResultTag;
};

const GetTagtracks = (res: DabResponse): ResultTag[] => {
	return res.tracks.map((track) => CreateTagResult(track));
};

export default GetTagtracks;
