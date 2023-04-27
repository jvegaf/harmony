import React from 'react';
import useAppState from 'renderer/hooks/useAppState';

const ArtsFinderView = () => {
  const { artsFetched } = useAppState();
  const [imgURLs, setImgURLs] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (artsFetched !== null) {
      const { artsUrls } = artsFetched;
      setImgURLs(artsUrls);
    }

    return () => setImgURLs([]);
  }, [artsFetched]);

  return <h1>Arts Finder</h1>;
};

export default ArtsFinderView;
