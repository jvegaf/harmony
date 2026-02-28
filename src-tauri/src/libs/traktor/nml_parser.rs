// AIDEV-NOTE: Traktor NML Parser
// Parses Traktor's collection.nml XML files into Rust structs
//
// Uses quick-xml with serde for efficient XML deserialization
// Handles NML files from Traktor Pro 3.x (VERSION="19")

use log::info;
use quick_xml::de::from_str;
use std::fs;
use std::path::Path;

use crate::libs::Result;

use super::nml_types::TraktorNML;

/// Parser for Traktor NML (collection.nml) files
///
/// Usage:
/// ```rust
/// let parser = TraktorNMLParser::new();
/// let nml = parser.parse("/path/to/collection.nml")?;
/// ```
pub struct TraktorNMLParser;

impl TraktorNMLParser {
  pub fn new() -> Self {
    Self
  }

  /// Parse an NML file from disk
  ///
  /// # Arguments
  /// * `file_path` - Absolute path to the collection.nml file
  ///
  /// # Returns
  /// Parsed NML structure
  ///
  /// # Errors
  /// Returns error if file cannot be read or parsed
  pub fn parse<P: AsRef<Path>>(&self, file_path: P) -> Result<TraktorNML> {
    let path = file_path.as_ref();
    info!("Parsing Traktor NML file: {:?}", path);

    let xml_content = fs::read_to_string(path)?;
    self.parse_xml(&xml_content)
  }

  /// Parse NML from XML string
  ///
  /// # Arguments
  /// * `xml_content` - Raw XML content
  ///
  /// # Returns
  /// Parsed NML structure
  ///
  /// # Errors
  /// Returns error if XML cannot be parsed
  pub fn parse_xml(&self, xml_content: &str) -> Result<TraktorNML> {
    info!("Deserializing NML XML ({} bytes)", xml_content.len());

    // AIDEV-NOTE: quick-xml with serde handles attribute parsing automatically
    // The @-prefix in our struct definitions tells serde to look for XML attributes
    let nml: TraktorNML = from_str(xml_content)
      .map_err(|e| crate::libs::HarmonyError::Xml(format!("Failed to parse NML XML: {}", e)))?;

    let entry_count = nml.nml.collection.entry.len();
    info!("Successfully parsed NML with {} tracks", entry_count);

    Ok(nml)
  }
}

impl Default for TraktorNMLParser {
  fn default() -> Self {
    Self::new()
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_parse_minimal_nml() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"/>
  <COLLECTION ENTRIES="1">
    <ENTRY MODIFIED_DATE="2026/1/15" AUDIO_ID="test123" TITLE="Test Track" ARTIST="Test Artist">
      <LOCATION DIR="/:Music/:" FILE="test.mp3" VOLUME="C:" VOLUMEID="123"/>
      <TEMPO BPM="120.000000" BPM_QUALITY="100.000000"/>
      <INFO PLAYTIME="180" KEY="5A"/>
    </ENTRY>
  </COLLECTION>
</NML>"#;

    let parser = TraktorNMLParser::new();
    let result = parser.parse_xml(xml);

    assert!(result.is_ok());
    let nml = result.unwrap();
    assert_eq!(nml.nml.version, "19");
    assert_eq!(nml.nml.collection.entry.len(), 1);

    let entry = &nml.nml.collection.entry[0];
    assert_eq!(entry.title, Some("Test Track".to_string()));
    assert_eq!(entry.artist, Some("Test Artist".to_string()));
    assert_eq!(entry.location.file, "test.mp3");
    assert!(entry.tempo.is_some());
    assert_eq!(entry.tempo.as_ref().unwrap().bpm, "120.000000");
  }

  #[test]
  fn test_parse_with_cue_points() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"/>
  <COLLECTION ENTRIES="1">
    <ENTRY TITLE="Test Track" ARTIST="Test Artist">
      <LOCATION DIR="/:Music/:" FILE="test.mp3" VOLUME="C:"/>
      <CUE_V2 NAME="Intro" TYPE="0" START="5000.0" HOTCUE="0"/>
      <CUE_V2 NAME="Loop" TYPE="5" START="30000.0" LEN="16000.0" REPEATS="-1"/>
    </ENTRY>
  </COLLECTION>
</NML>"#;

    let parser = TraktorNMLParser::new();
    let result = parser.parse_xml(xml);

    assert!(result.is_ok());
    let nml = result.unwrap();
    let entry = &nml.nml.collection.entry[0];
    assert_eq!(entry.cue_v2.len(), 2);
    assert_eq!(entry.cue_v2[0].cue_type, "0");
    assert_eq!(entry.cue_v2[0].name, Some("Intro".to_string()));
    assert_eq!(entry.cue_v2[1].cue_type, "5");
    assert_eq!(entry.cue_v2[1].len, Some("16000.0".to_string()));
  }
}
