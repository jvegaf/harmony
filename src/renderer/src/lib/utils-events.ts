export const isLeftClick = (e: React.MouseEvent): boolean => e.button === 0;
export const isRightClick = (e: React.MouseEvent): boolean => e.button === 2;

/**
 * Stop the propagation of an event
 */
export function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/**
 * Prevent the default behavior of an event
 */
export function preventNativeDefault(e: Event) {
  e.preventDefault();
}

/**
 * Returns true if
 * - the control key was pressed on a non-mac platform
 * - the cmd key is pressed on macOS
 */
export function isCtrlKey(e: React.KeyboardEvent | React.MouseEvent | KeyboardEvent): boolean {
  return e.ctrlKey;
}

export function isAltKey(e: React.KeyboardEvent | React.MouseEvent | KeyboardEvent): boolean {
  return e.metaKey;
}
