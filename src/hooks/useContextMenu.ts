import { useState, useCallback } from 'react';

/**
 * Generic hook for managing context menu state
 * AIDEV-NOTE: This hook manages position, visibility, and payload data for context menus
 * Used by TrackContextMenu, PlaylistContextMenu components
 */

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuState<T> {
  opened: boolean;
  position: ContextMenuPosition;
  data: T | null;
}

export interface ContextMenuActions<T> {
  open: (event: React.MouseEvent | MouseEvent, data: T) => void;
  close: () => void;
}

export function useContextMenu<T = unknown>(): ContextMenuState<T> & ContextMenuActions<T> {
  const [opened, setOpened] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((event: React.MouseEvent | MouseEvent, menuData: T) => {
    event.preventDefault();
    event.stopPropagation();
    setPosition({ x: event.clientX, y: event.clientY });
    setData(menuData);
    setOpened(true);
  }, []);

  const close = useCallback(() => {
    setOpened(false);
  }, []);

  return {
    opened,
    position,
    data,
    open,
    close,
  };
}
