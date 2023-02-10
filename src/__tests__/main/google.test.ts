import { ExtractToFile } from '../../main/services/fileManager';
import { SearchTrackInfo } from '../../main/services/tagger/google';

describe('Google Tagger', () => {
  it('should return a list of results', async() => {
    // const response = await SearchTrackInfo('Never Forgot', 'Eli Brown');
    // const response = await SearchTrackInfo('Stop The Beat', 'Angel Heredia');
    // const response = await SearchTrackInfo('Truth_x_Lies_Wanted');
    const response = await SearchTrackInfo('Nick+Curly+-+Rebound+(Original+Mix)');
    ExtractToFile(response, 'test-gg');
    expect(response)
      .toBeDefined();
    // expect(response.length).toBeGreaterThan(0);
  });

  // it('should return a list of tracks with title only', async () => {
  //   const response = await SearchYtTags('Eli Brown Never Forgot');
  //   expect(response).toBeDefined();
  //   expect(response.length).toBeGreaterThan(0);
  // });
});
