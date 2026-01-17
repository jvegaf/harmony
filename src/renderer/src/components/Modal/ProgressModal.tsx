import { Modal, Text, Progress, Stack } from '@mantine/core';

type ProgressModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  processed: number;
  total: number;
};

function ProgressModal({ isOpen, title, message, processed, total }: ProgressModalProps) {
  return (
    <div>
      <Modal
        opened={isOpen}
        onClose={close}
        title={title}
        centered
      >
        <Stack
          align='stretch'
          justify='center'
        >
          <Text ta='center'>
            {message} ({processed} / {total})
          </Text>
          <Progress value={(processed / total) * 100} />
        </Stack>
      </Modal>
    </div>
  );
}

export default ProgressModal;
