import { Rating } from '@mantine/core';
import { useEffect, useState } from 'react';
import { TrackRating } from 'src/preload/types/emusik';

type Props = {
  rating: TrackRating;
};

function rateParser(rating: number) {
  switch (true) {
    case rating > 0.8:
      return 5;
    case rating > 0.6:
      return 4;
    case rating > 0.4:
      return 3;
    case rating > 0.2:
      return 2;
    case rating > 0.1:
      return 1;
    default:
      return 0;
  }
}

function TrackRatingComponent({ rating }: Props) {
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (!rating) {
      return;
    }
    const result = rateParser(rating.rating);
    setStars(result);
  }, [rating]);

  return (
    <div>
      <Rating value={stars} />
    </div>
  );
}

export default TrackRatingComponent;
