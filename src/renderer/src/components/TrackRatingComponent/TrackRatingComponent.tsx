import { Rating } from '@mantine/core';
import { useEffect, useState } from 'react';
import { TrackRating, TrackSrc } from '@renderer/types/harmony';
import { useLibraryAPI } from '../../stores/useLibraryStore';

type Props = {
  trackSrc: TrackSrc;
  rating: TrackRating;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
};

function TrackRatingComponent({ trackSrc, rating, size }: Props) {
  const libraryAPI = useLibraryAPI();
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (!rating) {
      return;
    }
    // const result = Math.round(rating.rating * 5);
    setStars(rating.rating);
  }, [rating]);

  const handleRating = (value: number) => {
    libraryAPI.updateTrackRating(trackSrc, value);
    setStars(value);
  };

  return (
    <div>
      <Rating
        value={stars}
        onChange={handleRating}
        size={size}
      />
    </div>
  );
}

export default TrackRatingComponent;
