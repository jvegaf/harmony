/**
 * Módulo de concurrencia controlada para requests a Beatport
 *
 * Implementa paralelización con semáforo y rate limiting adaptativo
 * para optimizar el proceso de Fix Tags sin sobrecargar la API de Beatport.
 */

/**
 * Configuración de concurrencia para requests a Beatport
 */
export interface ConcurrencyConfig {
  /** Máximo de requests concurrentes */
  max_concurrent: number;
  /** Delay mínimo entre requests del mismo slot (ms) */
  min_delay_ms: number;
  /** Delay adicional después de rate limit (429) (ms) */
  rate_limit_delay_ms: number;
}

/**
 * Utilidades para ConcurrencyConfig
 */
export class ConcurrencyConfigUtils {
  /**
   * Configuración por defecto
   */
  static default(): ConcurrencyConfig {
    return {
      // AIDEV-NOTE: Valores conservadores para evitar rate limiting
      // - 4 concurrentes para HTML scraping (search)
      // - 100ms entre requests por slot
      // - 2s extra si detectamos 429
      max_concurrent: 4,
      min_delay_ms: 100,
      rate_limit_delay_ms: 2000,
    };
  }

  /**
   * Configuración para búsqueda de candidatos (HTML scraping)
   */
  static forSearch(): ConcurrencyConfig {
    return {
      max_concurrent: 4,
      min_delay_ms: 100,
      rate_limit_delay_ms: 2000,
    };
  }

  /**
   * Configuración para API v4 (más conservadora)
   */
  static forApi(): ConcurrencyConfig {
    return {
      max_concurrent: 3,
      min_delay_ms: 100,
      rate_limit_delay_ms: 2000,
    };
  }
}

/**
 * Estado compartido para rate limiting adaptativo
 *
 * Rastrea el último error 429 para ajustar dinámicamente
 * la velocidad de los requests.
 */
export class RateLimitState {
  /** Timestamp (ms desde epoch) del último error 429 */
  private last429: number = 0;

  /**
   * Registra que se recibió un error 429 (rate limited)
   */
  recordRateLimit(): void {
    this.last429 = Date.now();
  }

  /**
   * Verifica si debemos reducir la velocidad (por 429 reciente)
   *
   * Retorna `true` si el último 429 fue hace menos de 10 segundos
   */
  shouldSlowDown(): boolean {
    if (this.last429 === 0) {
      return false;
    }

    const now = Date.now();

    // Ventana de slowdown: 10 segundos después de un 429
    return now - this.last429 < 10_000;
  }

  /**
   * Reinicia el estado (útil para tests)
   */
  reset(): void {
    this.last429 = 0;
  }
}