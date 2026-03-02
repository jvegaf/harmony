/**
 * Audio Analysis Service
 *
 * Public API for audio analysis using essentia.js
 */

export { analyzeAudio, initializeEssentia, shutdownEssentia } from './analyzer';
export { decodeAudioFile, isFfmpegAvailable } from './audio-decoder';
export { AudioAnalysisWorkerPool, getWorkerPool, resetWorkerPool } from './worker-pool';
export type { ProgressCallback } from './worker-pool';
export type { AudioAnalysisResult, AudioAnalysisOptions, DecodedAudio } from './types';
export { DEFAULT_ANALYSIS_OPTIONS } from './types';
