import { Traxsource } from './traxsource';

async function testTraxsourceSearch() {
  console.log('Testing Traxsource search functionality...');

  const traxsource = new Traxsource();

  // Test case from the user's URL
  const tracks = await traxsource.searchTracks('Party Bounce', 'Tomas Bisquierra & Freenzy Music');

  console.log(`Found ${tracks.length} tracks`);

  if (tracks.length > 0) {
    const track = tracks[0];
    console.log('Track details:');
    console.log(`- Title: ${track.title}`);
    console.log(`- Artists: ${track.artists.join(', ')}`);
    console.log(`- URL: ${track.url}`);
    console.log(`- Platform: ${track.platform}`);
    console.log(`- BPM: ${track.bpm}`);
    console.log(`- Key: ${track.key}`);
    console.log(`- Duration: ${track.duration} seconds`);
    console.log(`- Genres: ${track.genres}`);
    console.log(`- Version: ${track.version}`);
    console.log(`- Thumb: ${track.thumbnail}`);

    // Verify expected values
    const success =
      track.title === 'Party Bounce' &&
      track.artists.includes('Tomas Bisquierra') &&
      track.artists.includes('Freenzy Music') &&
      track.platform === 'traxsource' &&
      track.url.includes('/track/') &&
      track.bpm === 129 &&
      track.key === 'G#min' &&
      track.duration === 357 &&
      track.version === 'Original Mix';

    console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
    return success;
  } else {
    console.log('Test FAILED: No tracks found');
    return false;
  }
}

// Run the test
testTraxsourceSearch()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
