/**
 * Modal for confirming library changes (new files and removed tracks)
 *
 * Shows a summary of detected changes with expandable lists and
 * allows user to apply or cancel the changes.
 */

import { FolderPlus, FolderMinus, Check } from 'lucide-react';
import { Collapse, Button } from '@mantine/core';
import { useState } from 'react';
import type { LibraryChanges } from '@renderer/types/harmony';
import styles from './LibraryChangesModal.module.css';

interface LibraryChangesModalProps {
  /** Detected changes from library check */
  changes: LibraryChanges;
  /** Callback when user confirms to apply changes */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Modal showing detected library changes
 */
function LibraryChangesModal({ changes, onConfirm, onCancel }: LibraryChangesModalProps) {
  const [showAdded, setShowAdded] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);

  const hasChanges = changes.added.length > 0 || changes.removed.length > 0;

  // Extract just filename for cleaner display
  const getFileName = (path: string) => {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            {hasChanges ? <FolderPlus className={styles.icon} /> : <Check className={styles.icon} />}
          </div>
          <h2 className={styles.title}>{hasChanges ? 'Collection Changes Detected' : 'Collection Up to Date'}</h2>
          {hasChanges && <p className={styles.message}>Review and apply the detected changes to your library</p>}
          {!hasChanges && <p className={styles.message}>No changes detected in your music collection</p>}
        </div>

        {/* Changes sections */}
        {hasChanges && (
          <div className={styles.changesContainer}>
            {/* New tracks section */}
            {changes.added.length > 0 && (
              <div className={styles.section}>
                <button
                  className={styles.sectionHeader}
                  onClick={() => setShowAdded(!showAdded)}
                  type='button'
                >
                  <FolderPlus className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>New tracks found</span>
                  <span className={styles.badge}>{changes.added.length}</span>
                  <span className={styles.expandIcon}>{showAdded ? '▼' : '▶'}</span>
                </button>

                <Collapse in={showAdded}>
                  <div className={styles.list}>
                    {changes.added.map((path, index) => (
                      <div
                        key={index}
                        className={styles.listItem}
                      >
                        <span className={styles.fileName}>{getFileName(path)}</span>
                        <span className={styles.filePath}>{path}</span>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </div>
            )}

            {/* Removed tracks section */}
            {changes.removed.length > 0 && (
              <div className={styles.section}>
                <button
                  className={styles.sectionHeader}
                  onClick={() => setShowRemoved(!showRemoved)}
                  type='button'
                >
                  <FolderMinus className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Tracks no longer exist</span>
                  <span className={styles.badge}>{changes.removed.length}</span>
                  <span className={styles.expandIcon}>{showRemoved ? '▼' : '▶'}</span>
                </button>

                <Collapse in={showRemoved}>
                  <div className={styles.list}>
                    {changes.removed.map(track => (
                      <div
                        key={track.id}
                        className={styles.listItem}
                      >
                        <span className={styles.trackTitle}>
                          {track.artist ? `${track.artist} - ${track.title}` : track.title}
                        </span>
                        <span className={styles.filePath}>{track.path}</span>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {hasChanges ? (
            <>
              <Button
                variant='default'
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                variant='filled'
                onClick={onConfirm}
              >
                Apply Changes
              </Button>
            </>
          ) : (
            <Button
              variant='filled'
              onClick={onCancel}
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LibraryChangesModal;
