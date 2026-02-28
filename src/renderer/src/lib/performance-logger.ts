/**
 * Performance logging utility for drag & drop operations
 * Logs detailed timestamps and exports to CSV for analysis
 */

import { logger } from './tauri-api';

export interface PerfMeasurement {
  timestamp: number;
  label: string;
  duration: number;
  cumulative: number;
  metadata?: Record<string, any>;
}

interface PerformanceSession {
  sessionId: string;
  sessionStart: number;
  measurements: PerfMeasurement[];
  totalDuration: number;
}

class PerformanceLogger {
  private measurements: PerfMeasurement[] = [];
  private sessionStart: number = 0;
  private sessionId: string = '';
  private enabled: boolean = true;

  constructor() {
    // Check if performance logging is enabled via localStorage
    const debugMode = localStorage.getItem('drag-perf-enabled');
    this.enabled = debugMode !== 'false'; // Enabled by default
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('drag-perf-enabled', enabled ? 'true' : 'false');

    logger.info(`[DRAG-PERF] Performance logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  startSession(id: string): void {
    if (!this.enabled) return;

    this.sessionId = id;
    this.sessionStart = performance.now();
    this.measurements = [];

    logger.info(`[DRAG-PERF] ========== SESSION START: ${id} ==========`);
  }

  measure(label: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const now = performance.now();
    const cumulative = now - this.sessionStart;
    const duration =
      this.measurements.length > 0
        ? cumulative - this.measurements[this.measurements.length - 1].cumulative
        : cumulative;

    const measurement: PerfMeasurement = {
      timestamp: now,
      label,
      duration,
      cumulative,
      metadata,
    };

    this.measurements.push(measurement);

    const metaStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
    logger.info(`[DRAG-PERF] ${label} | +${duration.toFixed(2)}ms | Total: ${cumulative.toFixed(2)}ms${metaStr}`);
  }

  endSession(): void {
    if (!this.enabled) return;

    const totalDuration = performance.now() - this.sessionStart;

    logger.info(
      `[DRAG-PERF] ========== SESSION END: ${this.sessionId} | TOTAL: ${totalDuration.toFixed(2)}ms ==========`,
    );

    // Export to CSV
    this.exportToCSV();

    // Save to localStorage
    this.saveToLocalStorage();
  }

  private exportToCSV(): void {
    if (this.measurements.length === 0) return;

    const headers = ['Session ID', 'Label', 'Duration (ms)', 'Cumulative (ms)', 'Metadata'];
    const rows = this.measurements.map(m => [
      this.sessionId,
      m.label,
      m.duration.toFixed(2),
      m.cumulative.toFixed(2),
      m.metadata ? JSON.stringify(m.metadata) : '',
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

    // Log CSV to console for easy copy-paste
    logger.info('[DRAG-PERF] CSV Export (single session):');
    logger.info(csv);
  }

  private saveToLocalStorage(): void {
    try {
      const existingData = localStorage.getItem('drag-perf-history');
      const history: PerformanceSession[] = existingData ? JSON.parse(existingData) : [];

      history.push({
        sessionId: this.sessionId,
        sessionStart: this.sessionStart,
        measurements: this.measurements,
        totalDuration: this.measurements[this.measurements.length - 1]?.cumulative || 0,
      });

      // Keep only last 50 sessions
      if (history.length > 50) {
        history.shift();
      }

      localStorage.setItem('drag-perf-history', JSON.stringify(history));
    } catch (error) {
      logger.warn('[DRAG-PERF] Failed to save to localStorage:', error);
    }
  }

  // Utility to export all history to CSV
  exportAllHistory(): string {
    const existingData = localStorage.getItem('drag-perf-history');
    if (!existingData) {
      logger.info('[DRAG-PERF] No history available');
      return '';
    }

    const history: PerformanceSession[] = JSON.parse(existingData);
    const headers = ['Session ID', 'Label', 'Duration (ms)', 'Cumulative (ms)', 'Total Session (ms)', 'Metadata'];

    const allRows: string[][] = [];

    history.forEach(session => {
      session.measurements.forEach(m => {
        allRows.push([
          session.sessionId,
          m.label,
          m.duration.toFixed(2),
          m.cumulative.toFixed(2),
          session.totalDuration.toFixed(2),
          m.metadata ? JSON.stringify(m.metadata) : '',
        ]);
      });
    });

    const csv = [headers.join(','), ...allRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

    logger.info(`[DRAG-PERF] Exporting ${history.length} sessions with ${allRows.length} measurements`);
    logger.info('[DRAG-PERF] CSV Export (all history):');
    logger.info(csv);

    return csv;
  }

  getHistorySummary(): void {
    const existingData = localStorage.getItem('drag-perf-history');
    if (!existingData) {
      logger.info('[DRAG-PERF] No history available');
      return;
    }

    const history: PerformanceSession[] = JSON.parse(existingData);

    logger.info(`[DRAG-PERF] ========== HISTORY SUMMARY ==========`);
    logger.info(`Total sessions: ${history.length}`);

    const durations = history.map(s => s.totalDuration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    logger.info(`Average total lag: ${avg.toFixed(2)}ms`);
    logger.info(`Min lag: ${min.toFixed(2)}ms`);
    logger.info(`Max lag: ${max.toFixed(2)}ms`);
    logger.info(`[DRAG-PERF] ====================================`);
  }

  clearHistory(): void {
    localStorage.removeItem('drag-perf-history');
    logger.info('[DRAG-PERF] History cleared');
  }

  // Async download CSV file
  async downloadCSV(filename: string = `drag-perf-${new Date().toISOString().split('T')[0]}.csv`): Promise<void> {
    const csv = this.exportAllHistory();
    if (!csv) {
      logger.warn('[DRAG-PERF] No data to download');
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);

    logger.info(`[DRAG-PERF] Downloaded CSV file: ${filename}`);
  }
}

// Singleton instance
export const perfLogger = new PerformanceLogger();

// Global functions for easy console access
(window as any).__exportDragPerfHistory = () => {
  const csv = perfLogger.exportAllHistory();
  return csv;
};

(window as any).__clearDragPerfHistory = () => {
  perfLogger.clearHistory();
};

(window as any).__dragPerfSummary = () => {
  perfLogger.getHistorySummary();
};

(window as any).__dragPerfDownload = (filename?: string) => {
  perfLogger.downloadCSV(filename);
};

(window as any).__dragPerfEnable = () => {
  perfLogger.setEnabled(true);
};

(window as any).__dragPerfDisable = () => {
  perfLogger.setEnabled(false);
};

// Log available commands on load
logger.info('[DRAG-PERF] Performance logger initialized. Console commands available:');
logger.info('[DRAG-PERF]   __exportDragPerfHistory() - Export all history to CSV (console)');
logger.info('[DRAG-PERF]   __dragPerfDownload(filename?) - Download CSV file');
logger.info('[DRAG-PERF]   __dragPerfSummary() - Show statistics summary');
logger.info('[DRAG-PERF]   __clearDragPerfHistory() - Clear all history');
logger.info('[DRAG-PERF]   __dragPerfEnable() - Enable performance logging');
logger.info('[DRAG-PERF]   __dragPerfDisable() - Disable performance logging');
