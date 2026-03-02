/**
 * Bandcamp Provider Module
 *
 * Public exports for Bandcamp integration
 */

export { BandcampProvider, createBandcampProvider } from './provider';
export { BandcampClient, getBandcampClient } from './client';
export type { BandcampSearchResult, BandcampTrackInfo } from './client';
export { mapSearchResultToRawTrackData, mapTrackInfoToRawTrackData } from './mapper';
