// AIDEV-NOTE: HTML/JSON parser for Beatport __NEXT_DATA__ extraction
// Parses OAuth tokens and search results from Next.js SSR data

use super::client::BeatportError;
use crate::libs::tagger::types::RawTrackData;
use scraper::{Html, Selector};
use serde_json::Value;

/// Extract OAuth token from Beatport HTML
pub fn extract_token_from_html(html: &str) -> Result<String, BeatportError> {
  let document = Html::parse_document(html);
  let selector = Selector::parse("#__NEXT_DATA__")
    .map_err(|e| BeatportError::Parse(format!("Invalid selector: {:?}", e)))?;

  let script_element = document
    .select(&selector)
    .next()
    .ok_or_else(|| BeatportError::Auth("No __NEXT_DATA__ script found in HTML".to_string()))?;

  let json_text = script_element.inner_html();

  let json_data: Value = serde_json::from_str(&json_text)
    .map_err(|e| BeatportError::Parse(format!("Invalid JSON in __NEXT_DATA__: {}", e)))?;

  // Navigate: props.pageProps.anonSession.access_token
  let access_token = json_data
    .get("props")
    .and_then(|p| p.get("pageProps"))
    .and_then(|pp| pp.get("anonSession"))
    .and_then(|as_| as_.get("access_token"))
    .and_then(|t| t.as_str())
    .ok_or_else(|| BeatportError::Auth("access_token not found in __NEXT_DATA__".to_string()))?;

  Ok(access_token.to_string())
}

/// Parse search results from Beatport HTML
pub fn parse_search_results(html: &str) -> Result<Vec<RawTrackData>, BeatportError> {
  let document = Html::parse_document(html);
  let selector = Selector::parse("#__NEXT_DATA__")
    .map_err(|e| BeatportError::Parse(format!("Invalid selector: {:?}", e)))?;

  let script_element = document.select(&selector).next().ok_or_else(|| {
    BeatportError::Parse("No __NEXT_DATA__ script found in search HTML".to_string())
  })?;

  let json_text = script_element.inner_html();

  let json_data: Value = serde_json::from_str(&json_text)
    .map_err(|e| BeatportError::Parse(format!("Invalid JSON in __NEXT_DATA__: {}", e)))?;

  // Navigate: props.pageProps.dehydratedState.queries[0].state.data.data
  let data = json_data
    .get("props")
    .and_then(|p| p.get("pageProps"))
    .and_then(|pp| pp.get("dehydratedState"))
    .and_then(|ds| ds.get("queries"))
    .and_then(|q| q.get(0))
    .and_then(|q0| q0.get("state"))
    .and_then(|s| s.get("data"))
    .and_then(|d| d.get("data"));

  // No results case
  if data.is_none() {
    return Ok(vec![]);
  }

  let tracks_array = data
    .and_then(|d| d.as_array())
    .ok_or_else(|| BeatportError::Parse("Expected array of tracks in data.data".to_string()))?;

  let mut results = Vec::new();

  for track_val in tracks_array {
    if let Ok(raw_track) = parse_track(track_val) {
      results.push(raw_track);
    }
    // Skip tracks that fail to parse (partial results are OK)
  }

  Ok(results)
}

/// Parse a single track from JSON
fn parse_track(track: &Value) -> Result<RawTrackData, BeatportError> {
  let track_id = track
    .get("track_id")
    .or_else(|| track.get("id"))
    .and_then(|v| v.as_i64())
    .ok_or_else(|| BeatportError::Parse("Missing track_id".to_string()))?;

  let title = track
    .get("track_name")
    .or_else(|| track.get("name"))
    .and_then(|v| v.as_str())
    .ok_or_else(|| BeatportError::Parse("Missing track_name".to_string()))?
    .to_string();

  let mix_name = track
    .get("mix_name")
    .and_then(|v| v.as_str())
    .map(|s| s.to_string());

  // Artists array
  let artists = track
    .get("artists")
    .and_then(|v| v.as_array())
    .map(|arr| {
      arr
        .iter()
        .filter_map(|a| {
          a.get("artist_name")
            .or_else(|| a.get("name"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
        })
        .collect()
    })
    .unwrap_or_default();

  let bpm = track.get("bpm").and_then(|v| v.as_f64());

  let key = track
    .get("key_name")
    .or_else(|| track.get("key").and_then(|k| k.get("name")))
    .and_then(|v| v.as_str())
    .map(|s| s.to_string());

  let duration_secs = track
    .get("length_ms")
    .and_then(|v| v.as_i64())
    .map(|ms| (ms / 1000) as u32);

  // Image URL - try multiple paths
  let artwork_url = track
    .get("image")
    .and_then(|img| img.get("url"))
    .or_else(|| {
      track
        .get("release")
        .and_then(|r| r.get("image"))
        .and_then(|img| img.get("url"))
    })
    .and_then(|v| v.as_str())
    .map(|s| s.to_string());

  // Genre
  let genre = track
    .get("genre")
    .and_then(|g| {
      // Handle array (take first)
      if let Some(arr) = g.as_array() {
        arr.first()
      } else {
        Some(g)
      }
    })
    .and_then(|g| g.get("genre_name").or_else(|| g.get("name")))
    .and_then(|v| v.as_str())
    .map(|s| s.to_string());

  // Label
  let label = track
    .get("label")
    .or_else(|| track.get("release").and_then(|r| r.get("label")))
    .and_then(|l| l.get("label_name").or_else(|| l.get("name")))
    .and_then(|v| v.as_str())
    .map(|s| s.to_string());

  // Release date
  let release_date = track
    .get("release_date")
    .or_else(|| track.get("release").and_then(|r| r.get("release_date")))
    .and_then(|v| v.as_str())
    .map(|s| s.to_string());

  Ok(RawTrackData {
    id: track_id.to_string(),
    title,
    mix_name,
    artists,
    bpm,
    key,
    duration_secs,
    artwork_url,
    genre,
    label,
    release_date,
  })
}

#[cfg(test)]
mod tests {
  use super::*;

  // AIDEV-NOTE: Test with mock HTML fixture
  const MOCK_TOKEN_HTML: &str = r#"
<!DOCTYPE html>
<html>
<head></head>
<body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "anonSession": {
        "access_token": "test_token_12345",
        "token_type": "Bearer",
        "expires_in": 3600
      }
    }
  }
}
</script>
</body>
</html>
"#;

  const MOCK_SEARCH_HTML: &str = r#"
<!DOCTYPE html>
<html>
<head></head>
<body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "dehydratedState": {
        "queries": [
          {
            "state": {
              "data": {
                "data": [
                  {
                    "track_id": 123456,
                    "track_name": "Strobe",
                    "mix_name": "Original Mix",
                    "artists": [
                      {"artist_id": 1, "artist_name": "deadmau5"}
                    ],
                    "bpm": 128.0,
                    "key_name": "Am",
                    "length_ms": 180000,
                    "genre": {"genre_name": "Progressive House"},
                    "label": {"label_name": "mau5trap"}
                  }
                ]
              }
            }
          }
        ]
      }
    }
  }
}
</script>
</body>
</html>
"#;

  #[test]
  fn test_extract_token_from_mock_html() {
    let token = extract_token_from_html(MOCK_TOKEN_HTML).unwrap();
    assert_eq!(token, "test_token_12345");
  }

  #[test]
  fn test_extract_token_missing_script() {
    let html = "<html><body>No script here</body></html>";
    let result = extract_token_from_html(html);
    assert!(result.is_err());
    assert!(matches!(result, Err(BeatportError::Auth(_))));
  }

  #[test]
  fn test_extract_token_invalid_json() {
    let html = r#"<script id="__NEXT_DATA__">not valid json</script>"#;
    let result = extract_token_from_html(html);
    assert!(result.is_err());
    assert!(matches!(result, Err(BeatportError::Parse(_))));
  }

  #[test]
  fn test_extract_token_missing_access_token() {
    let html = r#"<script id="__NEXT_DATA__">{"props": {"pageProps": {}}}</script>"#;
    let result = extract_token_from_html(html);
    assert!(result.is_err());
    assert!(matches!(result, Err(BeatportError::Auth(_))));
  }

  #[test]
  fn test_parse_search_results_from_mock() {
    let results = parse_search_results(MOCK_SEARCH_HTML).unwrap();
    assert_eq!(results.len(), 1);

    let track = &results[0];
    assert_eq!(track.id, "123456");
    assert_eq!(track.title, "Strobe");
    assert_eq!(track.mix_name, Some("Original Mix".to_string()));
    assert_eq!(track.artists, vec!["deadmau5"]);
    assert_eq!(track.bpm, Some(128.0));
    assert_eq!(track.key, Some("Am".to_string()));
    assert_eq!(track.duration_secs, Some(180));
    assert_eq!(track.genre, Some("Progressive House".to_string()));
    assert_eq!(track.label, Some("mau5trap".to_string()));
  }

  #[test]
  fn test_parse_search_results_empty() {
    let html = r#"
<script id="__NEXT_DATA__">
{
  "props": {
    "pageProps": {
      "dehydratedState": {
        "queries": []
      }
    }
  }
}
</script>
"#;
    let results = parse_search_results(html).unwrap();
    assert!(results.is_empty());
  }

  #[test]
  fn test_parse_search_results_no_data() {
    let html = r#"
<script id="__NEXT_DATA__">
{
  "props": {
    "pageProps": {
      "dehydratedState": {
        "queries": [
          {
            "state": {
              "data": {}
            }
          }
        ]
      }
    }
  }
}
</script>
"#;
    let results = parse_search_results(html).unwrap();
    assert!(results.is_empty());
  }
}
