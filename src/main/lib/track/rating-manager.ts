import NodeID3 from 'node-id3';
import { UpdateRatingPayload } from '@preload/types/harmony';
import log from 'electron-log';

export default async function UpdateTrackRating(payload: UpdateRatingPayload) {
  const { trackSrc, rating } = payload;
  const mappedRating = Math.round((rating / 5) * 255);
  const updatedTags = { popularimeter: { email: 'traktor@native-instruments.de', rating: mappedRating, counter: 0 } };
  try {
    await NodeID3.Promise.update(updatedTags, trackSrc);
  } catch (error) {
    log.error('update rating error: ', error);
  }
}
