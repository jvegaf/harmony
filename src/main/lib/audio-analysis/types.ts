/**
 * Audio Analysis Types
 *
 * AIDEV-NOTE: These types define the interface for the audio analysis service
 * which uses essentia.js to detect BPM, musical key, and generate waveform peaks.
 */

/**
 * Result of audio analysis containing BPM, key, and waveform data
 */
export interface AudioAnalysisResult {
  /** Detected BPM (tempo) */
  bpm?: number;
  /** Confidence of BPM detection (0-1) */
  bpmConfidence?: number;
  /** Musical key (e.g., "C", "Am", "F#") */
  key?: string;
  /** Scale type */
  scale?: 'major' | 'minor';
  /** Confidence of key detection (0-1) */
  keyConfidence?: number;
  /** Waveform peaks for visualization (~300 values, normalized 0-1) */
  waveformPeaks?: number[];
}

/**
 * Options for audio analysis
 */
export interface AudioAnalysisOptions {
  /** Whether to detect BPM (default: true) */
  detectBpm?: boolean;
  /** Whether to detect musical key (default: true) */
  detectKey?: boolean;
  /** Whether to generate waveform peaks (default: true) */
  generateWaveform?: boolean;
  /** Number of waveform bins/points (default: 300) */
  waveformBins?: number;
  /** Sample rate for analysis (default: 44100) */
  sampleRate?: number;
}

/**
 * Default analysis options
 */
export const DEFAULT_ANALYSIS_OPTIONS: Required<AudioAnalysisOptions> = {
  detectBpm: true,
  detectKey: true,
  generateWaveform: true,
  waveformBins: 300,
  sampleRate: 44100,
};

/**
 * Decoded audio data ready for analysis
 */
export interface DecodedAudio {
  /** Mono audio signal as Float32Array */
  signal: Float32Array;
  /** Sample rate of the audio */
  sampleRate: number;
  /** Duration in seconds */
  duration: number;
}
