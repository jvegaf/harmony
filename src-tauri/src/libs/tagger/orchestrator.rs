// AIDEV-NOTE: Orchestrator for coordinating multi-provider tagger searches
// Implements parallel provider queries, scoring, ranking, and tie-breaking
// Matches old-electron orchestrator.ts functionality

use crate::libs::tagger::scoring::{ScoringInput, UnifiedScorer};
use crate::libs::tagger::types::{ProviderSource, RawTrackData, TrackCandidate};
use std::collections::HashMap;

/// Configuration for orchestrator behavior
#[derive(Debug, Clone)]
pub struct OrchestratorConfig {
    /// Maximum number of candidates to return
    pub max_candidates: usize,
    /// Minimum similarity score to include (0.0-1.0)
    pub min_score: f64,
    /// Provider priority for tie-breaking (higher = preferred)
    pub provider_priority: HashMap<ProviderSource, u8>,
}

impl Default for OrchestratorConfig {
    fn default() -> Self {
        let mut priority = HashMap::new();
        priority.insert(ProviderSource::Beatport, 3);
        priority.insert(ProviderSource::Traxsource, 2);
        priority.insert(ProviderSource::Bandcamp, 1);

        Self {
            max_candidates: 4,
            min_score: 0.3,
            provider_priority: priority,
        }
    }
}

impl OrchestratorConfig {
    /// Create with custom values
    #[allow(dead_code)]
    pub fn new(max_candidates: usize, min_score: f64) -> Self {
        Self {
            max_candidates,
            min_score,
            ..Default::default()
        }
    }

    /// Set provider priority (higher = preferred for tie-breaking)
    #[allow(dead_code)]
    pub fn with_priority(mut self, source: ProviderSource, priority: u8) -> Self {
        self.provider_priority.insert(source, priority);
        self
    }

    /// Validate configuration
    #[allow(dead_code)]
    pub fn validate(&self) -> Result<(), String> {
        if self.max_candidates == 0 {
            return Err("max_candidates must be > 0".to_string());
        }
        if !(0.0..=1.0).contains(&self.min_score) {
            return Err("min_score must be between 0.0 and 1.0".to_string());
        }
        Ok(())
    }
}

/// Orchestrates searches across multiple providers
pub struct Orchestrator {
    config: OrchestratorConfig,
    scorer: UnifiedScorer,
}

impl Orchestrator {
    /// Create with default config
    pub fn new() -> Self {
        Self {
            config: OrchestratorConfig::default(),
            scorer: UnifiedScorer::default(),
        }
    }

    /// Create with custom config
    #[allow(dead_code)]
    pub fn with_config(config: OrchestratorConfig) -> Result<Self, String> {
        config.validate()?;
        Ok(Self {
            config,
            scorer: UnifiedScorer::default(),
        })
    }

    /// Search across providers and return top candidates
    ///
    /// AIDEV-NOTE: This is synchronous for testing; real implementation will be async
    /// and take trait objects for providers
    pub fn search(
        &self,
        local_title: &str,
        local_artist: &str,
        local_duration: Option<u32>,
        provider_results: Vec<(ProviderSource, Vec<RawTrackData>)>,
    ) -> Vec<TrackCandidate> {
        // Collect all candidates from all providers with scores
        let mut candidates: Vec<TrackCandidate> = provider_results
            .into_iter()
            .flat_map(|(source, tracks)| {
                tracks.into_iter().map(move |raw| {
                    // Join artists for scoring
                    let candidate_artist = raw.artists.join(", ");

                    let score = self.scorer.calculate(ScoringInput {
                        local_title,
                        local_artist,
                        local_duration,
                        candidate_title: &raw.title,
                        candidate_artist: &candidate_artist,
                        candidate_duration: raw.duration_secs,
                    });

                    TrackCandidate::from_raw(source, raw, score)
                })
            })
            .collect();

        // Filter by minimum score
        candidates.retain(|c| c.similarity_score >= self.config.min_score);

        // Sort by score (descending), then by provider priority for ties
        candidates.sort_by(|a, b| {
            // Primary: score descending
            let score_cmp = b
                .similarity_score
                .partial_cmp(&a.similarity_score)
                .unwrap_or(std::cmp::Ordering::Equal);

            if score_cmp != std::cmp::Ordering::Equal {
                return score_cmp;
            }

            // Tie-breaker: check if scores are within 0.01 tolerance
            if (b.similarity_score - a.similarity_score).abs() < 0.01 {
                // Use provider priority (higher = preferred)
                let priority_a = self.config.provider_priority.get(&a.source).unwrap_or(&0);
                let priority_b = self.config.provider_priority.get(&b.source).unwrap_or(&0);
                return priority_b.cmp(priority_a);
            }

            score_cmp
        });

        // Take top N
        candidates.truncate(self.config.max_candidates);
        candidates
    }
}

impl Default for Orchestrator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_orchestrator_config_default() {
        let config = OrchestratorConfig::default();
        assert_eq!(config.max_candidates, 4);
        assert!((config.min_score - 0.3).abs() < 0.001);
        assert_eq!(
            config.provider_priority.get(&ProviderSource::Beatport),
            Some(&3)
        );
        assert_eq!(
            config.provider_priority.get(&ProviderSource::Traxsource),
            Some(&2)
        );
        assert_eq!(
            config.provider_priority.get(&ProviderSource::Bandcamp),
            Some(&1)
        );
    }

    #[test]
    fn test_orchestrator_config_validation() {
        let config = OrchestratorConfig::new(0, 0.5);
        assert!(config.validate().is_err());

        let config = OrchestratorConfig::new(4, 1.5);
        assert!(config.validate().is_err());

        let config = OrchestratorConfig::new(4, -0.1);
        assert!(config.validate().is_err());

        let config = OrchestratorConfig::new(4, 0.5);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_orchestrator_empty_results() {
        let orchestrator = Orchestrator::new();
        let candidates = orchestrator.search("Strobe", "deadmau5", Some(180), vec![]);
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_orchestrator_filters_below_min_score() {
        let orchestrator = Orchestrator::new();

        let provider_results = vec![(
            ProviderSource::Beatport,
            vec![RawTrackData {
                title: "Completely Different Track".to_string(),
                artists: vec!["Different Artist".to_string()],
                duration_secs: Some(200),
                ..Default::default()
            }],
        )];

        let candidates = orchestrator.search("Strobe", "deadmau5", Some(180), provider_results);

        // Should filter out low-scoring results (< 0.3)
        assert!(candidates.is_empty() || candidates[0].similarity_score >= 0.3);
    }

    #[test]
    fn test_orchestrator_sorts_by_score() {
        let orchestrator = Orchestrator::new();

        let provider_results = vec![(
            ProviderSource::Beatport,
            vec![
                RawTrackData {
                    title: "Strobe Extended Mix".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(180),
                    ..Default::default()
                },
                RawTrackData {
                    title: "Strobe".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(180),
                    ..Default::default()
                },
                RawTrackData {
                    title: "Strobe Remix".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(200),
                    ..Default::default()
                },
            ],
        )];

        let candidates = orchestrator.search("Strobe", "deadmau5", Some(180), provider_results);

        // AIDEV-NOTE: Both "Strobe" and "Strobe Extended Mix" score 1.0 because hybrid_text_similarity
        // only checks query words, so "strobe" finds perfect match in "strobe extended mix"
        // This matches the old Electron implementation behavior
        assert!(
            candidates.len() >= 3,
            "Expected at least 3 candidates, got {}",
            candidates.len()
        );

        // Top candidates should have perfect or near-perfect scores
        assert!(
            candidates[0].similarity_score >= 0.95,
            "Top candidate should score >= 0.95, got {}",
            candidates[0].similarity_score
        );

        // One of the top 2 should be exact match "Strobe"
        let has_exact_match = candidates
            .iter()
            .take(2)
            .any(|c| c.title == "Strobe" && c.similarity_score >= 0.95);
        assert!(
            has_exact_match,
            "Expected 'Strobe' in top 2 results with score >= 0.95"
        );

        // Verify descending order
        for i in 1..candidates.len() {
            assert!(
                candidates[i - 1].similarity_score >= candidates[i].similarity_score,
                "Results should be sorted by score (descending)"
            );
        }
    }

    #[test]
    fn test_orchestrator_respects_max_candidates() {
        let config = OrchestratorConfig::new(2, 0.3);
        let orchestrator = Orchestrator::with_config(config).unwrap();

        let provider_results = vec![(
            ProviderSource::Beatport,
            vec![
                RawTrackData {
                    title: "Strobe".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(180),
                    ..Default::default()
                },
                RawTrackData {
                    title: "Strobe Extended".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(220),
                    ..Default::default()
                },
                RawTrackData {
                    title: "Strobe Remix".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(200),
                    ..Default::default()
                },
            ],
        )];

        let candidates = orchestrator.search("Strobe", "deadmau5", Some(180), provider_results);

        assert_eq!(candidates.len(), 2);
    }

    #[test]
    fn test_orchestrator_tie_breaking_by_provider_priority() {
        let orchestrator = Orchestrator::new();

        // Create tracks with very similar scores (within 0.01 tolerance)
        let provider_results = vec![
            (
                ProviderSource::Bandcamp,
                vec![RawTrackData {
                    title: "Strobe".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(180),
                    ..Default::default()
                }],
            ),
            (
                ProviderSource::Beatport,
                vec![RawTrackData {
                    title: "Strobe".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(180),
                    ..Default::default()
                }],
            ),
        ];

        let candidates = orchestrator.search("Strobe", "deadmau5", Some(180), provider_results);

        // Both have same score, so Beatport (priority 3) should win over Bandcamp (priority 1)
        assert!(candidates.len() >= 2);
        if (candidates[0].similarity_score - candidates[1].similarity_score).abs() < 0.01 {
            assert_eq!(candidates[0].source, ProviderSource::Beatport);
        }
    }

    #[test]
    fn test_orchestrator_multi_provider_aggregation() {
        let orchestrator = Orchestrator::new();

        let provider_results = vec![
            (
                ProviderSource::Beatport,
                vec![RawTrackData {
                    title: "Strobe".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(180),
                    ..Default::default()
                }],
            ),
            (
                ProviderSource::Traxsource,
                vec![RawTrackData {
                    title: "Strobe Extended Mix".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(220),
                    ..Default::default()
                }],
            ),
            (
                ProviderSource::Bandcamp,
                vec![RawTrackData {
                    title: "Strobe Remix".to_string(),
                    artists: vec!["deadmau5".to_string()],
                    duration_secs: Some(200),
                    ..Default::default()
                }],
            ),
        ];

        let candidates = orchestrator.search("Strobe", "deadmau5", Some(180), provider_results);

        // Should get results from all 3 providers
        assert!(candidates.len() >= 3);

        // Check we have candidates from multiple sources
        let sources: std::collections::HashSet<_> = candidates.iter().map(|c| c.source).collect();
        assert!(
            sources.len() >= 2,
            "Expected candidates from multiple providers"
        );
    }
}
