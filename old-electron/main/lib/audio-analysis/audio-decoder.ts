/**
 * Audio Decoder
 *
 * AIDEV-NOTE: Decodes audio files to Float32Array mono signal for essentia.js analysis.
 * Uses the 'wav' module from node-wav (dependency of essentia.js) for decoding.
 * For non-WAV files, we'll need to convert using ffmpeg or another method.
 */

import { readFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';

import log from 'electron-log';
import wav from 'node-wav';

import { DecodedAudio } from './types';

const execFileAsync = promisify(execFile);

/**
 * Decode an audio file to mono Float32Array signal
 *
 * @param filePath - Path to the audio file (MP3, FLAC, WAV, etc.)
 * @param targetSampleRate - Target sample rate (default: 44100)
 * @returns Decoded mono audio signal
 */
export async function decodeAudioFile(filePath: string, targetSampleRate = 44100): Promise<DecodedAudio> {
  const extension = filePath.toLowerCase().split('.').pop();

  if (extension === 'wav') {
    return decodeWavFile(filePath, targetSampleRate);
  }

  // For non-WAV files, convert to WAV first using ffmpeg
  return decodeWithFfmpeg(filePath, targetSampleRate);
}

/**
 * Decode a WAV file directly
 */
async function decodeWavFile(filePath: string, targetSampleRate: number): Promise<DecodedAudio> {
  const buffer = await readFile(filePath);
  const result = wav.decode(buffer);

  // Convert to mono if stereo
  const signal = convertToMono(result.channelData, result.sampleRate, targetSampleRate);

  return {
    signal,
    sampleRate: targetSampleRate,
    duration: signal.length / targetSampleRate,
  };
}

/**
 * Decode non-WAV files using ffmpeg to convert to WAV first
 *
 * AIDEV-NOTE: ffmpeg is expected to be installed on the system.
 * This is a reasonable assumption for a DJ/music management app.
 */
async function decodeWithFfmpeg(filePath: string, targetSampleRate: number): Promise<DecodedAudio> {
  const tempWavPath = join(tmpdir(), `harmony-audio-${randomUUID()}.wav`);

  try {
    // Convert to mono 16-bit WAV at target sample rate
    await execFileAsync('ffmpeg', [
      '-i',
      filePath,
      '-ac',
      '1', // Mono
      '-ar',
      targetSampleRate.toString(), // Sample rate
      '-sample_fmt',
      's16', // 16-bit
      '-y', // Overwrite
      tempWavPath,
    ]);

    // Read the converted WAV file
    const buffer = await readFile(tempWavPath);
    const result = wav.decode(buffer);

    const signal = result.channelData[0]; // Already mono

    return {
      signal,
      sampleRate: targetSampleRate,
      duration: signal.length / targetSampleRate,
    };
  } finally {
    // Clean up temp file
    try {
      await unlink(tempWavPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Convert stereo or multi-channel audio to mono
 * Also resamples if needed (simple linear interpolation)
 */
function convertToMono(channelData: Float32Array[], sourceSampleRate: number, targetSampleRate: number): Float32Array {
  // Mix down to mono by averaging channels
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

  // Resample if needed
  if (sourceSampleRate !== targetSampleRate) {
    monoSignal = resample(monoSignal, sourceSampleRate, targetSampleRate);
  }

  return monoSignal;
}

/**
 * Simple linear interpolation resampling
 *
 * AIDEV-NOTE: This is a basic resampler. For production quality,
 * consider using a proper resampling library. However, for BPM/key
 * detection and waveform generation, this should be sufficient.
 */
function resample(signal: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
  const ratio = sourceSampleRate / targetSampleRate;
  const targetLength = Math.floor(signal.length / ratio);
  const resampled = new Float32Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, signal.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    resampled[i] = signal[srcIndexFloor] * (1 - fraction) + signal[srcIndexCeil] * fraction;
  }

  return resampled;
}

/**
 * Check if ffmpeg is available on the system
 */
export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    log.warn('[audio-decoder] ffmpeg not found. Non-WAV files will not be supported.');
    return false;
  }
}
