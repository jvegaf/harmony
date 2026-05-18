import type React from 'react';
import { isCtrlKey } from './utils-events';

/**
 * Parses a React.KeyboardEvent or native KeyboardEvent into a normalized shortcut string.
 * Example outputs: "ctrl+shift+a", "escape", " ", "arrowleft"
 */
export function parseKeyEvent(e: React.KeyboardEvent | KeyboardEvent): string {
  const parts: string[] = [];

  if (isCtrlKey(e)) {
    parts.push('ctrl');
  }

  if (e.altKey) {
    parts.push('alt');
  }

  if (e.shiftKey) {
    parts.push('shift');
  }

  const key = e.key.toLowerCase();

  // Ignore modifier keys themselves as the final key
  if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
    parts.push(key);
  }

  return parts.join('+');
}

/**
 * Formats a shortcut string for display in the UI.
 * Examples: "ctrl+shift+a" -> "Ctrl + Shift + A", " " -> "Space"
 */
export function formatShortcutDisplay(shortcut: string): string {
  if (!shortcut) return 'Unassigned';

  const parts = shortcut.split('+');
  const formattedParts = parts.map(part => {
    if (part === ' ') return 'Space';
    if (part === 'arrowleft') return 'Left Arrow';
    if (part === 'arrowright') return 'Right Arrow';
    if (part === 'arrowup') return 'Up Arrow';
    if (part === 'arrowdown') return 'Down Arrow';
    if (part === 'escape') return 'Esc';

    return part.charAt(0).toUpperCase() + part.slice(1);
  });

  return formattedParts.join(' + ');
}
