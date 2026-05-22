import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import SettingsUI from './SettingsUI';

describe('SettingsUI', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock response for config.get
    window.Main.config.get = vi.fn().mockImplementation(async (key: string) => {
      if (key === 'theme') return 'dark';
      return null;
    });

    window.Main.config.set = vi.fn().mockResolvedValue(undefined);
  });

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<MantineProvider>{ui}</MantineProvider>);
  };

  it('loads and displays theme settings on mount', async () => {
    renderWithTheme(<SettingsUI />);

    await waitFor(() => {
      expect(window.Main.config.get).toHaveBeenCalledWith('theme');
    });
  });
});
