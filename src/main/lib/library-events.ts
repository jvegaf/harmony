/**
 * Library Events Bus
 *
 * AIDEV-NOTE: Simple event bus for library change notifications.
 * Used to decouple library change detection from auto-sync triggers.
 * Modules can emit 'library-changed' events and IPCTraktorModule
 * subscribes to trigger auto-sync.
 */

import { EventEmitter } from 'events';

type LibraryEventType = 'tracks-added' | 'tracks-removed' | 'tracks-updated' | 'playlists-changed';

interface LibraryEvent {
  type: LibraryEventType;
  count?: number;
}

class LibraryEventBus extends EventEmitter {
  emit(event: 'library-changed', payload: LibraryEvent): boolean {
    return super.emit(event, payload);
  }

  on(event: 'library-changed', listener: (payload: LibraryEvent) => void): this {
    return super.on(event, listener);
  }

  off(event: 'library-changed', listener: (payload: LibraryEvent) => void): this {
    return super.off(event, listener);
  }
}

// Singleton instance
export const libraryEventBus = new LibraryEventBus();

/**
 * Convenience function to emit library change event
 */
export function emitLibraryChanged(type: LibraryEventType, count?: number): void {
  libraryEventBus.emit('library-changed', { type, count });
}
