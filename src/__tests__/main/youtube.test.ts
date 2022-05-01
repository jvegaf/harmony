// import { ExtractToFile } from '../../main/services/fileManager';
import SearchYtTags from '../../main/services/tagger/youtube';

describe('Youtube Tagger', () => {
  it('should return a list of tracks with title and artist', async () => {
    // const response = await SearchTags('Never Forgot', 988, 'Eli Brown');
    const response = await SearchYtTags('Stop The Beat', 'Angel Heredia');
    expect(response).toBeDefined();
    // eslint-disable-next-line no-console
    console.log(response);
    expect(response.length).toBeGreaterThan(0);
    // ExtractToFile(response, './test-yt.json');
  });

  // eslint-disable-next-line jest/no-commented-out-tests
  // it('should return a list of tracks with title only', async () => {
  //   const response = await SearchYtTags('Eli Brown Never Forgot');
  //   expect(response).toBeDefined();
  //   expect(response.length).toBeGreaterThan(0);
  // });
});
