import React, { useContext } from 'react';
import { Button, createStyles, Header } from '@mantine/core';
import { GlobalContext } from '../context/App/GlobalContext';

const useStyles = createStyles((theme) => ({
  header: {
    backgroundColor: '#222222',
    borderBottom: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    paddingLeft: 50,
    alignItems: 'center',
  },
}));

// interface HeaderSearchProps {
//   links: {
//     link: string;
//     label: string;
//     links: { link: string; label: string }[];
//   }[];
// }

// const AppHeader = ({ links }: HeaderSearchProps) => {
const AppHeader: React.FC = () => {
  const { classes } = useStyles();

  const { openFolder } = useContext(GlobalContext);

  const openHandler = () => openFolder();

  return (
    <Header height={70} className={classes.header}>
      <Button onClick={openHandler} variant="default">
        Open Folder
      </Button>
    </Header>
  );
};

export default AppHeader;
