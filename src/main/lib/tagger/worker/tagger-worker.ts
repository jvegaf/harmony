/**
 * Tagger Worker Thread
 *
 * AIDEV-NOTE: Worker thread for handling provider-specific HTTP requests/scraping.
 * Each provider (Beatport, Traxsource, Bandcamp) gets its own worker instance.
 *
 * Design:
 * - One worker per provider type (defined by workerData.providerType)
 * - Handles all HTTP operations for that provider (search + getDetails)
 * - Processes requests sequentially to respect rate limits
 * - Returns structured results or errors to main thread
 *
 * Why workers?
 * - Offload CPU-intensive HTML parsing (cheerio) from main thread
 * - Offload network I/O blocking from main thread
 * - Allow true parallel processing across providers
 */

import { parentPort, workerData } from 'worker_threads';
import log from 'electron-log';

import { BeatportClient } from '../beatport/client/client';
import { Traxsource } from '../traxsource/traxsource';
import { BandcampClient, getBandcampClient } from '../bandcamp/client';
import { RawTrackData, TrackProvider } from '../providers/types';
import { BeatportProvider } from '../beatport/provider';
import { TraxsourceProvider } from '../traxsource/provider';
import { BandcampProvider } from '../bandcamp/provider';

import { TaggerWorkerMessage, TaggerWorkerResult, TaggerWorkerData, SearchPayload, GetDetailsPayload } from './types';

// Guard: must be run as a worker
if (!parentPort) {
  throw new Error('TaggerWorker must be run as a worker thread');
}

// Get worker configuration
const config = workerData as TaggerWorkerData;
const { providerType, workerId } = config;

log.info(`[TaggerWorker-${providerType}] Initializing worker ${workerId}...`);

/**
 * Initialize the provider client for this worker
 */
let provider: TrackProvider;
let beatportClient: BeatportClient | null = null;
let traxsourceClient: Traxsource | null = null;
let bandcampClient: BandcampClient | null = null;

try {
  switch (providerType) {
    case 'beatport':
      beatportClient = BeatportClient.new();
      provider = new BeatportProvider(beatportClient);
      break;

    case 'traxsource':
      traxsourceClient = new Traxsource();
      provider = new TraxsourceProvider(traxsourceClient);
      break;

    case 'bandcamp':
      bandcampClient = getBandcampClient();
      provider = new BandcampProvider(bandcampClient);
      break;

    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }

  log.info(`[TaggerWorker-${providerType}] Provider initialized successfully`);

  // Signal ready
  const readyMessage: TaggerWorkerResult = { type: 'ready' };
  parentPort.postMessage(readyMessage);
} catch (error) {
  log.error(`[TaggerWorker-${providerType}] Initialization failed:`, error);
  process.exit(1);
}

/**
 * Handle search request
 */
async function handleSearch(id: string, payload: SearchPayload): Promise<void> {
  try {
    log.info(`[TaggerWorker-${providerType}] Search: "${payload.artist} - ${payload.title}"`);

    const results: RawTrackData[] = await provider.search(payload.title, payload.artist);

    log.info(`[TaggerWorker-${providerType}] Search returned ${results.length} results`);

    const message: TaggerWorkerResult = {
      type: 'result',
      id,
      result: results,
    };
    parentPort!.postMessage(message);
  } catch (error) {
    log.error(`[TaggerWorker-${providerType}] Search failed:`, error);

    const message: TaggerWorkerResult = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    parentPort!.postMessage(message);
  }
}

/**
 * Handle getDetails request (provider-specific)
 */
async function handleGetDetails(id: string, payload: GetDetailsPayload): Promise<void> {
  try {
    log.info(`[TaggerWorker-${providerType}] GetDetails: ${payload.trackId}`);

    let result: any;

    if (providerType === 'beatport' && beatportClient) {
      // Beatport: getTrack from API v4
      const trackId = parseInt(payload.trackId, 10);
      result = await beatportClient.getTrack(trackId);
    } else if (providerType === 'traxsource' && traxsourceClient) {
      // AIDEV-NOTE: Traxsource requires re-searching to get the TXTrack object,
      // then calling extendTrack to get full details (artwork, album)
      if (!payload.localTitle || !payload.localArtist) {
        throw new Error('Traxsource getDetails requires localTitle and localArtist');
      }

      const searchResults = await traxsourceClient.searchTracks(payload.localTitle, payload.localArtist);
      const txTrack = searchResults.find(t => t.track_id === payload.trackId);

      if (!txTrack) {
        throw new Error(`Traxsource track ${payload.trackId} not found in search results`);
      }

      // Extend with full details (artwork, album)
      result = await traxsourceClient.extendTrack(txTrack);
    } else if (providerType === 'bandcamp' && bandcampClient) {
      // Bandcamp: trackId is actually the full URL
      const trackUrl = payload.trackId;
      const trackInfo = await bandcampClient.getTrackInfo(trackUrl);

      if (!trackInfo) {
        throw new Error(`Failed to fetch Bandcamp track: ${trackUrl}`);
      }

      result = trackInfo;
    } else {
      throw new Error(`Provider ${providerType} not properly initialized`);
    }

    log.info(`[TaggerWorker-${providerType}] GetDetails succeeded`);

    const message: TaggerWorkerResult = {
      type: 'result',
      id,
      result,
    };
    parentPort!.postMessage(message);
  } catch (error) {
    log.error(`[TaggerWorker-${providerType}] GetDetails failed:`, error);

    const message: TaggerWorkerResult = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    parentPort!.postMessage(message);
  }
}

/**
 * Message handler
 */
parentPort.on('message', async (message: TaggerWorkerMessage) => {
  const { type, id, payload } = message;

  switch (type) {
    case 'search':
      await handleSearch(id, payload as SearchPayload);
      break;

    case 'getDetails':
      await handleGetDetails(id, payload as GetDetailsPayload);
      break;

    default: {
      log.error(`[TaggerWorker-${providerType}] Unknown message type: ${type}`);
      const errorMsg: TaggerWorkerResult = {
        type: 'error',
        id,
        error: `Unknown message type: ${type}`,
      };
      parentPort!.postMessage(errorMsg);
    }
  }
});

log.info(`[TaggerWorker-${providerType}] Listening for messages...`);
