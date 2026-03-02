// AIDEV-NOTE: Bandcamp HTML scraping module
// Parses search results from bandcamp.com using scraper crate
// NOTE: Bandcamp does NOT provide BPM or Key metadata

use crate::libs::tagger::types::RawTrackData;
use reqwest::Client;
use scraper::{Html, Selector};

const BASE_URL: &str = "https://bandcamp.com";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/// Error types for Bandcamp scraping
#[derive(Debug, thiserror::Error)]
pub enum BandcampError {
  #[error("HTTP request failed: {0}")]
  HttpError(#[from] reqwest::Error),

  #[error("Parse error: {0}")]
  ParseError(String),

  #[error("No results found")]
  NoResults,

  #[error("Invalid HTML structure: {0}")]
  InvalidHtml(String),
}

/// Client for Bandcamp scraping
pub struct BandcampScraper {
  client: Client,
}

impl BandcampScraper {
  /// Create new scraper with configured HTTP client
  pub fn new() -> Result<Self, BandcampError> {
    let client = Client::builder()
      .timeout(std::time::Duration::from_secs(10))
      .user_agent(USER_AGENT)
      .build()?;

    Ok(Self { client })
  }

  /// Search for tracks
  /// AIDEV-NOTE: Bandcamp does NOT provide BPM or Key
  pub async fn search(&self, title: &str, artist: &str) -> Result<Vec<RawTrackData>, BandcampError> {
    let query = if !artist.is_empty() {
      format!("{} {}", artist, title)
    } else {
      title.to_string()
    };

    let url = format!("{}​/search?q={}&item_type=t", BASE_URL, urlencoding::encode(&query));
    let html = self.client.get(&url).send().await?.text().await?;

    parse_search_results(&html)
  }
}

/// Parse search results HTML
/// AIDEV-NOTE: Bandcamp search results are in .result-items li.searchresult elements
pub fn parse_search_results(html: &str) -> Result<Vec<RawTrackData>, BandcampError> {
  let document = Html::parse_document(html);

  // Find search results container - Bandcamp uses .result-items ul
  let list_selector = Selector::parse(".result-items").map_err(|e| BandcampError::ParseError(e.to_string()))?;

  let list = document
    .select(&list_selector)
    .next()
    .ok_or_else(|| BandcampError::InvalidHtml("result-items not found".to_string()))?;

  // Find all result items - li.searchresult
  let row_selector = Selector::parse("li.searchresult").map_err(|e| BandcampError::ParseError(e.to_string()))?;

  let rows: Vec<_> = list.select(&row_selector).collect();

  if rows.is_empty() {
    return Err(BandcampError::NoResults);
  }

  let mut tracks = Vec::new();

  for row in rows {
    if let Ok(track) = parse_track_row(&row) {
      tracks.push(track);
    }
  }

  Ok(tracks)
}

/// Parse a single track result element
fn parse_track_row(row: &scraper::ElementRef) -> Result<RawTrackData, BandcampError> {
  // Track link: .heading a
  let heading_selector = Selector::parse(".heading a").unwrap();
  let heading = row
    .select(&heading_selector)
    .next()
    .ok_or_else(|| BandcampError::ParseError("heading not found".to_string()))?;

  let url = heading
    .value()
    .attr("href")
    .ok_or_else(|| BandcampError::ParseError("track URL not found".to_string()))?
    .to_string();

  // Track ID is the full URL
  let track_id = format!("bandcamp:{}", url);

  // Title - text content of .heading a
  let title = heading.text().collect::<String>().trim().to_string();

  // Artist - .subhead
  let subhead_selector = Selector::parse(".subhead").unwrap();
  let artist_text = row
    .select(&subhead_selector)
    .next()
    .map(|e| e.text().collect::<String>().trim().to_string())
    .unwrap_or_default();

  // Extract artist from "by Artist Name" or "from Album by Artist"
  let artists = parse_artist_from_subhead(&artist_text);

  // Album/release - .released
  let released_selector = Selector::parse(".released").unwrap();
  let released_text = row
    .select(&released_selector)
    .next()
    .map(|e| e.text().collect::<String>().trim().to_string());

  let (label, release_date) = parse_released_info(&released_text.unwrap_or_default());

  // Artwork - .art img
  let art_selector = Selector::parse(".art img").unwrap();
  let artwork_url = row
    .select(&art_selector)
    .next()
    .and_then(|img| img.value().attr("src"))
    .map(|src| src.to_string());

  // Tags - .tags
  let tags_selector = Selector::parse(".tags").unwrap();
  let genre = row
    .select(&tags_selector)
    .next()
    .map(|e| {
      e.text()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .replace("tags:", "")
        .trim()
        .split(',')
        .next()
        .map(|s| s.trim().to_string())
    })
    .flatten();

  Ok(RawTrackData {
    id: track_id,
    title,
    mix_name: None, // Bandcamp doesn't separate mix versions
    artists,
    bpm: None, // Bandcamp does NOT provide BPM
    key: None, // Bandcamp does NOT provide Key
    duration_secs: None, // Search results don't include duration
    artwork_url,
    genre,
    label,
    release_date,
  })
}

/// Parse artist from subhead text
/// Formats: "by Artist Name" or "from Album by Artist Name"
fn parse_artist_from_subhead(text: &str) -> Vec<String> {
  if text.is_empty() {
    return vec![];
  }

  // Remove "by " prefix if present
  let cleaned = if text.starts_with("by ") {
    &text[3..]
  } else if let Some(by_pos) = text.find(" by ") {
    // "from Album by Artist" -> "Artist"
    &text[by_pos + 4..]
  } else {
    text
  };

  vec![cleaned.trim().to_string()]
}

/// Parse released info: "released Month Day, Year" or album info
/// Returns (label/album, release_date)
fn parse_released_info(text: &str) -> (Option<String>, Option<String>) {
  if text.is_empty() {
    return (None, None);
  }

  // Try to extract date pattern: "released Month DD, YYYY"
  if let Some(date_str) = text.strip_prefix("released ") {
    // Parse date like "December 15, 2023"
    if let Some(date) = parse_bandcamp_date(date_str) {
      return (None, Some(date));
    }
  }

  // Otherwise, treat as album/label info
  (Some(text.to_string()), None)
}

/// Parse Bandcamp date format: "Month DD, YYYY" -> "YYYY-MM-DD"
fn parse_bandcamp_date(text: &str) -> Option<String> {
  // Simple regex pattern for "Month DD, YYYY"
  let re = regex::Regex::new(r"(\w+)\s+(\d+),\s+(\d{4})").ok()?;
  let caps = re.captures(text)?;

  let month = caps.get(1)?.as_str();
  let day = caps.get(2)?.as_str();
  let year = caps.get(3)?.as_str();

  // Convert month name to number
  let month_num = match month {
    "January" => "01",
    "February" => "02",
    "March" => "03",
    "April" => "04",
    "May" => "05",
    "June" => "06",
    "July" => "07",
    "August" => "08",
    "September" => "09",
    "October" => "10",
    "November" => "11",
    "December" => "12",
    _ => return None,
  };

  // Format as YYYY-MM-DD
  Some(format!("{}-{}-{:0>2}", year, month_num, day))
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
  <ul class="result-items">
    <li class="searchresult track">
      <div class="art">
        <img src="https://f4.bcbits.com/img/a123456_10.jpg" />
      </div>
      <div class="itemtype">TRACK</div>
      <div class="heading">
        <a href="https://artist.bandcamp.com/track/test-track">Test Track</a>
      </div>
      <div class="subhead">
        by <span>Test Artist</span>
      </div>
      <div class="released">
        released December 15, 2023
      </div>
      <div class="tags">
        tags: electronic, ambient, experimental
      </div>
    </li>
    <li class="searchresult track">
      <div class="art">
        <img src="https://f4.bcbits.com/img/b789012_10.jpg" />
      </div>
      <div class="itemtype">TRACK</div>
      <div class="heading">
        <a href="https://another-artist.bandcamp.com/track/another-song">Another Song</a>
      </div>
      <div class="subhead">
        from Album Name by Another Artist
      </div>
      <div class="released">
        Test Label
      </div>
      <div class="tags">
        tags: techno, house
      </div>
    </li>
  </ul>
</body>
</html>
"#;

  const MOCK_EMPTY_HTML: &str = r#"
<!DOCTYPE html>
<html>
<head><title>No Results</title></head>
<body>
  <ul class="result-items">
    <!-- No tracks -->
  </ul>
</body>
</html>
"#;

  #[test]
  fn test_parse_search_results_success() {
    let tracks = parse_search_results(MOCK_SEARCH_HTML).expect("Parse failed");

    assert_eq!(tracks.len(), 2);

    // First track
    let first = &tracks[0];
    assert_eq!(first.title, "Test Track");
    assert_eq!(first.artists, vec!["Test Artist"]);
    assert!(first.id.starts_with("bandcamp:"));
    assert!(first.id.contains("artist.bandcamp.com/track/test-track"));
    assert_eq!(first.release_date, Some("2023-12-15".to_string()));
    assert_eq!(first.genre, Some("electronic".to_string()));
    assert!(first.artwork_url.is_some());
    // Bandcamp does NOT provide BPM or Key
    assert!(first.bpm.is_none());
    assert!(first.key.is_none());

    // Second track
    let second = &tracks[1];
    assert_eq!(second.title, "Another Song");
    assert_eq!(second.artists, vec!["Another Artist"]);
    assert_eq!(second.label, Some("Test Label".to_string()));
    assert_eq!(second.genre, Some("techno".to_string()));
  }

  #[test]
  fn test_parse_search_results_empty() {
    let result = parse_search_results(MOCK_EMPTY_HTML);
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), BandcampError::NoResults));
  }

  #[test]
  fn test_parse_search_results_missing_container() {
    let html = r#"<html><body><div id="other">Not search results</div></body></html>"#;
    let result = parse_search_results(html);
    assert!(result.is_err());
  }

  #[test]
  fn test_parse_artist_from_subhead() {
    assert_eq!(parse_artist_from_subhead("by Test Artist"), vec!["Test Artist"]);
    assert_eq!(
      parse_artist_from_subhead("from Album Name by Another Artist"),
      vec!["Another Artist"]
    );
    assert_eq!(parse_artist_from_subhead("Test Artist"), vec!["Test Artist"]);
    assert_eq!(parse_artist_from_subhead(""), Vec::<String>::new());
  }

  #[test]
  fn test_parse_bandcamp_date() {
    assert_eq!(parse_bandcamp_date("December 15, 2023"), Some("2023-12-15".to_string()));
    assert_eq!(parse_bandcamp_date("January 1, 2024"), Some("2024-01-01".to_string()));
    assert_eq!(parse_bandcamp_date("May 30, 2022"), Some("2022-05-30".to_string()));
    assert_eq!(parse_bandcamp_date("invalid"), None);
    assert_eq!(parse_bandcamp_date(""), None);
  }

  #[test]
  fn test_parse_released_info() {
    assert_eq!(
      parse_released_info("released December 15, 2023"),
      (None, Some("2023-12-15".to_string()))
    );
    assert_eq!(parse_released_info("Test Label"), (Some("Test Label".to_string()), None));
    assert_eq!(parse_released_info(""), (None, None));
  }

  #[tokio::test]
  #[ignore] // Live test - requires network
  async fn test_search_live() {
    if std::env::var("RUN_LIVE_TESTS").is_err() {
      return;
    }

    let scraper = BandcampScraper::new().expect("Failed to create scraper");
    let tracks = scraper.search("Strobe", "Deadmau5").await.expect("Search failed");

    assert!(!tracks.is_empty(), "Should find at least one result");

    // Check first result has expected fields
    let first = &tracks[0];
    assert!(!first.title.is_empty(), "Title should not be empty");
    assert!(!first.artists.is_empty(), "Artists should not be empty");
    assert!(first.id.starts_with("bandcamp:"), "ID should have bandcamp: prefix");
    // Bandcamp does NOT provide BPM or Key
    assert!(first.bpm.is_none(), "Bandcamp should not have BPM");
    assert!(first.key.is_none(), "Bandcamp should not have Key");
  }
}
