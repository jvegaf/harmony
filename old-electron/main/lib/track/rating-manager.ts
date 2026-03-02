import { UpdateRatingPayload } from '@preload/types/harmony';
import log from 'electron-log';
import { safeId3Update } from './safe-id3-update';

export default async function UpdateTrackRating(payload: UpdateRatingPayload) {
  const { trackSrc, rating } = payload;
  const mappedRating = Math.round((rating / 5) * 255);
  const updatedTags = { popularimeter: { email: 'traktor@native-instruments.de', rating: mappedRating, counter: 0 } };
  try {
    await safeId3Update(updatedTags, trackSrc);
  } catch (error) {
    log.error('update rating error: ', error);
  }
}
