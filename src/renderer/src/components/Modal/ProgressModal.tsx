import { useEffect } from 'react';
import { Modal, Text, Progress, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import useLibraryStore from '../../stores/useLibraryStore';

function ProgressModal() {
  const { fixing, fix } = useLibraryStore();
  const { processed, total } = fix;

  return (
    <div>
      <Modal
        opened={fixing}
        onClose={close}
        title='Fixing tracks'
        centered
      >
        <Stack
          align='stretch'
          justify='center'
        >
          <Text ta='center'>
            Fixed {processed} tracks of {total}
          </Text>
          <Progress value={(processed / total) * 100} />
        </Stack>
      </Modal>
    </div>
  );
}

export default ProgressModal;
