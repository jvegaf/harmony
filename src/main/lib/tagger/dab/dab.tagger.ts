import axios from "axios";
import { ResultTag } from "../../../../preload/types/harmony";
import { BuildDabQuery } from "../querybuilder";
import { handleResponse, handleError } from "../response";

const URI_BASE =
	"https://dab.yeet.su/api/search?q=Archie%20Hamilton%20-%20Telegram";
const OFFSET_FLAG = "&offset=0";
const SEARCH_TYPE_FLAG = "&type=track";

export const SearchTags = async (
	title: string,
	// duration: number,
	artist: string | null = null,
): Promise<ResultTag[]> => {
	const query = BuildDabQuery(title, artist);

	const uri = `${URI_BASE}${query}${OFFSET_FLAG}${SEARCH_TYPE_FLAG}`;

	const config = {
		headers: {
			Accept: "application/json",
		},
	};

	const { data } = await axios
		.get(uri, config)
		.then(handleResponse)
		.catch(handleError);

	return GetTagResults(data.tracks);
};
