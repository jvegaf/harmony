/**
 * Tagger Worker Types
 *
 * AIDEV-NOTE: Defines the message protocol between main thread and tagger workers.
 * Each provider (Beatport, Traxsource, Bandcamp) has its own worker thread that
 * handles all HTTP requests/scraping for that provider.
 */

import { Worker as NodeWorker } from 'worker_threads';
import { ProviderSource } from '@preload/types/tagger';
import { RawTrackData } from '../providers/types';
import { BeatportTrack } from '@preload/types/beatport';
import { TXTrack } from '@preload/types/traxsource';

/**
 * Message types sent from main thread to worker
 */
export type TaggerWorkerMessageType = 'search' | 'getDetails';

/**
 * Payload for search operation
 */
export interface SearchPayload {
  title: string;
  artist: string;
}

/**
 * Payload for getDetails operation
 * Provider-specific detail fetching
 */
export interface GetDetailsPayload {
  /** Track ID in the provider's format */
  trackId: string;

  /** For Traxsource: need to re-search to get TXTrack object */
  localTitle?: string;
  localArtist?: string;
}

/**
 * Message sent from main thread to worker
 */
export interface TaggerWorkerMessage {
  type: TaggerWorkerMessageType;
  /** Unique ID to correlate request with response */
  id: string;
  payload: SearchPayload | GetDetailsPayload;
}

/**
 * Result types from worker to main thread
 */
export type TaggerWorkerResultType = 'result' | 'error' | 'ready';

/**
 * Success result containing data
 */
export interface TaggerWorkerSuccessResult {
  type: 'result';
  id: string;
  result: RawTrackData[] | RawTrackData | BeatportTrack | TXTrack;
}

/**
 * Error result
 */
export interface TaggerWorkerErrorResult {
  type: 'error';
  id: string;
  error: string;
  stack?: string;
}

/**
 * Ready signal from worker (sent after initialization)
 */
export interface TaggerWorkerReadyResult {
  type: 'ready';
}

/**
 * Union type for all worker results
 */
export type TaggerWorkerResult = TaggerWorkerSuccessResult | TaggerWorkerErrorResult | TaggerWorkerReadyResult;

/**
 * Worker data passed when spawning the worker
 */
export interface TaggerWorkerData {
  /** Which provider this worker handles */
  providerType: ProviderSource;
  /** Worker ID for logging */
  workerId: number;
}

/**
 * Pending task tracked by the manager
 */
export interface PendingTask {
  id: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

/**
 * Worker instance managed by TaggerWorkerManager
 */
export interface WorkerInstance {
  provider: ProviderSource;
  worker: NodeWorker;
  ready: boolean;
  busy: boolean;
  currentTaskId: string | null;
}

/**
 * Batch search request for a single track
 */
export interface BatchSearchRequest {
  /** Local track ID for correlation */
  trackId: string;
  title: string;
  artist: string;
  /** Optional duration for scoring */
  durationSecs?: number;
}

/**
 * Result of batch search for a single track
 */
export interface BatchSearchResult {
  trackId: string;
  /** Results per provider */
  providerResults: Map<ProviderSource, RawTrackData[]>;
  /** Any errors per provider */
  errors: Map<ProviderSource, string>;
}
