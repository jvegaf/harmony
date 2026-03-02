/**
 * Tagger types for metadata tagging from multiple providers
 * (Beatport, Traxsource, Bandcamp, etc.)
 *
 * AIDEV-NOTE: These types must match the field names used by:
 *   - TagCandidatesSelection.tsx (UI component)
 *   - useTaggerStore.ts (state management)
 *   - SettingsTagger.tsx (provider configuration UI)
 * The component uses snake_case field names (local_track_id, etc.)
 * because they originate from the backend provider APIs.
 */

export type ProviderSource = 'beatport' | 'traxsource' | 'bandcamp';

export interface TaggerProviderConfig {
  /** Provider identifier (beatport, traxsource, bandcamp) */
  name: ProviderSource;
  /** Human-readable display name for UI */
  displayName: string;
  /** Whether this provider participates in searches */
  enabled: boolean;
  /** Search priority (lower = higher priority, used for tie-breaking) */
  priority: number;
  /** Maximum results to fetch from this provider per search */
  maxResults: number;
  /** Optional API key for authenticated providers */
  apiKey?: string;
  /** Allow additional provider-specific config */
  [key: string]: any;
}

export interface TrackCandidate {
  /** Provider source identifier (e.g., 'beatport', 'traxsource', 'bandcamp') */
  source: string;
  id: string;
  title: string;
  /** Combined artist names string */
  artists: string;
  album?: string;
  bpm?: number;
  /** Musical key (e.g., 'Am', '8A') */
  key?: string;
  genre?: string;
  label?: string;
  /** URL to the track on the provider's website */
  url?: string;
  /** URL to artwork/cover image */
  artwork_url?: string;
  /** Mix name if applicable (e.g., 'Original Mix', 'Extended Mix') */
  mix_name?: string;
  /** Duration in seconds */
  duration_secs?: number;
  /** Release date in ISO format (YYYY-MM-DD) */
  release_date?: string;
  /** Similarity score between 0 and 1 */
  similarity_score: number;

  // Legacy field aliases for backward compatibility
  provider?: string;
  artist?: string;
  initialKey?: string;
  year?: number;
  coverUrl?: string;
  confidence?: number;
  [key: string]: any; // Allow additional provider-specific fields
}

export interface TrackCandidatesResult {
  /** ID of the local track in the library */
  local_track_id: string;
  /** Title of the local track */
  local_title: string;
  /** Artist of the local track */
  local_artist: string;
  /** Duration of the local track in seconds */
  local_duration?: number;
  /** Filename of the local track */
  local_filename?: string;
  /** Error message if search failed for this track */
  error?: string;
  /** List of candidate matches from providers */
  candidates: TrackCandidate[];
}

export interface TrackSelection {
  /** ID of the local track in the library */
  local_track_id: string;
  /** Formatted candidate ID (provider:id) or null if skipped */
  selected_candidate_id: string | null;
  /** The selected candidate object (for backward compatibility) */
  selectedCandidate?: TrackCandidate | null;
  /** Legacy alias for local_track_id */
  trackId?: string;
}
