import { Traxsource } from './traxsource';
import { logger } from '@main/lib/log/logger';

async function testTraxsourceSearch() {
  logger.info('Testing Traxsource search functionality...');

  const traxsource = new Traxsource();

  // Test case from the user's URL
  const tracks = await traxsource.searchTracks('Party Bounce', 'Tomas Bisquierra & Freenzy Music');

  logger.info(`Found ${tracks.length} tracks`);

  if (tracks.length > 0) {
    const track = tracks[0];
    logger.info('Track details:');
    logger.info(`- Title: ${track.title}`);
    logger.info(`- Artists: ${track.artists.join(', ')}`);
    logger.info(`- URL: ${track.url}`);
    logger.info(`- Platform: ${track.platform}`);
    logger.info(`- BPM: ${track.bpm}`);
    logger.info(`- Key: ${track.key}`);
    logger.info(`- Duration: ${track.duration} seconds`);
    logger.info(`- Genres: ${track.genres}`);
    logger.info(`- Version: ${track.version}`);
    logger.info(`- Thumb: ${track.thumbnail}`);

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

    logger.info(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
    return success;
  } else {
    logger.info('Test FAILED: No tracks found');
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
