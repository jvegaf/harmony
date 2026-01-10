import { IconChevronDown, IconPlus, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import styles from './CueSection.module.css';

export default function CueSection() {
  return (
    <div className={styles.cueSection}>
      <div className={styles.cueButtons}>
        <button
          type='button'
          className={styles.cueDropdown}
        >
          Cues
          <IconChevronDown size={16} />
        </button>
        <button
          type='button'
          className={styles.cueSlot}
        >
          <IconPlus size={16} />
        </button>
        <button
          type='button'
          className={styles.cueSlot}
        >
          <IconPlus size={16} />
        </button>
        <button
          type='button'
          className={styles.cueSlot}
        >
          <IconPlus size={16} />
        </button>
        <button
          type='button'
          className={styles.cueSlot}
        >
          <IconPlus size={16} />
        </button>
      </div>
      <div className={styles.cueControls}>
        <button
          type='button'
          className={styles.cueDropdown}
        >
          Default
          <IconChevronDown size={16} />
        </button>
        <div className={styles.beatSelector}>
          <button
            type='button'
            className={styles.beatButton}
          >
            <IconChevronLeft size={16} />
          </button>
          <span className={styles.beatValue}>4</span>
          <button
            type='button'
            className={styles.beatButton}
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
