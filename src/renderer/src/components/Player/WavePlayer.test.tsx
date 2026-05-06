import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import WavePlayer from './WavePlayer';
import usePlayerStore from '../../stores/usePlayerStore';
import { useWavesurfer } from '../../hooks/useWavesurfer';

// Mock all external hooks/stores
vi.mock('../../stores/usePlayerStore');
vi.mock('../../hooks/useWavesurfer');
vi.mock('@mantine/core', () => ({
  useMantineColorScheme: () => ({ colorScheme: 'dark' })
}));

// Mock canvas for happy-dom
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  })),
  beginPath: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn()
})) as any;

describe('WavePlayer - PreCuePosition', () => {
  let mockWavesurfer: any;

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup wavesurfer mock
    mockWavesurfer = {
      on: vi.fn(() => vi.fn()),
      un: vi.fn(),
      once: vi.fn(() => vi.fn()),
      play: vi.fn(),
      pause: vi.fn(),
      skip: vi.fn(),
      setTime: vi.fn(),
      setVolume: vi.fn(),
    };

    (useWavesurfer as any).mockReturnValue(mockWavesurfer);

    // Setup player store mock (default state)
    (usePlayerStore as any).mockReturnValue({
      position: 0,
      playingTrack: { id: 'test-123', path: '/test.mp3' },
      playerStatus: 'play',
      isPreCueing: false,
      isPruneMode: false,
      volume: 1,
      isMuted: false,
      audioPreCuePosition: 120
    });

    // Mock window API
    (window as any).Main = {
      library: { parseUri: (path: string) => `file://${path}` }
    };
  });

  it('does NOT set time when track is ready if pre-cue is disabled', () => {
    const config = { audioPreCuePosition: 90 } as any;
    render(<WavePlayer config={config} />);

    // Trigger ready event
    const readyCall = mockWavesurfer.on.mock.calls.find((call: any) => call[0] === 'ready');
    expect(readyCall).toBeDefined();
    
    // Call the ready handler
    readyCall[1]();
    
    // setTime should NOT have been called
    expect(mockWavesurfer.setTime).not.toHaveBeenCalled();
  });

  it('jumps to audioPreCuePosition when track is ready if pre-cue is enabled', () => {
    (usePlayerStore as any).mockReturnValue({
      position: 0,
      playingTrack: { id: 'test-123', path: '/test.mp3' },
      playerStatus: 'play',
      isPreCueing: true, // Enable pre-cueing
      isPruneMode: false,
      volume: 1,
      isMuted: false,
      audioPreCuePosition: 90
    });

    const config = { audioPreCuePosition: 90 } as any;
    render(<WavePlayer config={config} />);

    // Trigger ready event
    const readyCall = mockWavesurfer.on.mock.calls.find((call: any) => call[0] === 'ready');
    expect(readyCall).toBeDefined();
    
    // Call the ready handler
    readyCall[1]();
    
    // It should seek exactly to the pre-cue position
    expect(mockWavesurfer.setTime).toHaveBeenCalledWith(90);
    // It should NOT use skip
    expect(mockWavesurfer.skip).not.toHaveBeenCalledWith(90);
  });

  it('unsubscribes from ready event on unmount', () => {
    const config = { audioPreCuePosition: 90 } as any;
    const { unmount } = render(<WavePlayer config={config} />);
    
    unmount();
    
    const unCall = mockWavesurfer.un.mock.calls.find((call: any) => call[0] === 'ready');
    expect(unCall).toBeDefined();
  });
});
