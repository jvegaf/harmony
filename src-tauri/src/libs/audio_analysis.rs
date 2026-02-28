// AIDEV-NOTE: Audio analysis module - Phase 4.5 Enhanced
// Provides BPM detection, key detection, and waveform generation
//
// Implementation:
// - Waveform: RMS-based peak detection (pure Rust)
// - BPM: Autocorrelation-based tempo detection (pure Rust)
// - Key: essentia CLI wrapper (optional, falls back gracefully)
//
// Phase 4.5 Enhancements:
// ✅ Real BPM detection using autocorrelation
// ✅ Key detection using essentia CLI (if available)
// ✅ Graceful fallback when tools are unavailable
//
// Note: aubio-rs was considered but has C library dependency issues.
// This pure-Rust implementation provides good accuracy for most music.

use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use std::process::Command;

use crate::libs::Result;

/// Audio analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioAnalysisResult {
  pub bpm: Option<i32>,
  pub bpm_confidence: Option<f64>,
  pub key: Option<String>,
  pub scale: Option<String>, // "major" or "minor"
  pub key_confidence: Option<f64>,
  pub waveform_peaks: Option<Vec<f64>>,
}

/// Audio analysis options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioAnalysisOptions {
  #[serde(default = "default_true")]
  pub detect_bpm: bool,
  #[serde(default = "default_true")]
  pub detect_key: bool,
  #[serde(default = "default_true")]
  pub generate_waveform: bool,
  #[serde(default = "default_waveform_bins")]
  pub waveform_bins: usize,
  #[serde(default = "default_sample_rate")]
  pub sample_rate: u32,
}

fn default_true() -> bool {
  true
}
fn default_waveform_bins() -> usize {
  300
}
fn default_sample_rate() -> u32 {
  44100
}

impl Default for AudioAnalysisOptions {
  fn default() -> Self {
    Self {
      detect_bpm: true,
      detect_key: true,
      generate_waveform: true,
      waveform_bins: 300,
      sample_rate: 44100,
    }
  }
}

/// Decode audio file to mono samples
/// Uses ffmpeg to convert any audio format to raw PCM samples
fn decode_audio_file(file_path: &str, target_sample_rate: u32) -> Result<Vec<f32>> {
  info!("Decoding audio file: {}", file_path);

  // Use ffmpeg to decode to raw f32 samples
  let output = std::process::Command::new("ffmpeg")
    .args(&[
      "-i",
      file_path,
      "-ac",
      "1", // Mono
      "-ar",
      &target_sample_rate.to_string(),
      "-f",
      "f32le", // 32-bit float little-endian
      "-",     // Output to stdout
    ])
    .output()?;

  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr);
    return Err(crate::libs::HarmonyError::Custom(format!(
      "ffmpeg failed: {}",
      stderr
    )));
  }

  // Convert bytes to f32 samples
  let bytes = output.stdout;
  let samples: Vec<f32> = bytes
    .chunks_exact(4)
    .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
    .collect();

  info!(
    "Decoded {} samples ({:.2}s)",
    samples.len(),
    samples.len() as f64 / target_sample_rate as f64
  );

  Ok(samples)
}

/// Generate waveform peaks using RMS (Root Mean Square)
/// Returns normalized peaks (0.0 to 1.0) for visualization
fn generate_waveform_peaks(samples: &[f32], num_bins: usize) -> Vec<f64> {
  if samples.is_empty() {
    return vec![0.0; num_bins];
  }

  let samples_per_bin = samples.len() / num_bins;
  let mut peaks = Vec::with_capacity(num_bins);
  let mut max_rms = 0.0;

  // Calculate RMS for each bin
  for i in 0..num_bins {
    let start = i * samples_per_bin;
    let end = ((i + 1) * samples_per_bin).min(samples.len());

    if start >= end {
      peaks.push(0.0);
      continue;
    }

    // Calculate RMS (Root Mean Square)
    let sum_squares: f64 = samples[start..end]
      .iter()
      .map(|&sample| (sample as f64).powi(2))
      .sum();

    let rms = (sum_squares / (end - start) as f64).sqrt();
    peaks.push(rms);

    if rms > max_rms {
      max_rms = rms;
    }
  }

  // Normalize to 0.0-1.0 range
  if max_rms > 0.0 {
    for peak in peaks.iter_mut() {
      *peak /= max_rms;
    }
  }

  peaks
}

/// Detect BPM from audio samples using autocorrelation
/// Returns (bpm, confidence) or None on failure
///
/// AIDEV-NOTE: Pure Rust implementation using autocorrelation
/// This method is simpler than aubio but works well for most music
///
/// Algorithm:
/// 1. Calculate energy envelope (RMS per frame)
/// 2. Apply autocorrelation to find periodic patterns
/// 3. Find peaks in autocorrelation that correspond to typical BPM range
/// 4. Return BPM with highest confidence
fn detect_bpm(samples: &[f32], sample_rate: u32) -> Option<(i32, f64)> {
  if samples.is_empty() {
    return None;
  }

  info!(
    "Detecting BPM with autocorrelation (sample_rate: {}Hz)",
    sample_rate
  );

  // Calculate energy envelope
  let frame_size = 2048;
  let hop_size = 512;
  let energy = calculate_energy_envelope(samples, frame_size, hop_size);

  if energy.len() < 100 {
    warn!("Audio too short for BPM detection");
    return None;
  }

  // Calculate autocorrelation
  let autocorr = autocorrelate(&energy);

  // Find BPM from autocorrelation peaks
  // Convert lag to BPM: BPM = 60 * sample_rate / (lag * hop_size)
  let min_bpm = 60;
  let max_bpm = 180;

  let min_lag = (60.0 * sample_rate as f64 / (max_bpm as f64 * hop_size as f64)) as usize;
  let max_lag = (60.0 * sample_rate as f64 / (min_bpm as f64 * hop_size as f64)) as usize;

  let max_lag = max_lag.min(autocorr.len() - 1);

  if min_lag >= max_lag {
    warn!("Invalid lag range for BPM detection");
    return None;
  }

  // Find peak in autocorrelation within BPM range
  let mut best_lag = min_lag;
  let mut best_value = autocorr[min_lag];

  for lag in min_lag..=max_lag {
    if autocorr[lag] > best_value {
      best_value = autocorr[lag];
      best_lag = lag;
    }
  }

  // Convert lag to BPM
  let bpm_raw = 60.0 * sample_rate as f64 / (best_lag as f64 * hop_size as f64);
  let bpm = bpm_raw.round() as i32;

  // Calculate confidence (normalized autocorrelation value)
  let confidence = (best_value / autocorr[0]).clamp(0.0, 1.0);

  if confidence < 0.3 {
    warn!("Low confidence BPM detection: {:.2}", confidence);
    return None;
  }

  info!("BPM detected: {} (confidence: {:.2})", bpm, confidence);
  Some((bpm, confidence))
}

/// Calculate energy envelope of audio signal
fn calculate_energy_envelope(samples: &[f32], frame_size: usize, hop_size: usize) -> Vec<f64> {
  let num_frames = (samples.len() - frame_size) / hop_size + 1;
  let mut energy = Vec::with_capacity(num_frames);

  for i in 0..num_frames {
    let start = i * hop_size;
    let end = (start + frame_size).min(samples.len());
    let frame = &samples[start..end];

    // Calculate RMS energy for this frame
    let sum_squares: f64 = frame.iter().map(|&s| (s as f64).powi(2)).sum();
    let rms = (sum_squares / frame.len() as f64).sqrt();
    energy.push(rms);
  }

  energy
}

/// Calculate autocorrelation of a signal
fn autocorrelate(signal: &[f64]) -> Vec<f64> {
  let n = signal.len();
  let mut autocorr = vec![0.0; n];

  // Normalize signal (zero-mean)
  let mean: f64 = signal.iter().sum::<f64>() / n as f64;
  let normalized: Vec<f64> = signal.iter().map(|&x| x - mean).collect();

  // Calculate autocorrelation for each lag
  for lag in 0..n {
    let mut sum = 0.0;
    for i in 0..(n - lag) {
      sum += normalized[i] * normalized[i + lag];
    }
    autocorr[lag] = sum / (n - lag) as f64;
  }

  autocorr
}

/// Detect musical key from audio samples using essentia CLI
/// Returns (key, scale, confidence) or None on failure
///
/// AIDEV-NOTE: This uses essentia_streaming_extractor_music if available
/// Falls back gracefully if essentia is not installed
fn detect_key(samples: &[f32], sample_rate: u32) -> Option<(String, String, f64)> {
  info!("Detecting key with essentia CLI");

  // Check if essentia is available
  if !is_essentia_available() {
    warn!("essentia_streaming_extractor_music not found - key detection disabled");
    debug!("Install essentia: https://essentia.upf.edu/installing.html");
    return None;
  }

  // Create temporary WAV file for essentia
  use tempfile::TempDir;

  let temp_dir = match TempDir::new() {
    Ok(dir) => dir,
    Err(e) => {
      warn!("Failed to create temp directory: {}", e);
      return None;
    }
  };

  let wav_path = temp_dir.path().join("temp.wav");
  let json_path = temp_dir.path().join("temp.json");

  // Write WAV file (simple 32-bit float PCM)
  if let Err(e) = write_wav_file(&wav_path, samples, sample_rate) {
    warn!("Failed to write temp WAV: {}", e);
    return None;
  }

  // Run essentia
  let output = match Command::new("essentia_streaming_extractor_music")
    .arg(wav_path.to_string_lossy().as_ref())
    .arg(json_path.to_string_lossy().as_ref())
    .output()
  {
    Ok(out) => out,
    Err(e) => {
      warn!("Failed to run essentia: {}", e);
      return None;
    }
  };

  if !output.status.success() {
    warn!(
      "Essentia failed: {}",
      String::from_utf8_lossy(&output.stderr)
    );
    return None;
  }

  // Parse JSON output
  let json_content = match std::fs::read_to_string(&json_path) {
    Ok(content) => content,
    Err(e) => {
      warn!("Failed to read essentia output: {}", e);
      return None;
    }
  };

  parse_essentia_key(&json_content)
}

/// Check if essentia CLI is available
fn is_essentia_available() -> bool {
  Command::new("essentia_streaming_extractor_music")
    .arg("--help")
    .output()
    .is_ok()
}

/// Write samples to WAV file
fn write_wav_file(
  path: &std::path::Path,
  samples: &[f32],
  sample_rate: u32,
) -> std::io::Result<()> {
  use std::fs::File;
  use std::io::Write;

  let mut file = File::create(path)?;

  // WAV header for 32-bit float PCM, mono
  let data_size = (samples.len() * 4) as u32;
  let file_size = 36 + data_size;

  // RIFF header
  file.write_all(b"RIFF")?;
  file.write_all(&file_size.to_le_bytes())?;
  file.write_all(b"WAVE")?;

  // fmt chunk
  file.write_all(b"fmt ")?;
  file.write_all(&16u32.to_le_bytes())?; // chunk size
  file.write_all(&3u16.to_le_bytes())?; // format: IEEE float
  file.write_all(&1u16.to_le_bytes())?; // channels: mono
  file.write_all(&sample_rate.to_le_bytes())?;
  file.write_all(&(sample_rate * 4).to_le_bytes())?; // byte rate
  file.write_all(&4u16.to_le_bytes())?; // block align
  file.write_all(&32u16.to_le_bytes())?; // bits per sample

  // data chunk
  file.write_all(b"data")?;
  file.write_all(&data_size.to_le_bytes())?;

  // Write samples
  for &sample in samples {
    file.write_all(&sample.to_le_bytes())?;
  }

  Ok(())
}

/// Parse essentia JSON output to extract key information
fn parse_essentia_key(json: &str) -> Option<(String, String, f64)> {
  use serde_json::Value;

  let v: Value = serde_json::from_str(json).ok()?;

  let key = v["tonal"]["key_key"].as_str()?.to_string();
  let scale = v["tonal"]["key_scale"].as_str()?.to_string();
  let strength = v["tonal"]["key_strength"].as_f64()?;

  // Format key like Traktor: "Am", "C", "F#m", etc.
  let formatted_key = if scale == "minor" {
    format!("{}m", key)
  } else {
    key.to_string()
  };

  info!(
    "Key detected: {} {} (strength: {:.2})",
    formatted_key, scale, strength
  );
  Some((formatted_key, scale, strength))
}

/// Analyze an audio file
pub fn analyze_audio(
  file_path: &str,
  options: Option<AudioAnalysisOptions>,
) -> Result<AudioAnalysisResult> {
  let opts = options.unwrap_or_default();
  let mut result = AudioAnalysisResult {
    bpm: None,
    bpm_confidence: None,
    key: None,
    scale: None,
    key_confidence: None,
    waveform_peaks: None,
  };

  info!("Starting audio analysis: {}", file_path);

  // Decode audio file
  let samples = decode_audio_file(file_path, opts.sample_rate)?;

  // Generate waveform
  if opts.generate_waveform {
    info!("Generating waveform with {} bins", opts.waveform_bins);
    result.waveform_peaks = Some(generate_waveform_peaks(&samples, opts.waveform_bins));
  }

  // Detect BPM
  if opts.detect_bpm {
    if let Some((bpm, confidence)) = detect_bpm(&samples, opts.sample_rate) {
      result.bpm = Some(bpm);
      result.bpm_confidence = Some(confidence);
      info!("BPM detected: {} (confidence: {:.2})", bpm, confidence);
    }
  }

  // Detect key
  if opts.detect_key {
    if let Some((key, scale, confidence)) = detect_key(&samples, opts.sample_rate) {
      result.key = Some(key.clone());
      result.scale = Some(scale.clone());
      result.key_confidence = Some(confidence);
      info!(
        "Key detected: {} {} (confidence: {:.2})",
        key, scale, confidence
      );
    }
  }

  info!("Audio analysis complete");
  Ok(result)
}

/// Batch analyze multiple audio files
/// Uses rayon for parallel processing
pub fn analyze_audio_batch(
  file_paths: Vec<String>,
  options: Option<AudioAnalysisOptions>,
) -> Vec<Result<AudioAnalysisResult>> {
  use rayon::prelude::*;

  info!("Starting batch analysis for {} files", file_paths.len());

  let results: Vec<Result<AudioAnalysisResult>> = file_paths
    .par_iter()
    .map(|path| analyze_audio(path, options.clone()))
    .collect();

  let succeeded = results.iter().filter(|r| r.is_ok()).count();
  let failed = results.len() - succeeded;

  info!(
    "Batch analysis complete: {} succeeded, {} failed",
    succeeded, failed
  );

  results
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_generate_waveform_peaks() {
    // Create a simple sine wave
    let samples: Vec<f32> = (0..44100)
      .map(|i| (i as f32 * 440.0 * 2.0 * std::f32::consts::PI / 44100.0).sin() * 0.5)
      .collect();

    let peaks = generate_waveform_peaks(&samples, 100);

    assert_eq!(peaks.len(), 100);
    // All peaks should be normalized (0.0 to 1.0)
    assert!(peaks.iter().all(|&p| p >= 0.0 && p <= 1.0));
    // At least one peak should be close to 1.0 (max)
    assert!(peaks.iter().any(|&p| p > 0.9));
  }

  #[test]
  fn test_audio_analysis_options_default() {
    let opts = AudioAnalysisOptions::default();
    assert!(opts.detect_bpm);
    assert!(opts.detect_key);
    assert!(opts.generate_waveform);
    assert_eq!(opts.waveform_bins, 300);
    assert_eq!(opts.sample_rate, 44100);
  }
}
