export interface Tagger {
  SearchTags(title: string, artist: string | null): Promise<TagResult[]>;
}
