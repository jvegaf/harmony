import * as NodeId3 from 'node-id3';
import log from 'electron-log';

/**
 * AIDEV-NOTE: Wrapper around NodeID3.Promise.update() that sanitizes existing tags
 * before writing to prevent crashes caused by malformed ID3 frames.
 *
 * node-id3@0.2.9 has a bug where `update()` reads existing tags, merges new ones,
 * and re-writes all frames. If a file contains a UFID frame with a missing `identifier`
 * field, the library crashes with:
 *   ERR_INVALID_ARG_TYPE: Buffer.from(undefined)
 *
 * This function reads existing tags first, removes problematic frames, then writes
 * the sanitized + updated tags back.
 */
export async function safeId3Update(tags: NodeId3.Tags, filePath: string): Promise<void> {
  const existingTags = NodeId3.read(filePath) as NodeId3.Tags;

  // Sanitize UFID frames: remove entries with missing identifier
  if (existingTags.uniqueFileIdentifier) {
    existingTags.uniqueFileIdentifier = existingTags.uniqueFileIdentifier.filter(ufid => {
      if (!ufid.identifier) {
        log.warn(`Removed malformed UFID frame (missing identifier) in: ${filePath}`);
        return false;
      }
      return true;
    });
    if (existingTags.uniqueFileIdentifier.length === 0) {
      delete existingTags.uniqueFileIdentifier;
    }
  }

  const mergedTags = { ...existingTags, ...tags };
  await NodeId3.Promise.write(mergedTags, filePath);
}
