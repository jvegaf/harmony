// AIDEV-NOTE: Traxsource HTML scraping module
// Parses search results from traxsource.com using scraper crate (similar to cheerio)

use crate::libs::tagger::types::RawTrackData;
use reqwest::Client;
use scraper::{Html, Selector};

const BASE_URL: &str = "https://www.traxsource.com";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/// Error types for Traxsource scraping
#[derive(Debug, thiserror::Error)]
pub enum TraxsourceError {
  #[error("HTTP request failed: {0}")]
  HttpError(#[from] reqwest::Error),

  #[error("Parse error: {0}")]
  ParseError(String),

  #[error("No results found")]
  NoResults,

  #[error("Invalid HTML structure: {0}")]
  InvalidHtml(String),
}

/// Client for Traxsource scraping
pub struct TraxsourceScraper {
  client: Client,
}

impl TraxsourceScraper {
  /// Create new scraper with configured HTTP client
  pub fn new() -> Result<Self, TraxsourceError> {
    let client = Client::builder()
      .timeout(std::time::Duration::from_secs(10))
      .user_agent(USER_AGENT)
      .build()?;

    Ok(Self { client })
  }

  /// Search for tracks
  pub async fn search(&self, title: &str, artist: &str) -> Result<Vec<RawTrackData>, TraxsourceError> {
    let query = if !artist.is_empty() {
      format!("{} {}", artist, title)
    } else {
      title.to_string()
    };

    let url = format!("{}​/search?term={}", BASE_URL, urlencoding::encode(&query));
    let html = self.client.get(&url).send().await?.text().await?;

    parse_search_results(&html)
  }

  /// Extend track with album metadata (high-res artwork)
  /// AIDEV-NOTE: This fetches track page, then optionally album page for better artwork
  #[allow(dead_code)]
  pub async fn extend_track(&self, track_url: &str) -> Result<(Option<String>, Option<String>), TraxsourceError> {
    let html = self.client.get(track_url).send().await?.text().await?;
    extract_album_data(&html, &self.client).await
  }
}

/// Parse search results HTML
/// AIDEV-NOTE: Main parsing function - extracts track data from #searchTrackList .trk-row elements
pub fn parse_search_results(html: &str) -> Result<Vec<RawTrackData>, TraxsourceError> {
  let document = Html::parse_document(html);

  // Find search results container
  let list_selector = Selector::parse("#searchTrackList").map_err(|e| TraxsourceError::ParseError(e.to_string()))?;

  let list = document
    .select(&list_selector)
    .next()
    .ok_or_else(|| TraxsourceError::InvalidHtml("searchTrackList not found".to_string()))?;

  // Find all track rows
  let row_selector = Selector::parse(".trk-row").map_err(|e| TraxsourceError::ParseError(e.to_string()))?;

  let rows: Vec<_> = list.select(&row_selector).collect();

  if rows.is_empty() {
    return Err(TraxsourceError::NoResults);
  }

  let mut tracks = Vec::new();

  for row in rows {
    if let Ok(track) = parse_track_row(&row) {
      tracks.push(track);
    }
  }

  Ok(tracks)
}

/// Parse a single track row element
/// AIDEV-NOTE: Matches old Electron parsing logic exactly
fn parse_track_row(row: &scraper::ElementRef) -> Result<RawTrackData, TraxsourceError> {
  // Title + version + duration parsing
  let title_selector = Selector::parse("div.title").unwrap();
  let title_elem = row
    .select(&title_selector)
    .next()
    .ok_or_else(|| TraxsourceError::ParseError("title element not found".to_string()))?;

  let title_text = title_elem.text().collect::<Vec<_>>();
  let title_parts: Vec<String> = title_text
    .iter()
    .map(|s| s.trim())
    .filter(|s| !s.is_empty())
    .map(|s| s.to_string())
    .collect();

  let title = title_parts.first().cloned().unwrap_or_default();

  let mut mix_name: Option<String> = None;
  let mut duration_secs: Option<u32> = None;

  if title_parts.len() >= 2 {
    // Get the second part which contains version and possibly duration
    let second_part = &title_parts[1];

    // Clean up control chars and non-breaking spaces
    let cleaned = second_part
      .replace(char::is_control, "")
      .replace('\u{00A0}', " ")
      .replace('\n', " ")
      .trim()
      .to_string();

    // Extract duration first
    duration_secs = parse_duration(&cleaned);

    // Remove duration pattern (anything in parentheses)
    let version_cleaned = if let Some(open_paren) = cleaned.find('(') {
      cleaned[..open_paren].trim().to_string()
    } else {
      // No parentheses, might have duration as last token like "Extended Mix 6:12"
      let mut words: Vec<&str> = cleaned.split_whitespace().collect();
      if !words.is_empty() {
        let last = words.last().unwrap();
        if last.contains(':') {
          words.pop();
        }
      }
      words.join(" ")
    };

    mix_name = Some(version_cleaned).filter(|s| !s.is_empty());
  }

  // URL and track ID
  let link_selector = Selector::parse("div.title a").unwrap();
  let link = title_elem.select(&link_selector).next();

  let href = link.and_then(|a| a.value().attr("href")).unwrap_or("");
  let _url = if href.starts_with("http") {
    href.to_string()
  } else {
    format!("{}{}", BASE_URL, href)
  };

  // Extract track ID from URL: /track/12345678/...
  let track_id = href
    .split('/')
    .nth(2) // /track/ID/...
    .map(|id| format!("traxsource:{}", id))
    .unwrap_or_else(|| format!("traxsource:{}", uuid::Uuid::new_v4()));

  // Artists
  let artists_selector = Selector::parse("div.artists a").unwrap();
  let artists: Vec<String> = row
    .select(&artists_selector)
    .map(|a| a.text().collect::<String>().trim().to_string())
    .filter(|s| !s.is_empty())
    .collect();

  // Label
  let label_selector = Selector::parse("div.label").unwrap();
  let label = row
    .select(&label_selector)
    .next()
    .map(|e| e.text().collect::<String>().trim().to_string())
    .filter(|s| !s.is_empty());

  // Key and BPM (format: "G#min\n129")
  let key_bpm_selector = Selector::parse("div.key-bpm").unwrap();
  let key_bpm_text = row
    .select(&key_bpm_selector)
    .next()
    .map(|e| e.text().collect::<String>().trim().to_string())
    .unwrap_or_default();

  let (key, bpm) = parse_key_bpm(&key_bpm_text);

  // Genre
  let genre_selector = Selector::parse("div.genre").unwrap();
  let genre = row
    .select(&genre_selector)
    .next()
    .map(|e| e.text().collect::<String>().trim().to_string())
    .filter(|s| !s.is_empty());

  // Release date (raw format: "Pre-order for 2024-01-15" or "2024-01-15")
  let rdate_selector = Selector::parse("div.r-date").unwrap();
  let rdate_raw = row
    .select(&rdate_selector)
    .next()
    .map(|e| e.text().collect::<String>().trim().to_string())
    .unwrap_or_default();

  let release_date = parse_release_date(&rdate_raw);

  // Thumbnail
  let thumb_selector = Selector::parse("div.thumb img").unwrap();
  let thumb = row.select(&thumb_selector).next().and_then(|img| img.value().attr("src"));

  let artwork_url = thumb.map(|src| {
    if src.starts_with("http") {
      src.to_string()
    } else {
      format!("{}{}", BASE_URL, src)
    }
  });

  Ok(RawTrackData {
    id: track_id,
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

/// Parse duration string like "(5:57)" or "5:57" to seconds
/// Can extract duration from a larger string like "Extended Mix (5:57)"
fn parse_duration(s: &str) -> Option<u32> {
  // Try to extract duration pattern: digits:digits or (digits:digits)
  // Supports mm:ss or hh:mm:ss
  let re = regex::Regex::new(r"\(?(\d+):(\d+)(?::(\d+))?\)?").ok()?;

  if let Some(caps) = re.captures(s) {
    if caps.len() == 4 && caps.get(3).is_some() {
      // hh:mm:ss format
      let hours = caps.get(1)?.as_str().parse::<u32>().ok()?;
      let minutes = caps.get(2)?.as_str().parse::<u32>().ok()?;
      let seconds = caps.get(3)?.as_str().parse::<u32>().ok()?;
      return Some(hours * 3600 + minutes * 60 + seconds);
    } else {
      // mm:ss format
      let minutes = caps.get(1)?.as_str().parse::<u32>().ok()?;
      let seconds = caps.get(2)?.as_str().parse::<u32>().ok()?;
      return Some(minutes * 60 + seconds);
    }
  }

  None
}

/// Parse key/BPM text like "G#min\n129" or "G#min 129"
fn parse_key_bpm(text: &str) -> (Option<String>, Option<f64>) {
  let parts: Vec<&str> = text.split_whitespace().collect();

  if parts.len() >= 2 {
    let key = Some(parts[0].to_string());
    let bpm = parts[1].parse::<f64>().ok();
    (key, bpm)
  } else if parts.len() == 1 {
    // Try to extract BPM number
    if let Ok(bpm) = parts[0].parse::<f64>() {
      (None, Some(bpm))
    } else {
      // Assume it's a key
      (Some(parts[0].to_string()), None)
    }
  } else {
    (None, None)
  }
}

/// Parse release date string (remove "Pre-order for " prefix)
fn parse_release_date(text: &str) -> Option<String> {
  let cleaned = text.replace("Pre-order for ", "").trim().to_string();

  // Check if it matches YYYY-MM-DD format
  if cleaned.len() >= 10 && cleaned.chars().nth(4) == Some('-') && cleaned.chars().nth(7) == Some('-') {
    Some(cleaned[..10].to_string())
  } else {
    None
  }
}

/// Extract album name and artwork URL from track page HTML
#[allow(dead_code)]
async fn extract_album_data(
  html: &str,
  client: &Client,
) -> Result<(Option<String>, Option<String>), TraxsourceError> {
  let document = Html::parse_document(html);

  // Album link: div.ttl-info.ellip a
  let album_selector = Selector::parse("div.ttl-info.ellip a").unwrap();
  let album_elem = document.select(&album_selector).next();

  let album_name = album_elem.as_ref().map(|e| e.text().collect::<String>().trim().to_string());

  let album_href = album_elem.and_then(|e| e.value().attr("href"));

  if let Some(href) = album_href {
    let album_url = if href.starts_with("http") {
      href.to_string()
    } else {
      format!("{}{}", BASE_URL, href)
    };

    // Fetch album page
    let album_html = client.get(&album_url).send().await?.text().await?;
    let album_doc = Html::parse_document(&album_html);

    // Album art: div.t-image img
    let art_selector = Selector::parse("div.t-image img").unwrap();
    if let Some(img) = album_doc.select(&art_selector).next() {
      if let Some(src) = img.value().attr("src") {
        let art_url = if src.starts_with("http") {
          src.to_string()
        } else {
          format!("{}{}", BASE_URL, src)
        };
        return Ok((album_name, Some(art_url)));
      }
    }
  }

  Ok((album_name, None))
}

// AIDEV-NOTE: Tests with mock HTML fixtures
#[cfg(test)]
mod tests {
  use super::*;

  const MOCK_SEARCH_HTML: &str = r#"
<!DOCTYPE html>
<html>
<head><title>Search Results</title></head>
<body>
  <div id="searchTrackList">
    <div class="trk-row">
      <div class="title">
        <a href="/track/12345678/artist-name-track-title-original-mix">Track Title</a>
        Original Mix
        (5:57)
      </div>
      <div class="artists">
        <a href="/artist/123">Artist Name</a>
      </div>
      <div class="label">Test Label</div>
      <div class="key-bpm">G#min 129</div>
      <div class="genre">Deep House</div>
      <div class="r-date">2024-01-15</div>
      <div class="thumb"><img src="/images/artwork.jpg" /></div>
    </div>
    <div class="trk-row">
      <div class="title">
        <a href="/track/87654321/another-artist-another-track">Another Track</a>
        Extended Mix (6:12)
      </div>
      <div class="artists">
        <a href="/artist/456">Another Artist</a>
        <a href="/artist/789">Featuring Artist</a>
      </div>
      <div class="label">Another Label</div>
      <div class="key-bpm">Amin 124</div>
      <div class="genre">Tech House</div>
      <div class="r-date">Pre-order for 2024-02-01</div>
      <div class="thumb"><img src="https://cdn.traxsource.com/artwork2.jpg" /></div>
    </div>
  </div>
</body>
</html>
"#;

  const MOCK_EMPTY_HTML: &str = r#"
<!DOCTYPE html>
<html>
<head><title>No Results</title></head>
<body>
  <div id="searchTrackList">
    <!-- No tracks -->
  </div>
</body>
</html>
"#;

  #[test]
  fn test_parse_search_results_success() {
    let tracks = parse_search_results(MOCK_SEARCH_HTML).expect("Parse failed");

    assert_eq!(tracks.len(), 2);

    // First track
    let first = &tracks[0];
    assert_eq!(first.title, "Track Title");
    assert_eq!(first.mix_name, Some("Original Mix".to_string()));
    assert_eq!(first.duration_secs, Some(357)); // 5:57 = 357 seconds
    assert_eq!(first.artists, vec!["Artist Name"]);
    assert_eq!(first.label, Some("Test Label".to_string()));
    assert_eq!(first.key, Some("G#min".to_string()));
    assert_eq!(first.bpm, Some(129.0));
    assert_eq!(first.genre, Some("Deep House".to_string()));
    assert_eq!(first.release_date, Some("2024-01-15".to_string()));
    assert!(first.id.starts_with("traxsource:"));
    assert!(first.artwork_url.is_some());

    // Second track
    let second = &tracks[1];
    assert_eq!(second.title, "Another Track");
    assert_eq!(second.artists.len(), 2);
    assert_eq!(second.artists[0], "Another Artist");
    assert_eq!(second.artists[1], "Featuring Artist");
    assert_eq!(second.key, Some("Amin".to_string()));
    assert_eq!(second.bpm, Some(124.0));
    assert_eq!(second.release_date, Some("2024-02-01".to_string())); // Pre-order stripped
    assert!(second.artwork_url.as_ref().unwrap().starts_with("https://"));
  }

  #[test]
  fn test_parse_search_results_empty() {
    let result = parse_search_results(MOCK_EMPTY_HTML);
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), TraxsourceError::NoResults));
  }

  #[test]
  fn test_parse_search_results_missing_container() {
    let html = r#"<html><body><div id="other">Not search results</div></body></html>"#;
    let result = parse_search_results(html);
    assert!(result.is_err());
  }

  #[test]
  fn test_parse_duration() {
    assert_eq!(parse_duration("(5:57)"), Some(357));
    assert_eq!(parse_duration("5:57"), Some(357));
    assert_eq!(parse_duration("(1:23:45)"), Some(5025)); // 1h 23m 45s
    assert_eq!(parse_duration("invalid"), None);
    assert_eq!(parse_duration(""), None);
  }

  #[test]
  fn test_parse_key_bpm() {
    assert_eq!(parse_key_bpm("G#min 129"), (Some("G#min".to_string()), Some(129.0)));
    assert_eq!(parse_key_bpm("Amin 124"), (Some("Amin".to_string()), Some(124.0)));
    assert_eq!(parse_key_bpm("129"), (None, Some(129.0)));
    assert_eq!(parse_key_bpm("G#min"), (Some("G#min".to_string()), None));
    assert_eq!(parse_key_bpm(""), (None, None));
  }

  #[test]
  fn test_parse_release_date() {
    assert_eq!(parse_release_date("2024-01-15"), Some("2024-01-15".to_string()));
    assert_eq!(
      parse_release_date("Pre-order for 2024-02-01"),
      Some("2024-02-01".to_string())
    );
    assert_eq!(parse_release_date("Pre-order for 2024-02-01 extra"), Some("2024-02-01".to_string()));
    assert_eq!(parse_release_date("invalid"), None);
    assert_eq!(parse_release_date(""), None);
  }

  #[tokio::test]
  #[ignore] // Live test - requires network
  async fn test_search_live() {
    if std::env::var("RUN_LIVE_TESTS").is_err() {
      return;
    }

    let scraper = TraxsourceScraper::new().expect("Failed to create scraper");
    let tracks = scraper
      .search("Strobe", "Deadmau5")
      .await
      .expect("Search failed");

    assert!(!tracks.is_empty(), "Should find at least one result");

    // Check first result has expected fields
    let first = &tracks[0];
    assert!(!first.title.is_empty(), "Title should not be empty");
    assert!(!first.artists.is_empty(), "Artists should not be empty");
    assert!(first.id.starts_with("traxsource:"), "ID should have traxsource: prefix");
  }
}
