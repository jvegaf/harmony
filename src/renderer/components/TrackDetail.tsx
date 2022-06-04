/* eslint-disable no-console */
/* eslint-disable react/jsx-props-no-spreading */
import { Button, Center, Container, createStyles, Grid, Group, Image, Space, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/hooks';
import React from 'react';
import Placeholder from '../../../assets/placeholder.png';
import { Track } from '../../shared/types/emusik';

interface TrackDetailProps {
    track: Track;
    endCB: () => void;
}

const useStyles = createStyles((theme) => ({
    detail: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    },
    actionButton: {
        marginRight: 30,
        paddingLeft: 20,
        paddingRight: 20,
    },
}));

const TrackDetail: React.FC<TrackDetailProps> = (props) => {
    const { track, endCB } = props;
    const form = useForm({
        initialValues: {
            title: track.title,
            artist: track.artist,
            album: track.album,
            genre: track.genre,
            bpm: track.bpm,
            key: track.key,
            year: track.year,
            artwork: track.artwork,
        },
    });

    const { classes } = useStyles();

    const getArtData = (artwork) => {
        console.log(artwork);

        const blob = new Blob([artwork.imageBuffer], {
            type: artwork.mime,
        });
        return URL.createObjectURL(blob);
    };

    const onCancel = () => endCB();

    const onSave = (values) => console.log(values);

    return (
        <Container size="sm" style={{ marginTop: 50 }}>
            <form onSubmit={form.onSubmit((values) => onSave(values))}>
                <Stack spacing="xl">
                    <TextInput size="md" label="Title" {...form.getInputProps('title')} />
                    <TextInput size="md" label="Artist" {...form.getInputProps('artist')} />
                    <TextInput size="md" label="Album" {...form.getInputProps('album')} />
                    <Grid columns={24} gutter="lg">
                        <Grid.Col span={12}>
                            <Center>
                                {track.artwork === undefined && (
                                    <Image src={Placeholder} radius="md" width={250} height={250} />
                                )}
                                {track.artwork !== undefined && (
                                    <Image src={getArtData(track.artwork)} radius="md" width={250} height={250} />
                                )}
                            </Center>
                        </Grid.Col>
                        <Grid.Col span={12}>
                            <TextInput size="md" label="Genre" {...form.getInputProps('genre')} />
                            <Space h="md" />
                            <Group grow>
                                <TextInput value={track.time} size="md" label="Time" readOnly />
                                <TextInput size="md" label="BPM" {...form.getInputProps('bpm')} />
                            </Group>
                            <Space h="md" />
                            <Group grow>
                                <TextInput size="md" label="Year" {...form.getInputProps('year')} />
                                <TextInput size="md" label="Key" {...form.getInputProps('key')} />
                            </Group>
                        </Grid.Col>
                    </Grid>
                    <Group position="right" mt="md">
                        <Button className={classes.actionButton} type="submit" variant="default">
                            Save
                        </Button>
                        <Button className={classes.actionButton} variant="default" onClick={onCancel}>
                            Cancel
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Container>
    );
};

export default TrackDetail;
