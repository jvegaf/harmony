// AIDEV-NOTE: Beatport HTTP client with OAuth token management
// Handles token extraction from __NEXT_DATA__ and rate limiting

use chrono::{DateTime, Utc};
use reqwest::Client;
use std::time::Duration;
use thiserror::Error;

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BASE_URL: &str = "https://www.beatport.com";

/// Beatport API errors
#[derive(Debug, Error)]
pub enum BeatportError {
  #[error("Network error: {0}")]
  Network(String),

  #[error("Authentication error: {0}")]
  Auth(String),

  #[error("Parse error: {0}")]
  Parse(String),

  #[error("Rate limited (retry after {0}s)")]
  RateLimit(u64),

  #[error("Track not found: {0} - {1}")]
  TrackNotFound(String, String),
}

/// OAuth token with expiration
#[derive(Debug, Clone)]
pub struct OAuthToken {
  pub access_token: String,
  pub token_type: String,
  pub expires_in: i64,
  pub obtained_at: DateTime<Utc>,
}

impl OAuthToken {
  /// Check if token is expired
  pub fn is_expired(&self) -> bool {
    let now = Utc::now();
    let age = now.signed_duration_since(self.obtained_at).num_seconds();
    age >= self.expires_in - 300 // 5 minute buffer before actual expiry
  }

  /// Create from raw values
  pub fn new(access_token: String, expires_in: i64) -> Self {
    Self {
      access_token,
      token_type: "Bearer".to_string(),
      expires_in,
      obtained_at: Utc::now(),
    }
  }
}

/// Beatport HTTP client
pub struct BeatportClient {
  http: Client,
  token: Option<OAuthToken>,
}

impl BeatportClient {
  /// Create new client
  pub fn new() -> Result<Self, BeatportError> {
    let http = Client::builder()
      .user_agent(USER_AGENT)
      .timeout(Duration::from_secs(30))
      .build()
      .map_err(|e| BeatportError::Network(e.to_string()))?;

    Ok(Self { http, token: None })
  }

  /// Get valid OAuth token (from cache or fetch new)
  pub async fn get_token(&mut self) -> Result<String, BeatportError> {
    // Return cached token if valid
    if let Some(ref token) = self.token {
      if !token.is_expired() {
        return Ok(token.access_token.clone());
      }
    }

    // Fetch new token
    let token = self.fetch_token_from_html().await?;
    Ok(token)
  }

  /// Fetch OAuth token from Beatport HTML
  async fn fetch_token_from_html(&mut self) -> Result<String, BeatportError> {
    let url = format!("{}/search/tracks?q=test", BASE_URL);

    let response = self
      .http
      .get(&url)
      .send()
      .await
      .map_err(|e| BeatportError::Network(e.to_string()))?;

    if !response.status().is_success() {
      return Err(BeatportError::Network(format!(
        "HTTP {}: {}",
        response.status(),
        response.status().canonical_reason().unwrap_or("Unknown")
      )));
    }

    let html = response
      .text()
      .await
      .map_err(|e| BeatportError::Network(e.to_string()))?;

    let token_str = super::parser::extract_token_from_html(&html)?;

    // Cache the token
    self.token = Some(OAuthToken::new(token_str.clone(), 3600));

    Ok(token_str)
  }

  /// Search tracks with query
  pub async fn search_raw(&mut self, query: &str) -> Result<String, BeatportError> {
    let token = self.get_token().await?;
    let encoded_query = urlencoding::encode(query);
    let url = format!("{}/search/tracks?q={}", BASE_URL, encoded_query);

    let response = self
      .http
      .get(&url)
      .header("Authorization", format!("Bearer {}", token))
      .send()
      .await
      .map_err(|e| BeatportError::Network(e.to_string()))?;

    // Handle rate limiting
    if response.status().as_u16() == 429 {
      return Err(BeatportError::RateLimit(60));
    }

    if !response.status().is_success() {
      return Err(BeatportError::Network(format!(
        "HTTP {}: {}",
        response.status(),
        response.status().canonical_reason().unwrap_or("Unknown")
      )));
    }

    response
      .text()
      .await
      .map_err(|e| BeatportError::Network(e.to_string()))
  }
}

impl Default for BeatportClient {
  fn default() -> Self {
    Self::new().expect("Failed to create BeatportClient")
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_oauth_token_not_expired() {
    let token = OAuthToken::new("test_token".to_string(), 3600);
    assert!(!token.is_expired(), "Fresh token should not be expired");
  }

  #[test]
  fn test_oauth_token_expired() {
    let mut token = OAuthToken::new("test_token".to_string(), 3600);
    // Simulate old token (set obtained_at to 2 hours ago)
    token.obtained_at = Utc::now() - chrono::Duration::hours(2);
    assert!(token.is_expired(), "Old token should be expired");
  }

  #[test]
  fn test_oauth_token_near_expiry() {
    let mut token = OAuthToken::new("test_token".to_string(), 3600);
    // Set to 4 minutes before expiry (within 5-minute buffer)
    token.obtained_at = Utc::now() - chrono::Duration::seconds(3600 - 240);
    assert!(
      token.is_expired(),
      "Token near expiry should be considered expired (5min buffer)"
    );
  }

  #[test]
  fn test_client_creation() {
    let client = BeatportClient::new();
    assert!(client.is_ok(), "Client creation should succeed");
  }

  // AIDEV-NOTE: Live integration tests are marked with #[ignore]
  // Run with: cargo test test_fetch_token_live -- --ignored --nocapture
  #[tokio::test]
  #[ignore]
  async fn test_fetch_token_live() {
    let mut client = BeatportClient::new().unwrap();
    let token = client.fetch_token_from_html().await;

    match token {
      Ok(t) => {
        println!("Got token: {}...{}", &t[..10], &t[t.len() - 10..]);
        assert!(!t.is_empty(), "Token should not be empty");
        assert!(t.len() > 20, "Token should be reasonably long");
      }
      Err(e) => {
        eprintln!("Failed to fetch token: {}", e);
        panic!("Live token fetch failed (this may be normal if Beatport changed their HTML structure)");
      }
    }
  }

  #[tokio::test]
  #[ignore]
  async fn test_search_live() {
    let mut client = BeatportClient::new().unwrap();
    let result = client.search_raw("deadmau5 strobe").await;

    match result {
      Ok(html) => {
        println!("Got {} bytes of HTML", html.len());
        assert!(!html.is_empty(), "Search should return HTML");
        assert!(html.contains("__NEXT_DATA__"), "HTML should contain __NEXT_DATA__");
      }
      Err(e) => {
        eprintln!("Search failed: {}", e);
        panic!("Live search failed");
      }
    }
  }
}
