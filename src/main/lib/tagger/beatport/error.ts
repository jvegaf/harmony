/**
 * Errores del módulo Beatport
 *
 * Define los tipos de error que pueden ocurrir durante la integración
 * con la API de Beatport para obtención de metadatos.
 */

/**
 * Errores posibles durante operaciones con Beatport
 */
export enum BeatportErrorType {
  NetworkError = 'NetworkError',
  AuthError = 'AuthError',
  RateLimited = 'RateLimited',
  ParseError = 'ParseError',
  TrackNotFound = 'TrackNotFound',
  TrackRestricted = 'TrackRestricted',
  IoError = 'IoError',
  TagWriteError = 'TagWriteError',
}

/**
 * Error personalizado para operaciones con Beatport
 */
export class BeatportError extends Error {
  public readonly type: BeatportErrorType;
  public readonly retryAfterSecs?: number;
  public readonly trackId?: number;
  public readonly title?: string;
  public readonly artist?: string;
  public readonly reason?: string;

  constructor(
    type: BeatportErrorType,
    message: string,
    options?: {
      retryAfterSecs?: number;
      trackId?: number;
      title?: string;
      artist?: string;
      reason?: string;
    }
  ) {
    super(message);
    this.name = 'BeatportError';
    this.type = type;

    if (options) {
      this.retryAfterSecs = options.retryAfterSecs;
      this.trackId = options.trackId;
      this.title = options.title;
      this.artist = options.artist;
      this.reason = options.reason;
    }
  }

  /**
   * Crea un error de red
   */
  static networkError(message: string): BeatportError {
    return new BeatportError(BeatportErrorType.NetworkError, `Error de red: ${message}`);
  }

  /**
   * Crea un error de autenticación
   */
  static authError(message: string): BeatportError {
    return new BeatportError(BeatportErrorType.AuthError, `Error de autenticación: ${message}`);
  }

  /**
   * Crea un error de rate limiting
   */
  static rateLimited(retryAfterSecs: number): BeatportError {
    return new BeatportError(
      BeatportErrorType.RateLimited,
      `Rate limited. Reintentar en ${retryAfterSecs} segundos`,
      { retryAfterSecs }
    );
  }

  /**
   * Crea un error de parseo
   */
  static parseError(message: string): BeatportError {
    return new BeatportError(BeatportErrorType.ParseError, `Error al parsear respuesta: ${message}`);
  }

  /**
   * Crea un error de track no encontrado
   */
  static trackNotFound(title: string, artist: string): BeatportError {
    return new BeatportError(
      BeatportErrorType.TrackNotFound,
      `Track no encontrado: ${artist} - ${title}`,
      { title, artist }
    );
  }

  /**
   * Crea un error de track restringido
   */
  static trackRestricted(trackId: number, reason: string): BeatportError {
    return new BeatportError(
      BeatportErrorType.TrackRestricted,
      `Track ${trackId} restringido: ${reason}`,
      { trackId, reason }
    );
  }

  /**
   * Crea un error de I/O
   */
  static ioError(message: string): BeatportError {
    return new BeatportError(BeatportErrorType.IoError, `Error de I/O: ${message}`);
  }

  /**
   * Crea un error de escritura de tags
   */
  static tagWriteError(message: string): BeatportError {
    return new BeatportError(BeatportErrorType.TagWriteError, `Error escribiendo tags: ${message}`);
  }

  /**
   * Verifica si el error es de rate limiting
   */
  isRateLimited(): boolean {
    return this.type === BeatportErrorType.RateLimited;
  }

  /**
   * Verifica si el error es recuperable (se puede reintentar)
   */
  isRecoverable(): boolean {
    return this.type === BeatportErrorType.NetworkError ||
           this.type === BeatportErrorType.RateLimited;
  }
}