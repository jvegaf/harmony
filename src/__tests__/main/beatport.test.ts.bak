import { ExtractToFile } from '../../main/services/fileManager';
import SearchTags from '../../main/services/tagger/beatport';

describe('Beatport Tagger', () => {
  it('should return a list of tracks with title and artist', async () => {
    // const response = await SearchTags('Never Forgot', 988, 'Eli Brown');
    const response = await SearchTags('Stop The Beat', 'Angel Heredia');
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
    ExtractToFile(response, './test.json');
  });

  it('should return a list of tracks with title only', async () => {
    // const response = await SearchTags('Never Forgot', 988, 'Eli Brown');
    const response = await SearchTags('Eli Brown Never Forgot');
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
  });
});
