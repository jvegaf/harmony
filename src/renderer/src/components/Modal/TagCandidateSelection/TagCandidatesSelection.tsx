/**
 * Modal de selección manual de matches de Beatport
 *
 * Muestra los candidatos encontrados en Beatport para cada track local,
 * permitiendo al usuario seleccionar el correcto o indicar que no está.
 */

import { useState, useMemo } from 'react';
import { X, Music, Clock, Check, AlertCircle, Disc, Calendar, FileAudio } from 'lucide-react';
import styles from './TagCandidateSelection.module.css';
import { TrackCandidate, TrackCandidatesResult, TrackSelection } from '@preload/types/tagger';

/**
 * Helper para combinar clases CSS
 */
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface TagsSelectionModalProps {
  /** Lista de tracks con sus candidatos de Beatport */
  trackCandidates: TrackCandidatesResult[];
  /** Callback cuando el usuario confirma la selección */
  onConfirm: (selections: TrackSelection[]) => void;
  /** Callback cuando el usuario cancela */
  onCancel: () => void;
  /** Indica si está procesando */
  isLoading?: boolean;
}

/**
 * Formatea la duración en segundos a formato MM:SS
 */
function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formatea fecha a formato DD/MM/YYYY
 * Soporta formatos: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SSZ, etc.
 */
function formatReleaseDate(dateStr: string | null): string {
  if (!dateStr) return '';

  // Extraer solo la parte de fecha (antes de T si existe)
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');

  if (parts.length !== 3) return dateStr;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/**
 * Devuelve el color de fondo según el score de similitud
 */
function getScoreColor(score: number): string {
  if (score >= 0.8) return styles.scoreHigh;
  if (score >= 0.5) return styles.scoreMedium;
  return styles.scoreLow;
}

/**
 * Compara duraciones y devuelve si son similares
 * @param localDuration Duración del track local en segundos
 * @param candidateDuration Duración del candidato en segundos
 * @param tolerance Tolerancia en segundos (default: 5)
 */
function isDurationMatch(
  localDuration: number | null | undefined,
  candidateDuration: number | null | undefined,
  tolerance = 5,
): boolean {
  if (
    localDuration === null ||
    localDuration === undefined ||
    candidateDuration === null ||
    candidateDuration === undefined
  ) {
    return false;
  }
  return Math.abs(localDuration - candidateDuration) <= tolerance;
}

/**
 * Componente para mostrar un candidato de track (Beatport o Traxsource)
 *
 *  Ahora soporta candidatos de múltiples providers
 */
function CandidateCard({
  candidate,
  isSelected,
  onSelect,
  localDuration,
}: {
  candidate: TrackCandidate;
  isSelected: boolean;
  onSelect: () => void;
  /** Duración del track local para comparar */
  localDuration?: number | null;
}) {
  const scorePercent = Math.round(candidate.similarity_score * 100);
  const durationMatches = isDurationMatch(localDuration, candidate.duration_secs);

  //  Determinar la fuente del candidato (beatport o traxsource)
  const providerSource = (candidate as any).source || 'beatport';

  return (
    <button
      type='button'
      onClick={onSelect}
      className={cn(styles.candidateCard, isSelected && styles.candidateCardSelected)}
    >
      {/* Indicador de selección */}
      {isSelected && (
        <div className={styles.candidateCheckmark}>
          <Check className={styles.checkmarkIcon} />
        </div>
      )}

      {/* Header con artwork y título */}
      <div className={styles.candidateContent}>
        {/* Artwork */}
        <div className={styles.artwork}>
          {candidate.artwork_url ? (
            <img
              src={candidate.artwork_url}
              alt={candidate.title}
              className={styles.artworkImage}
              loading='lazy'
            />
          ) : (
            <div className={styles.artworkPlaceholder}>
              <Disc className={styles.artworkIcon} />
            </div>
          )}
        </div>

        {/* Título y artista */}
        <div className={styles.candidateText}>
          <p
            className={styles.candidateTitle}
            title={candidate.title}
          >
            {candidate.title}
          </p>
          <p
            className={styles.candidateArtist}
            title={candidate.artists}
          >
            {candidate.artists}
          </p>
          {/* Mix name badge si no es Original Mix */}
          {candidate.mix_name && <span className={styles.mixBadge}>{candidate.mix_name}</span>}
        </div>
      </div>

      {/* Score badge */}
      <div className={cn(styles.scoreBadge, getScoreColor(candidate.similarity_score))}>
        {scorePercent}% match
        {providerSource === 'traxsource' && ' (TX)'}
      </div>

      {/* Info grid */}
      <div className={styles.infoGrid}>
        {/* Duración - con indicador de match */}
        {candidate.duration_secs && candidate.duration_secs > 0 ? (
          <div className={cn(styles.infoDuration, durationMatches && styles.infoDurationMatch)}>
            <Clock className={cn(styles.infoDurationIcon, durationMatches && styles.infoDurationIconMatch)} />
            <span>{formatDuration(candidate.duration_secs)}</span>
            {durationMatches && <Check className={styles.iconSmall} />}
          </div>
        ) : null}

        {/* BPM */}
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>BPM:</span>
          <span>{candidate.bpm ? Math.round(candidate.bpm) : '—'}</span>
        </div>

        {/* Key */}
        {candidate.key && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Key:</span>
            <span>{candidate.key}</span>
          </div>
        )}

        {/* Género */}
        {candidate.genre && (
          <div
            className={cn(styles.infoItem, styles.infoTruncate, !candidate.key && styles.infoColSpan2)}
            title={candidate.genre}
          >
            <span className={styles.infoLabel}>Genre:</span>
            <span className={styles.infoTruncateText}>{candidate.genre}</span>
          </div>
        )}

        {/* Release date */}
        {candidate.release_date && (
          <div className={cn(styles.infoItem, styles.infoColSpan2)}>
            <Calendar className={styles.infoIcon} />
            <span>{formatReleaseDate(candidate.release_date)}</span>
          </div>
        )}

        {/* Label */}
        {candidate.label && (
          <div
            className={cn(styles.infoItem, styles.infoColSpan2, styles.infoTruncate)}
            title={candidate.label}
          >
            <span className={styles.infoLabel}>Label:</span>
            <span className={styles.infoTruncateText}>{candidate.label}</span>
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Botón "No está disponible" (en ningún provider)
 */
function NotFoundButton({ isSelected, onSelect }: { isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      type='button'
      onClick={onSelect}
      className={cn(styles.notFoundButton, isSelected && styles.notFoundButtonSelected)}
    >
      {isSelected && (
        <div className={styles.notFoundCheckmark}>
          <Check className={styles.checkmarkIcon} />
        </div>
      )}

      <X className={styles.notFoundIcon} />
      <span className={styles.notFoundText}>
        No está
        <br />
        disponible
      </span>
    </button>
  );
}

/**
 * Fila de un track local con sus candidatos
 */
function TrackRow({
  trackData,
  selection,
  onSelectionChange,
}: {
  trackData: TrackCandidatesResult;
  selection: string | null | undefined;
  onSelectionChange: (candidateId: string | null) => void;
}) {
  const hasCandidates = trackData.candidates.length > 0;
  const hasError = trackData.error !== undefined;

  // Pre-seleccionar automáticamente el mejor candidato si tiene >85% de similitud
  const bestCandidate = trackData.candidates[0];
  const shouldAutoSelect = bestCandidate && bestCandidate.similarity_score >= 0.85;

  // Construir ID formateado (provider:id) para el mejor candidato
  const bestCandidateId = bestCandidate ? `${bestCandidate.source}:${bestCandidate.id}` : undefined;

  // Si no hay selección pero debería auto-seleccionar, hacerlo
  useMemo(() => {
    if (selection === undefined && shouldAutoSelect && bestCandidateId) {
      onSelectionChange(bestCandidateId);
    }
  }, [selection, shouldAutoSelect, bestCandidateId, onSelectionChange]);

  return (
    <div className={styles.trackRow}>
      {/* Header con info del track local */}
      <div className={styles.trackHeader}>
        <Music className={styles.trackIcon} />
        <div className={styles.trackInfo}>
          <p className={styles.trackTitle}>{trackData.local_title}</p>
          <p className={styles.trackArtist}>
            {trackData.local_artist}
            {trackData.local_duration && (
              <span className={styles.trackDuration}>({formatDuration(trackData.local_duration)})</span>
            )}
          </p>
          {/* Nombre del archivo */}
          {trackData.local_filename && (
            <p
              className={styles.trackFilename}
              title={trackData.local_filename}
            >
              <FileAudio className={styles.trackFilenameIcon} />
              <span className={styles.trackFilenameText}>{trackData.local_filename}</span>
            </p>
          )}
        </div>

        {/* Indicador de estado */}
        {hasError && (
          <div className={styles.statusError}>
            <AlertCircle className={styles.statusIcon} />
            <span>Error</span>
          </div>
        )}
        {!hasCandidates && !hasError && (
          <div className={styles.statusNoResults}>
            <AlertCircle className={styles.statusIcon} />
            <span>Sin resultados</span>
          </div>
        )}
      </div>

      {/* Candidatos */}
      {hasError ? (
        <div className={styles.errorMessage}>{trackData.error}</div>
      ) : (
        <div className={styles.candidatesContainer}>
          {trackData.candidates.map((candidate: TrackCandidate) => {
            //Construir ID formateado (provider:id) para usar como selected_candidate_id
            const formattedId = `${candidate.source}:${candidate.id}`;
            return (
              <CandidateCard
                key={formattedId}
                candidate={candidate}
                isSelected={selection === formattedId}
                onSelect={() => onSelectionChange(formattedId)}
                localDuration={trackData.local_duration}
              />
            );
          })}

          {/* Siempre mostrar opción "No está en Beatport" */}
          <NotFoundButton
            isSelected={selection === null}
            onSelect={() => onSelectionChange(null)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Modal principal de selección de matches de Beatport
 */
function TagCandidatesSelectionModal({
  trackCandidates,
  onConfirm,
  onCancel,
  isLoading = false,
}: TagsSelectionModalProps) {
  // Estado de selecciones: Map de local_track_id -> selected_candidate_id formateado (provider:id o null)
  const [selections, setSelections] = useState<Map<string, string | null>>(() => {
    const initial = new Map<string, string | null>();

    // Auto-seleccionar candidatos con alta similitud (>85%)
    for (const track of trackCandidates) {
      const best = track.candidates[0];
      if (best && best.similarity_score >= 0.85) {
        // Construir ID formateado (provider:id)
        const formattedId = `${best.source}:${best.id}`;
        initial.set(track.local_track_id, formattedId);
      }
    }

    return initial;
  });

  // Contar tracks con selección (cualquier selección hecha)
  const totalSelections = selections.size;

  // Contar tracks con match válido (beatport_id no null)
  const validMatchCount = useMemo(() => {
    let count = 0;
    for (const [, beatportId] of selections) {
      if (beatportId !== null) count++;
    }
    return count;
  }, [selections]);

  // Contar "No está en Beatport" seleccionados
  const skippedCount = totalSelections - validMatchCount;

  // Handler para cambiar selección
  const handleSelectionChange = (localTrackId: string, candidateId: string | null) => {
    setSelections(prev => {
      const next = new Map(prev);
      next.set(localTrackId, candidateId);
      return next;
    });
  };

  // Handler para confirmar
  const handleConfirm = () => {
    const result: TrackSelection[] = [];

    for (const [localTrackId, candidateTrackId] of selections) {
      result.push({
        local_track_id: localTrackId,
        selected_candidate_id: candidateTrackId,
      });
    }

    onConfirm(result);
  };

  // Estadísticas
  const totalTracks = trackCandidates.length;
  const tracksWithCandidates = trackCandidates.filter(t => t.candidates.length > 0).length;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Seleccionar Matches de Tracks</h2>
            <p className={styles.modalSubtitle}>
              {tracksWithCandidates} de {totalTracks} tracks tienen candidatos (Beatport + Traxsource)
            </p>
          </div>
          <button
            type='button'
            onClick={onCancel}
            className={styles.closeButton}
            disabled={isLoading}
          >
            <X className={styles.iconLarge} />
          </button>
        </div>

        {/* Lista de tracks */}
        <div className={styles.modalBody}>
          {trackCandidates.map(trackData => (
            <TrackRow
              key={trackData.local_track_id}
              trackData={trackData}
              selection={selections.get(trackData.local_track_id) ?? undefined}
              onSelectionChange={beatportId => handleSelectionChange(trackData.local_track_id, beatportId)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.footerStats}>
            {totalSelections > 0 ? (
              <>
                {validMatchCount > 0 && (
                  <span className={styles.statsMatched}>✅ {validMatchCount} para aplicar tags</span>
                )}
                {validMatchCount > 0 && skippedCount > 0 && ' · '}
                {skippedCount > 0 && (
                  <span className={styles.statsSkipped}>
                    ⏭️ {skippedCount} saltado{skippedCount !== 1 ? 's' : ''}
                  </span>
                )}
              </>
            ) : (
              'Selecciona los tracks correctos'
            )}
          </div>
          <div className={styles.footerButtons}>
            <button
              type='button'
              onClick={onCancel}
              disabled={isLoading}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              type='button'
              onClick={handleConfirm}
              disabled={isLoading || totalSelections === 0}
              className={cn(
                styles.confirmButton,
                totalSelections > 0 ? styles.confirmButtonEnabled : styles.confirmButtonDisabled,
              )}
            >
              {isLoading ? (
                <span className={styles.loadingSpinner}>
                  <div className={styles.spinner} />
                  Aplicando...
                </span>
              ) : (
                `Confirmar (${totalSelections})`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TagCandidatesSelectionModal;
