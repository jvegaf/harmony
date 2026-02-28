/**
 * Modal de progreso genérico
 *
 * Muestra una barra de progreso con título, mensaje y estadísticas.
 * Se usa para búsqueda de candidatos y aplicación de tags.
 */

import { Loader2, Search, Tags } from 'lucide-react';
import styles from './ProgressModal.module.css';

interface ProgressModalProps {
  /** Título del modal */
  title: string;
  /** Mensaje descriptivo */
  message?: string;
  /** Número de items procesados */
  processed: number;
  /** Total de items a procesar */
  total: number;
  /** Tipo de operación (para elegir el ícono) */
  type?: 'search' | 'apply';
}

/**
 * Modal de progreso con barra y porcentaje
 */
function ProgressModal({ title, message, processed, total, type = 'search' }: ProgressModalProps) {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  // Elegir ícono según el tipo
  const Icon = type === 'search' ? Search : Tags;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header con ícono */}
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <Icon className={styles.icon} />
          </div>
          <h2 className={styles.title}>{title}</h2>
          {message && <p className={styles.message}>{message}</p>}
        </div>

        {/* Barra de progreso */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Estadísticas */}
          <div className={styles.stats}>
            <span className={styles.percentage}>{percentage}%</span>
            <span className={styles.count}>
              {processed} / {total}
            </span>
          </div>
        </div>

        {/* Spinner */}
        <div className={styles.spinner}>
          <Loader2 className={styles.spinnerIcon} />
        </div>
      </div>
    </div>
  );
}

export default ProgressModal;
