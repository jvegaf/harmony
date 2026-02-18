import { v4 as uuidv4 } from 'uuid';

// Random UUID generation for playlists, folders, etc.
// This file is imported by both main process and renderer, so it must be browser-compatible.
// Uses only `uuid` library (works in browser), NO Node.js crypto module.
//
// For track ID generation (which requires Node.js crypto), see:
// src/main/lib/track-id.ts (main process only)
const makeID = (): string => uuidv4().replace(/-/g, '').toUpperCase().slice(-16);

export default makeID;
