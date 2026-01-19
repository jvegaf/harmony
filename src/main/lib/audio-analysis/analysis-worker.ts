/**
 * Audio Analysis Worker Thread
 *
 * AIDEV-NOTE: This file runs in a separate worker thread to avoid blocking
 * the main Electron process during CPU-intensive audio analysis.
 *
 * Uses essentia.js WASM for BPM and Key detection, plus custom waveform generation.
 * Each worker thread has its own essentia instance.
 *
 * Message Protocol:
 * - Input: { type: 'analyze', id: string, filePath: string, options: AudioAnalysisOptions }
 * - Output: { type: 'result', id: string, result: AudioAnalysisResult } |
 *           { type: 'error', id: string, error: string }
 */

import { parentPort } from 'worker_threads';
import { readFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';

import wav from 'node-wav';
import * as essentiaJs from 'essentia.js';

// Types (duplicated here since worker threads can't easily share imports)
interface AudioAnalysisResult {
  bpm?: number;
  bpmConfidence?: number;
  key?: string;
  scale?: 'major' | 'minor';
  keyConfidence?: number;
  waveformPeaks?: number[];
}

interface AudioAnalysisOptions {
  detectBpm?: boolean;
  detectKey?: boolean;
  generateWaveform?: boolean;
  waveformBins?: number;
  sampleRate?: number;
}

interface DecodedAudio {
  signal: Float32Array;
  sampleRate: number;
  duration: number;
}

interface WorkerMessage {
  type: 'analyze';
  id: string;
  filePath: string;
  options: AudioAnalysisOptions;
}

interface WorkerResult {
  type: 'result' | 'error' | 'ready';
  id?: string;
  result?: AudioAnalysisResult;
  error?: string;
}

const DEFAULT_OPTIONS: Required<AudioAnalysisOptions> = {
  detectBpm: true,
  detectKey: true,
  generateWaveform: true,
  waveformBins: 300,
  sampleRate: 44100,
};

const execFileAsync = promisify(execFile);

// Extract the WASM module and Essentia class
const { EssentiaWASM, Essentia } = essentiaJs as any;

// Worker-local essentia instance
let essentiaInstance: any | null = null;

/**
 * Initialize essentia for this worker
 */
async function initializeEssentia(): Promise<void> {
  if (essentiaInstance) return;

  essentiaInstance = new Essentia(EssentiaWASM);
  log(`Essentia initialized. Version: ${essentiaInstance.version}`);
}

/**
 * Log function for worker (prepends worker info)
 */
function log(message: string): void {
  // Can't use electron-log in worker threads, so we'll use console
  console.log(`[AudioWorker] ${message}`);
}

/**
 * Decode audio file to mono Float32Array
 */
async function decodeAudioFile(filePath: string, targetSampleRate = 44100): Promise<DecodedAudio> {
  const extension = filePath.toLowerCase().split('.').pop();

  if (extension === 'wav') {
    return decodeWavFile(filePath, targetSampleRate);
  }

  return decodeWithFfmpeg(filePath, targetSampleRate);
}

async function decodeWavFile(filePath: string, targetSampleRate: number): Promise<DecodedAudio> {
  const buffer = await readFile(filePath);
  const result = wav.decode(buffer);
  const signal = convertToMono(result.channelData, result.sampleRate, targetSampleRate);

  return {
    signal,
    sampleRate: targetSampleRate,
    duration: signal.length / targetSampleRate,
  };
}

async function decodeWithFfmpeg(filePath: string, targetSampleRate: number): Promise<DecodedAudio> {
  const tempWavPath = join(tmpdir(), `harmony-audio-${randomUUID()}.wav`);

  try {
    await execFileAsync('ffmpeg', [
      '-i',
      filePath,
      '-ac',
      '1',
      '-ar',
      targetSampleRate.toString(),
      '-sample_fmt',
      's16',
      '-y',
      tempWavPath,
    ]);

    const buffer = await readFile(tempWavPath);
    const result = wav.decode(buffer);
    const signal = result.channelData[0];

    return {
      signal,
      sampleRate: targetSampleRate,
      duration: signal.length / targetSampleRate,
    };
  } finally {
    try {
      await unlink(tempWavPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function convertToMono(channelData: Float32Array[], sourceSampleRate: number, targetSampleRate: number): Float32Array {
  const numChannels = channelData.length;
  const sourceLength = channelData[0].length;

  let monoSignal: Float32Array;

  if (numChannels === 1) {
    monoSignal = channelData[0];
  } else {
    monoSignal = new Float32Array(sourceLength);
    for (let i = 0; i < sourceLength; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += channelData[ch][i];
      }
      monoSignal[i] = sum / numChannels;
    }
  }

  if (sourceSampleRate !== targetSampleRate) {
    monoSignal = resample(monoSignal, sourceSampleRate, targetSampleRate);
  }

  return monoSignal;
}

function resample(signal: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
  const ratio = sourceSampleRate / targetSampleRate;
  const targetLength = Math.floor(signal.length / ratio);
  const resampled = new Float32Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, signal.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    resampled[i] = signal[srcIndexFloor] * (1 - fraction) + signal[srcIndexCeil] * fraction;
  }

  return resampled;
}

/**
 * Detect BPM using RhythmExtractor2013
 */
function detectBpm(decoded: DecodedAudio): { bpm: number; confidence: number } {
  try {
    const signal = essentiaInstance.arrayToVector(decoded.signal);
    const rhythmResult = essentiaInstance.RhythmExtractor2013(signal, 210, 'multifeature', 40);

    const bpm = Math.round(rhythmResult.bpm);
    const confidence = rhythmResult.confidence;

    signal.delete();

    return { bpm, confidence };
  } catch (error) {
    log(`BPM detection failed: ${error}`);
    return { bpm: 0, confidence: 0 };
  }
}

/**
 * Detect musical key using KeyExtractor
 */
function detectKey(decoded: DecodedAudio): { key: string; scale: 'major' | 'minor'; confidence: number } {
  try {
    const signal = essentiaInstance.arrayToVector(decoded.signal);

    const keyResult = essentiaInstance.KeyExtractor(
      signal,
      true,
      4096,
      4096,
      12,
      3500,
      60,
      25,
      0.2,
      'edma',
      decoded.sampleRate,
      0.0001,
      440,
      'cosine',
      'hann',
    );

    const key = keyResult.key as string;
    const scale = keyResult.scale as 'major' | 'minor';
    const confidence = keyResult.strength as number;

    signal.delete();

    const formattedKey = scale === 'minor' ? `${key}m` : key;

    return { key: formattedKey, scale, confidence };
  } catch (error) {
    log(`Key detection failed: ${error}`);
    return { key: '', scale: 'major', confidence: 0 };
  }
}

/**
 * Generate waveform peaks for visualization
 */
function generateWaveformPeaks(signal: Float32Array, numBins: number = 300): number[] {
  const samplesPerBin = Math.floor(signal.length / numBins);
  const peaks: number[] = [];

  let maxRms = 0;

  for (let i = 0; i < numBins; i++) {
    const start = i * samplesPerBin;
    const end = Math.min(start + samplesPerBin, signal.length);

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

  if (maxRms > 0) {
    for (let i = 0; i < peaks.length; i++) {
      peaks[i] = peaks[i] / maxRms;
    }
  }

  return peaks;
}

/**
 * Analyze an audio file
 */
async function analyzeAudio(filePath: string, options: AudioAnalysisOptions): Promise<AudioAnalysisResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: AudioAnalysisResult = {};

  log(`Analyzing: ${filePath}`);

  // Decode audio file
  const decoded = await decodeAudioFile(filePath, opts.sampleRate);
  log(`Decoded: ${decoded.duration.toFixed(2)}s, ${decoded.sampleRate}Hz`);

  // Run analyses
  if (opts.detectBpm) {
    const bpmResult = detectBpm(decoded);
    result.bpm = bpmResult.bpm;
    result.bpmConfidence = bpmResult.confidence;
  }

  if (opts.detectKey) {
    const keyResult = detectKey(decoded);
    result.key = keyResult.key;
    result.scale = keyResult.scale;
    result.keyConfidence = keyResult.confidence;
  }

  if (opts.generateWaveform) {
    result.waveformPeaks = generateWaveformPeaks(decoded.signal, opts.waveformBins);
  }

  log(`Analysis complete: BPM=${result.bpm}, Key=${result.key} ${result.scale}`);
  return result;
}

/**
 * Handle incoming messages from main thread
 */
async function handleMessage(message: WorkerMessage): Promise<void> {
  const { type, id, filePath, options } = message;

  if (type !== 'analyze') {
    return;
  }

  try {
    const result = await analyzeAudio(filePath, options);
    sendResult({ type: 'result', id, result });
  } catch (error) {
    sendResult({ type: 'error', id, error: String(error) });
  }
}

/**
 * Send result back to main thread
 */
function sendResult(result: WorkerResult): void {
  if (parentPort) {
    parentPort.postMessage(result);
  }
}

/**
 * Main worker initialization
 */
async function main(): Promise<void> {
  try {
    await initializeEssentia();

    // Signal that we're ready
    sendResult({ type: 'ready' });

    // Listen for messages
    if (parentPort) {
      parentPort.on('message', (message: WorkerMessage) => {
        handleMessage(message).catch(error => {
          log(`Error handling message: ${error}`);
        });
      });
    }
  } catch (error) {
    log(`Worker initialization failed: ${error}`);
    process.exit(1);
  }
}

// Start the worker
main();
