import { Menu, Header, Button } from 'grommet';
import React from 'react';

const AppHeader = () => {
  return (
    <Header background="brand">
      <Button hoverIndicator />
      <Menu label="account" items={[{ label: 'logout' }]} />
    </Header>
  );
};

export default AppHeader;