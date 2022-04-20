import React from 'react';
import { createStyles } from '@mantine/core';

const useStyles = createStyles((theme) => ({
  component: {
    width: '100%',
    height: '100%',
    flexGrow: 1,
    backgroundColor: '#222222',
  },
}));

const NoDataBody: React.FC = () => {
  return (
    <div className="component">
      <div>No Data</div>
    </div>
  );
};

export default NoDataBody;
