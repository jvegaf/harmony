import { Group, Text, rem } from '@mantine/core';
import { IconUpload, IconMusic, IconX } from '@tabler/icons-react';
import { Dropzone, DropzoneProps, FileWithPath } from '@mantine/dropzone';
import classes from './Onboarding.module.css';
import '@mantine/dropzone/styles.css';

export interface OnboardingProps {
  openHandler: () => void;
  dragHandler: (files: FileWithPath[]) => void;
  dropzoneProps?: DropzoneProps;
}

export default function Onboarding({ openHandler, dragHandler, ...props }: OnboardingProps) {
  return (
    <div className={classes.onboardingRoot}>
      <Dropzone
        onDrop={files => dragHandler(files)}
        onReject={files => console.log('rejected files', files)}
        accept={{ 'audio/*': [] }}
        onClick={openHandler}
        {...props}
      >
        <Group
          justify='center'
          gap='xl'
          mih={420}
          miw={820}
          style={{ pointerEvents: 'none' }}
        >
          <Dropzone.Accept>
            <IconUpload
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconMusic
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
              stroke={1.5}
            />
          </Dropzone.Idle>

          <div>
            <Text
              size='xl'
              inline
            >
              Drag music files here or click to select a folder
            </Text>
          </div>
        </Group>
      </Dropzone>{' '}
    </div>
  );
}
