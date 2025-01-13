import { Rating } from '@mantine/core';
import { useEffect, useState } from 'react';
import { TrackRating } from 'src/preload/types/emusik';

type Props = {
  rating: TrackRating;
};

function TrackRatingComponent({ rating }: Props) {
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (!rating) {
      return;
    }
    const result = (rating.rating * 100) / 5;
    setStars(result);
  }, [rating]);

  return (
    <div>
      <Rating value={stars} />
    </div>
  );
}

export default TrackRatingComponent;
