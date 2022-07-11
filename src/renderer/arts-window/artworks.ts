import { ArtsTrackDTO } from 'shared/types/emusik';

const container = document.getElementById('arts-container') as HTMLDivElement;

// const saveAction = (url: string) => window.Main.SaveArtwork(url);

window.Main.on('dto', (artsDTO: ArtsTrackDTO) => {
  const { reqTrack, artsUrls } = artsDTO;
  artsUrls.forEach((artUrl: string) => {
    const image = new Image(250, 250);
    image.src = artUrl;
    image.onclick = () => window.Main.SaveArtwork({ reqTrack, selectedArtUrl: artUrl });

    container.appendChild(image);
  });
});

export {};
