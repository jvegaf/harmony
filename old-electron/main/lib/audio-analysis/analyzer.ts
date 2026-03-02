/**
 * Audio Analyzer
 *
 * AIDEV-NOTE: Main audio analysis service using essentia.js for:
 * - BPM detection (RhythmExtractor2013)
 * - Key detection (KeyExtractor)
 * - Waveform peak generation (RMS-based)
 *
 * This is a singleton service that initializes the WASM module once
 * and reuses it for all analysis operations.
 */

import log from 'electron-log';

// AIDEV-NOTE: essentia.js exports are CommonJS modules, not ES6
// EssentiaWASM is the pre-initialized WASM module object, not a function
// Using dynamic import to avoid TypeScript/ESLint issues with require()
import * as essentiaJs from 'essentia.js';

import { AudioAnalysisResult, AudioAnalysisOptions, DEFAULT_ANALYSIS_OPTIONS, DecodedAudio } from './types';
import { decodeAudioFile, isFfmpegAvailable } from './audio-decoder';

// Extract the WASM module and Essentia class
const { EssentiaWASM, Essentia } = essentiaJs as any;

// Singleton instance
let essentiaInstance: any | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the essentia.js WASM module
 * This should be called once at app startup
 */
export async function initializeEssentia(): Promise<void> {
  if (essentiaInstance) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      log.info('[audio-analyzer] Initializing essentia.js WASM module...');

      // AIDEV-NOTE: In Node.js/Electron, EssentiaWASM is already initialized
      // We don't need to call it as a function
      essentiaInstance = new Essentia(EssentiaWASM);

      log.info(`[audio-analyzer] Essentia initialized. Version: ${essentiaInstance.version}`);

      // Check ffmpeg availability for non-WAV support
      const ffmpegAvailable = await isFfmpegAvailable();
      if (ffmpegAvailable) {
        log.info('[audio-analyzer] ffmpeg available - all audio formats supported');
      } else {
        log.warn('[audio-analyzer] ffmpeg not available - only WAV files supported');
      }
    } catch (error) {
      log.error('[audio-analyzer] Failed to initialize essentia.js:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Get the essentia instance, initializing if needed
 */
async function getEssentia(): Promise<InstanceType<typeof Essentia>> {
  if (!essentiaInstance) {
    await initializeEssentia();
  }

  if (!essentiaInstance) {
    throw new Error('Essentia not initialized');
  }

  return essentiaInstance;
}

/**
 * Analyze an audio file for BPM, key, and waveform
 *
 * @param filePath - Path to the audio file
 * @param options - Analysis options
 * @returns Analysis result with BPM, key, and waveform peaks
 */
export async function analyzeAudio(filePath: string, options: AudioAnalysisOptions = {}): Promise<AudioAnalysisResult> {
  const opts = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
  const result: AudioAnalysisResult = {};

  try {
    log.info(`[audio-analyzer] Analyzing: ${filePath}`);

    // Decode audio file to mono Float32Array
    const decoded = await decodeAudioFile(filePath, opts.sampleRate);
    log.info(`[audio-analyzer] Decoded audio: ${decoded.duration.toFixed(2)}s, ${decoded.sampleRate}Hz`);

    // Get essentia instance
    const essentia = await getEssentia();

    // Run analyses in parallel where possible
    const analyses: Promise<void>[] = [];

    if (opts.detectBpm) {
      analyses.push(
        detectBpm(essentia, decoded).then(bpmResult => {
          result.bpm = bpmResult.bpm;
          result.bpmConfidence = bpmResult.confidence;
        }),
      );
    }

    if (opts.detectKey) {
      analyses.push(
        detectKey(essentia, decoded).then(keyResult => {
          result.key = keyResult.key;
          result.scale = keyResult.scale;
          result.keyConfidence = keyResult.confidence;
        }),
      );
    }

    if (opts.generateWaveform) {
      // Waveform generation doesn't need essentia, can run in parallel
      analyses.push(
        Promise.resolve().then(() => {
          result.waveformPeaks = generateWaveformPeaks(decoded.signal, opts.waveformBins);
        }),
      );
    }

    await Promise.all(analyses);

    log.info(`[audio-analyzer] Analysis complete: BPM=${result.bpm}, Key=${result.key} ${result.scale}`);
    return result;
  } catch (error) {
    log.error(`[audio-analyzer] Analysis failed for ${filePath}:`, error);
    throw error;
  }
}

/**
 * Detect BPM using RhythmExtractor2013
 */
async function detectBpm(
  essentia: InstanceType<typeof Essentia>,
  decoded: DecodedAudio,
): Promise<{ bpm: number; confidence: number }> {
  try {
    // Convert Float32Array to essentia vector
    const signal = essentia.arrayToVector(decoded.signal);

    // Use RhythmExtractor2013 with multifeature method for better accuracy
    const rhythmResult = essentia.RhythmExtractor2013(signal, 210, 'multifeature', 40);

    const bpm = Math.round(rhythmResult.bpm);
    const confidence = rhythmResult.confidence;

    // Clean up
    signal.delete();

    return { bpm, confidence };
  } catch (error) {
    log.error('[audio-analyzer] BPM detection failed:', error);
    return { bpm: 0, confidence: 0 };
  }
}

/**
 * Detect musical key using KeyExtractor
 */
async function detectKey(
  essentia: InstanceType<typeof Essentia>,
  decoded: DecodedAudio,
): Promise<{ key: string; scale: 'major' | 'minor'; confidence: number }> {
  try {
    // Convert Float32Array to essentia vector
    const signal = essentia.arrayToVector(decoded.signal);

    // Use KeyExtractor algorithm
    const keyResult = essentia.KeyExtractor(
      signal,
      true, // averageDetuningCorrection
      4096, // frameSize
      4096, // hopSize
      12, // hpcpSize
      3500, // maxFrequency
      60, // maximumSpectralPeaks
      25, // minFrequency
      0.2, // pcpThreshold
      'edma', // profileType - Electronic Dance Music Algorithm
      decoded.sampleRate, // sampleRate
      0.0001, // spectralPeaksThreshold
      440, // tuningFrequency
      'cosine', // weightType
      'hann', // windowType
    );

    const key = keyResult.key as string;
    const scale = keyResult.scale as 'major' | 'minor';
    const confidence = keyResult.strength as number;

    // Clean up
    signal.delete();

    // Format key with scale (e.g., "Am" for A minor, "C" for C major)
    const formattedKey = scale === 'minor' ? `${key}m` : key;

    return { key: formattedKey, scale, confidence };
  } catch (error) {
    log.error('[audio-analyzer] Key detection failed:', error);
    return { key: '', scale: 'major', confidence: 0 };
  }
}

/**
 * Generate waveform peaks for visualization
 *
 * AIDEV-NOTE: Uses RMS (Root Mean Square) for each bin to get smooth,
 * visually appealing waveform peaks. Values are normalized to 0-1 range.
 *
 * @param signal - Mono audio signal
 * @param numBins - Number of bins/points for the waveform (default: 300)
 * @returns Array of peak values normalized to 0-1
 */
function generateWaveformPeaks(signal: Float32Array, numBins: number = 300): number[] {
  const samplesPerBin = Math.floor(signal.length / numBins);
  const peaks: number[] = [];

  let maxRms = 0;

  // First pass: calculate RMS for each bin
  for (let i = 0; i < numBins; i++) {
    const start = i * samplesPerBin;
    const end = Math.min(start + samplesPerBin, signal.length);

    // Calculate RMS for this bin
    let sumSquares = 0;
    for (let j = start; j < end; j++) {
      sumSquares += signal[j] * signal[j];
    }
    const rms = Math.sqrt(sumSquares / (end - start));
    peaks.push(rms);

    if (rms > maxRms) {
      maxRms = rms;
    }
  }

  // Second pass: normalize to 0-1 range
  if (maxRms > 0) {
    for (let i = 0; i < peaks.length; i++) {
      peaks[i] = peaks[i] / maxRms;
    }
  }

  return peaks;
}

/**
 * Shutdown essentia instance
 * Call this when the app is closing
 */
export function shutdownEssentia(): void {
  if (essentiaInstance) {
    try {
      essentiaInstance.shutdown();
      essentiaInstance = null;
      initializationPromise = null;
      log.info('[audio-analyzer] Essentia shutdown complete');
    } catch (error) {
      log.error('[audio-analyzer] Error during shutdown:', error);
    }
  }
}
