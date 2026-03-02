// AIDEV-NOTE: Scoring module for track candidate similarity calculation
// Implements hybrid algorithm: 50% title, 30% artist, 20% duration
// Based on old-electron/main/lib/tagger/scoring/

use strsim::normalized_levenshtein;

/// Scoring weights for similarity calculation
/// AIDEV-NOTE: Must sum to 1.0
#[derive(Debug, Clone)]
pub struct ScoringWeights {
  pub title: f64,
  pub artist: f64,
  pub duration: f64,
}

impl ScoringWeights {
  /// Default weights: 50% title, 30% artist, 20% duration
  pub fn default() -> Self {
    Self {
      title: 0.5,
      artist: 0.3,
      duration: 0.2,
    }
  }

  /// Validate that weights sum to 1.0 (with float tolerance)
  pub fn validate(&self) -> Result<(), String> {
    let sum = self.title + self.artist + self.duration;
    if (sum - 1.0).abs() > 0.001 {
      return Err(format!("Scoring weights must sum to 1.0, got {}", sum));
    }
    Ok(())
  }
}

/// Input for scoring calculation
pub struct ScoringInput<'a> {
  pub local_title: &'a str,
  pub local_artist: &'a str,
  pub local_duration: Option<u32>,
  pub candidate_title: &'a str,
  pub candidate_artist: &'a str,
  pub candidate_duration: Option<u32>,
}

/// Unified scorer for track candidate similarity
pub struct UnifiedScorer {
  weights: ScoringWeights,
}

impl UnifiedScorer {
  /// Create scorer with custom weights
  pub fn new(weights: ScoringWeights) -> Result<Self, String> {
    weights.validate()?;
    Ok(Self { weights })
  }

  /// Create scorer with default weights
  pub fn default() -> Self {
    Self {
      weights: ScoringWeights::default(),
    }
  }

  /// Calculate similarity score between local track and candidate
  /// Returns score between 0.0 (no similarity) and 1.0 (perfect match)
  pub fn calculate(&self, input: ScoringInput) -> f64 {
    // Title score using hybrid text similarity
    let title_score = hybrid_text_similarity(input.local_title, input.candidate_title);

    // Artist score using hybrid text similarity
    let artist_score = hybrid_text_similarity(input.local_artist, input.candidate_artist);

    // Duration score
    let duration_score = calculate_duration_score(input.local_duration, input.candidate_duration);

    // Apply weighted sum
    title_score * self.weights.title
      + artist_score * self.weights.artist
      + duration_score * self.weights.duration
  }
}

/// Normalize string for comparison (lowercase + alphanumeric + whitespace only)
/// AIDEV-NOTE: Matches old-electron normalizeString()
fn normalize_string(s: &str) -> String {
  s.to_lowercase()
    .chars()
    .map(|c| {
      if c.is_alphanumeric() || c.is_whitespace() {
        c
      } else {
        ' '
      }
    })
    .collect::<String>()
    .split_whitespace()
    .collect::<Vec<_>>()
    .join(" ")
}

/// Calculate hybrid text similarity between two strings
/// Uses Levenshtein distance word-by-word for flexibility with reordering
/// AIDEV-NOTE: Matches old-electron hybridTextSimilarity()
///
/// Algorithm:
/// 1. Normalize both strings
/// 2. Split into words
/// 3. For each query word, find best Levenshtein match in candidate words
/// 4. Return average of best matches
fn hybrid_text_similarity(query: &str, candidate: &str) -> f64 {
  let query_norm = normalize_string(query);
  let candidate_norm = normalize_string(candidate);

  // Trivial case: exact match
  if query_norm == candidate_norm {
    return 1.0;
  }

  let query_words: Vec<&str> = query_norm.split_whitespace().collect();
  let candidate_words: Vec<&str> = candidate_norm.split_whitespace().collect();

  if query_words.is_empty() || candidate_words.is_empty() {
    return 0.0;
  }

  // For each query word, find best match in candidate words
  let word_scores: Vec<f64> = query_words
    .iter()
    .map(|qw| {
      candidate_words
        .iter()
        .map(|cw| normalized_levenshtein(qw, cw))
        .fold(0.0f64, f64::max)
    })
    .collect();

  // Average of best matches
  word_scores.iter().sum::<f64>() / word_scores.len() as f64
}

/// Calculate duration similarity score
/// AIDEV-NOTE: Matches old-electron calculateDurationScore()
///
/// Score ranges:
/// - ≤5s difference: 1.0 (nearly perfect)
/// - ≤15s difference: 0.8 (acceptable - different fade in/out)
/// - ≤30s difference: 0.5 (could be edit/different version)
/// - >30s difference: 0.2 (probably very different version)
/// - Missing duration: 0.7 (neutral score)
fn calculate_duration_score(local_duration: Option<u32>, candidate_duration: Option<u32>) -> f64 {
  match (local_duration, candidate_duration) {
    (None, _) | (_, None) => 0.7, // Neutral score if no duration to compare
    (Some(local), Some(candidate)) => {
      let diff = (local as i32 - candidate as i32).abs();
      if diff <= 5 {
        1.0
      } else if diff <= 15 {
        0.8
      } else if diff <= 30 {
        0.5
      } else {
        0.2
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_normalize_string() {
    assert_eq!(normalize_string("Hello World!"), "hello world");
    assert_eq!(
      normalize_string("Test-Track (Original Mix)"),
      "test track original mix"
    );
    assert_eq!(normalize_string("  Multiple   Spaces  "), "multiple spaces");
    assert_eq!(normalize_string("UPPERCASE"), "uppercase");
    assert_eq!(normalize_string("123 Numbers"), "123 numbers");
  }

  #[test]
  fn test_hybrid_text_similarity_exact_match() {
    let score = hybrid_text_similarity("Strobe", "Strobe");
    assert!((score - 1.0).abs() < 0.001);
  }

  #[test]
  fn test_hybrid_text_similarity_case_insensitive() {
    let score = hybrid_text_similarity("STROBE", "strobe");
    assert!((score - 1.0).abs() < 0.001);
  }

  #[test]
  fn test_hybrid_text_similarity_word_reordering() {
    // Should handle reordered words well
    let score = hybrid_text_similarity("Strobe deadmau5", "deadmau5 Strobe");
    assert!(
      score > 0.95,
      "Score should be very high for reordered words, got {}",
      score
    );
  }

  #[test]
  fn test_hybrid_text_similarity_typos() {
    // Should handle typos with reasonable tolerance
    let score = hybrid_text_similarity("hello world", "helo wrld");
    assert!(
      score > 0.7 && score < 0.9,
      "Score should tolerate typos, got {}",
      score
    );
  }

  #[test]
  fn test_hybrid_text_similarity_partial_match() {
    let score = hybrid_text_similarity("Strobe", "Strobe Extended Mix");
    assert!(
      score > 0.3,
      "Partial match should have positive score, got {}",
      score
    );
  }

  #[test]
  fn test_hybrid_text_similarity_no_match() {
    let score = hybrid_text_similarity("Strobe", "Ghosts N Stuff");
    // AIDEV-NOTE: Old implementation returns 0.33 for this case - test validates same behavior
    assert!(score < 0.4, "No match should have low score, got {}", score);
  }

  #[test]
  fn test_calculate_duration_score_perfect() {
    let score = calculate_duration_score(Some(180), Some(180));
    assert!((score - 1.0).abs() < 0.001);
  }

  #[test]
  fn test_calculate_duration_score_near_perfect() {
    let score = calculate_duration_score(Some(180), Some(183));
    assert!((score - 1.0).abs() < 0.001); // 3s diff = 1.0
  }

  #[test]
  fn test_calculate_duration_score_acceptable() {
    let score = calculate_duration_score(Some(180), Some(190));
    assert!((score - 0.8).abs() < 0.001); // 10s diff = 0.8
  }

  #[test]
  fn test_calculate_duration_score_different_version() {
    let score = calculate_duration_score(Some(180), Some(205));
    assert!((score - 0.5).abs() < 0.001); // 25s diff = 0.5
  }

  #[test]
  fn test_calculate_duration_score_very_different() {
    let score = calculate_duration_score(Some(180), Some(250));
    assert!((score - 0.2).abs() < 0.001); // 70s diff = 0.2
  }

  #[test]
  fn test_calculate_duration_score_missing() {
    let score = calculate_duration_score(None, Some(180));
    assert!((score - 0.7).abs() < 0.001);

    let score = calculate_duration_score(Some(180), None);
    assert!((score - 0.7).abs() < 0.001);
  }

  #[test]
  fn test_scoring_weights_validation() {
    let weights = ScoringWeights {
      title: 0.5,
      artist: 0.3,
      duration: 0.2,
    };
    assert!(weights.validate().is_ok());

    let bad_weights = ScoringWeights {
      title: 0.5,
      artist: 0.3,
      duration: 0.3, // Sum = 1.1
    };
    assert!(bad_weights.validate().is_err());
  }

  #[test]
  fn test_unified_scorer_calculate() {
    let scorer = UnifiedScorer::default();

    // Perfect match
    let score = scorer.calculate(ScoringInput {
      local_title: "Strobe",
      local_artist: "deadmau5",
      local_duration: Some(180),
      candidate_title: "Strobe",
      candidate_artist: "deadmau5",
      candidate_duration: Some(180),
    });
    assert!(
      (score - 1.0).abs() < 0.001,
      "Perfect match should score 1.0, got {}",
      score
    );
  }

  #[test]
  fn test_unified_scorer_case_insensitive() {
    let scorer = UnifiedScorer::default();

    let score = scorer.calculate(ScoringInput {
      local_title: "STROBE",
      local_artist: "DEADMAU5",
      local_duration: Some(180),
      candidate_title: "strobe",
      candidate_artist: "deadmau5",
      candidate_duration: Some(180),
    });
    assert!(
      (score - 1.0).abs() < 0.001,
      "Case should not matter, got {}",
      score
    );
  }

  #[test]
  fn test_unified_scorer_good_match_with_typo() {
    let scorer = UnifiedScorer::default();

    let score = scorer.calculate(ScoringInput {
      local_title: "Strobe",
      local_artist: "deadmau5",
      local_duration: Some(180),
      candidate_title: "Strobe",     // Title exact
      candidate_artist: "deadmaus",  // Artist has typo
      candidate_duration: Some(183), // Duration close
    });
    // Title: 1.0 * 0.5 = 0.5
    // Artist: ~0.88 * 0.3 = ~0.26
    // Duration: 1.0 * 0.2 = 0.2
    // Total ~0.96
    assert!(
      score > 0.90,
      "Good match with minor typo should score >0.90, got {}",
      score
    );
  }

  #[test]
  fn test_unified_scorer_poor_match() {
    let scorer = UnifiedScorer::default();

    let score = scorer.calculate(ScoringInput {
      local_title: "Strobe",
      local_artist: "deadmau5",
      local_duration: Some(180),
      candidate_title: "Ghosts N Stuff",
      candidate_artist: "deadmau5",
      candidate_duration: Some(360),
    });
    // AIDEV-NOTE: Calculation breakdown:
    // Title: 0.33 (Strobe vs Ghosts N Stuff) * 0.5 = 0.165
    // Artist: 1.0 (deadmau5 = deadmau5) * 0.3 = 0.3
    // Duration: 0.2 (180s diff > 30s) * 0.2 = 0.04
    // Total = 0.505 (matches old implementation exactly)
    assert!(
      (score - 0.505).abs() < 0.01,
      "Poor match should score ~0.505, got {}",
      score
    );
  }

  #[test]
  fn test_unified_scorer_custom_weights() {
    // Heavy title weight
    let weights = ScoringWeights {
      title: 0.8,
      artist: 0.1,
      duration: 0.1,
    };
    let scorer = UnifiedScorer::new(weights).unwrap();

    let score = scorer.calculate(ScoringInput {
      local_title: "Strobe",
      local_artist: "wrong artist",
      local_duration: Some(180),
      candidate_title: "Strobe",
      candidate_artist: "deadmau5",
      candidate_duration: Some(180),
    });
    // Title: 1.0 * 0.8 = 0.8
    // Artist: low * 0.1 = ~0.0
    // Duration: 1.0 * 0.1 = 0.1
    // Total ~0.9
    assert!(
      score > 0.85,
      "With heavy title weight, title match should dominate, got {}",
      score
    );
  }
}
