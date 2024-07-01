import React, { useState } from 'react';
import styled from 'styled-components';

type SongData = {
  name: string;
  artist: string;
  album: string;
  dateAdded: string;
  duration: string;
};

const songData: SongData[] = [
  {
    name: 'Meditation - beautiful comm..',
    artist: 'Monoman',
    album: 'Meditation',
    dateAdded: '2020-05-27',
    duration: '3:55',
  },
  {
    name: 'Meditation - beautiful comm..',
    artist: 'Monoman',
    album: 'Meditation',
    dateAdded: '2020-05-27',
    duration: '3:55',
  },
  {
    name: 'Meditation - beautiful comm..',
    artist: 'Monoman',
    album: 'Meditation',
    dateAdded: '2020-05-27',
    duration: '3:55',
  },
  {
    name: 'Meditation - beautiful comm..',
    artist: 'Monoman',
    album: 'Meditation',
    dateAdded: '2020-05-27',
    duration: '3:55',
  },
  {
    name: 'Meditation - beautiful comm..',
    artist: 'Monoman',
    album: 'Meditation',
    dateAdded: '2020-05-27',
    duration: '3:55',
  },
  {
    name: 'Meditation - beautiful comm..',
    artist: 'Monoman',
    album: 'Meditation',
    dateAdded: '2020-05-27',
    duration: '3:55',
  },
  {
    name: 'Meditation - beautiful comm..',
    artist: 'Monoman',
    album: 'Meditation',
    dateAdded: '2020-05-27',
    duration: '3:55',
  },
  {
    name: 'Meditation - beautiful comm..',
    artist: 'Monoman',
    album: 'Meditation',
    dateAdded: '2020-05-27',
    duration: '3:55',
  },
  {
    name: 'Meditation - beautiful comm..',
    artist: 'Monoman',
    album: 'Meditation',
    dateAdded: '2020-05-27',
    duration: '3:55',
  },
];

type PlaylistHeaderProps = {
  title: string;
  composer: string;
};

const PlaylistHeader: React.FC<PlaylistHeaderProps> = ({ title, composer }) => (
  <PlaylistHeaderWrapper>
    <PlaylistImage
      src='http://b.io/ext_15-'
      alt='Playlist cover'
    />
    <PlaylistInfo>
      <PlaylistType>PLEYLIST</PlaylistType>
      <PlaylistTitle>{title}</PlaylistTitle>
      <PlaylistComposer>
        Kompozitor <span>{composer}</span>
      </PlaylistComposer>
    </PlaylistInfo>
  </PlaylistHeaderWrapper>
);

type SongRowProps = {
  song: SongData;
  index: number;
  onSelect: (index: number) => void;
  isSelected: boolean;
};

const SongRow: React.FC<SongRowProps> = ({ song, index, onSelect, isSelected }) => (
  <SongRowWrapper
    onClick={() => onSelect(index)}
    isSelected={isSelected}
  >
    <SongName>{song.name}</SongName>
    <SongArtist>{song.artist}</SongArtist>
    <SongAlbum>{song.album}</SongAlbum>
    <SongDateAdded>{song.dateAdded}</SongDateAdded>
    <SongDuration>{song.duration}</SongDuration>
  </SongRowWrapper>
);

type MusicPlayerProps = {
  currentSong: SongData | null;
};

const MusicPlayer: React.FC<MusicPlayerProps> = ({ currentSong }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <PlayerWrapper>
      <SongInfo>
        <SongTitle>{currentSong?.name || 'No song selected'}</SongTitle>
        <SongMood>Cool</SongMood>
      </SongInfo>
      <PlayerControls>
        <ControlButton
          src='http://b.io/ext_16-'
          alt='Previous'
        />
        <ControlButton
          src={isPlaying ? 'http://b.io/ext_26-' : 'http://b.io/ext_17-'}
          alt={isPlaying ? 'Pause' : 'Play'}
          onClick={togglePlay}
        />
        <ControlButton
          src='http://b.io/ext_18-'
          alt='Next'
        />
      </PlayerControls>
      <ProgressBar>
        <Progress />
      </ProgressBar>
      <TimeInfo>
        <CurrentTime>2:15</CurrentTime>
        <TotalTime>{currentSong?.duration || '0:00'}</TotalTime>
      </TimeInfo>
    </PlayerWrapper>
  );
};

const App: React.FC = () => {
  const [selectedSongIndex, setSelectedSongIndex] = useState<number | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleSongSelect = (index: number) => {
    setSelectedSongIndex(index);
  };

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  return (
    <AppWrapper>
      <Sidebar isOpen={isNavOpen}>
        <Logo
          src='http://b.io/ext_19-'
          alt='Logo'
        />
        <NavItem>
          <NavIcon
            src='http://b.io/ext_20-'
            alt='Home'
          />
          <NavText>ASOSIY</NavText>
        </NavItem>
        <NavItem>
          <NavIcon
            src='http://b.io/ext_21-'
            alt='Open Song'
          />
          <NavText>QO'SHIQNI OCHISH</NavText>
        </NavItem>
        <NavItem onClick={toggleNav}>
          <NavText>Kutubxona</NavText>
          <NavArrow
            src='http://b.io/ext_22-'
            alt='Expand'
            isOpen={isNavOpen}
          />
        </NavItem>
        <NavItem onClick={toggleNav}>
          <NavText>Pleylistlar</NavText>
          <NavArrow
            src='http://b.io/ext_23-'
            alt='Expand'
            isOpen={isNavOpen}
          />
        </NavItem>
        {isNavOpen && (
          <>
            <PlaylistItem>Nostalgiya</PlaylistItem>
            <PlaylistItem>Retro 80</PlaylistItem>
            <PlaylistItem>Hip Hop</PlaylistItem>
            <PlaylistItem>Gangsta</PlaylistItem>
          </>
        )}
        <NavItem onClick={toggleNav}>
          <NavText>Arxivlangan</NavText>
          <NavArrow
            src='http://b.io/ext_23-'
            alt='Expand'
            isOpen={isNavOpen}
          />
        </NavItem>
        {isNavOpen && (
          <>
            <PlaylistItem>Konsta</PlaylistItem>
            <PlaylistItem>Sherali Jo'rayev</PlaylistItem>
          </>
        )}
        <NavItem>
          <NavText>Yangi Pleylist yaratish</NavText>
          <NavIcon
            src='http://b.io/ext_24-'
            alt='Create'
          />
        </NavItem>
        <SidebarImage
          src='http://b.io/ext_25-'
          alt='Sidebar image'
        />
      </Sidebar>
      <MainContent>
        <PlaylistHeader
          title='Moonlight Sonata 🔥'
          composer='BETHOVEN'
        />
        <SongList>
          <SongListHeader>
            <HeaderItem>Nomi</HeaderItem>
            <HeaderItem>Artist</HeaderItem>
            <HeaderItem>Albom</HeaderItem>
            <HeaderItem>Qo'shilgan</HeaderItem>
            <HeaderItem>Davomiyligi</HeaderItem>
          </SongListHeader>
          {songData.map((song, index) => (
            <SongRow
              key={index}
              song={song}
              index={index}
              onSelect={handleSongSelect}
              isSelected={index === selectedSongIndex}
            />
          ))}
        </SongList>
      </MainContent>
      <MusicPlayer currentSong={selectedSongIndex !== null ? songData[selectedSongIndex] : null} />
    </AppWrapper>
  );
};

const AppWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #10141f;
`;

const Sidebar = styled.nav<{ isOpen: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 32px 41px 0;
  width: ${props => (props.isOpen ? '30%' : '23%')};
  transition: width 0.3s ease-in-out;
  @media (max-width: 991px) {
    width: 100%;
    padding: 32px 20px 0;
  }
`;

const Logo = styled.img`
  width: 34px;
  height: auto;
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  margin-top: 12px;
  color: #fff;
  font:
    400 16px Montserrat,
    sans-serif;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
`;

const NavIcon = styled.img`
  width: 24px;
  height: 24px;
  margin-right: 18px;
`;

const NavText = styled.span`
  flex-grow: 1;
`;

const NavArrow = styled.img<{ isOpen: boolean }>`
  width: 13px;
  height: 8px;
  transform: ${props => (props.isOpen ? 'rotate(180deg)' : 'rotate(0)')};
  transition: transform 0.3s ease-in-out;
`;

const PlaylistItem = styled.button`
  color: #909090;
  font:
    400 16px Montserrat,
    sans-serif;
  margin: 12px 0 0 11px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
`;

const SidebarImage = styled.img`
  width: 100%;
  margin-top: 12px;
`;

const MainContent = styled.main`
  flex-grow: 1;
  padding: 80px 69px 43px;
  @media (max-width: 991px) {
    padding: 40px 20px;
  }
`;

const PlaylistHeaderWrapper = styled.header`
  display: flex;
  gap: 20px;
`;

const PlaylistImage = styled.img`
  width: 198px;
  height: auto;
`;

const PlaylistInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const PlaylistType = styled.div`
  color: #747474;
  font:
    400 16px Montserrat,
    sans-serif;
`;

const PlaylistTitle = styled.h1`
  color: #fff;
  font:
    700 41px Montserrat,
    sans-serif;
  margin-top: 114px;
  @media (max-width: 991px) {
    margin-top: 40px;
  }
`;

const PlaylistComposer = styled.div`
  color: #b0b0b0;
  font:
    400 16px Montserrat,
    sans-serif;
  margin-top: 10px;
`;

const SongList = styled.section`
  margin-top: 8px;
`;

const SongListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  color: #909090;
  font:
    400 16px Montserrat,
    sans-serif;
  margin-bottom: 20px;
`;

const HeaderItem = styled.div`
  flex: 1;
`;

const SongRowWrapper = styled.button<{ isSelected: boolean }>`
  display: flex;
  justify-content: space-between;
  color: #fff;
  font:
    400 16px Montserrat,
    sans-serif;
  margin-bottom: 25px;
  background: ${props => (props.isSelected ? 'rgba(255, 255, 255, 0.1)' : 'none')};
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  transition: background-color 0.3s ease-in-out;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const SongName = styled.div`
  flex: 1;
`;

const SongArtist = styled.div`
  flex: 1;
`;

const SongAlbum = styled.div`
  flex: 1;
`;

const SongDateAdded = styled.div`
  flex: 1;
`;

const SongDuration = styled.div`
  flex: 1;
`;

const PlayerWrapper = styled.footer`
  display: flex;
  flex-direction: column;
  padding: 12px 41px 33px;
  @media (max-width: 991px) {
    padding: 12px 20px 33px;
  }
`;

const SongInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const SongTitle = styled.div`
  background: linear-gradient(90deg, #fff 88.54%, rgba(0, 0, 0, 0.22) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font:
    700 16px Montserrat,
    sans-serif;
`;

const SongMood = styled.div`
  color: #979797;
  font:
    700 12px Montserrat,
    sans-serif;
  margin-top: 13px;
`;

const PlayerControls = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
`;

const ControlButton = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 52.5px;
  cursor: pointer;
`;

const ProgressBar = styled.div`
  background-color: #303845;
  border-radius: 6px;
  height: 5px;
  margin-top: 13px;
`;

const Progress = styled.div`
  background: linear-gradient(90deg, #d2d2d2 0%, #928c7d 100%);
  border-radius: 6px;
  height: 100%;
  width: 50%;
`;

const TimeInfo = styled.div`
  display: flex;
  justify-content: space-between;
  color: #979797;
  font:
    700 12px Montserrat,
    sans-serif;
`;

const CurrentTime = styled.span`
  margin-top: 10px;
`;

const TotalTime = styled.span`
  margin-top: 10px;
`;

export default App;
