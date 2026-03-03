
## Bugs Identificados

He encontrado **4 bugs** en la extracción/visualización de metadatos. Todos están en archivos distintos y son independientes entre sí.

---

### Bug 1: BPM no se extrae (ItemKey incorrecto)

**Archivo**: `src-tauri/src/libs/audio_metadata.rs:84-88`
**Problema**: Se usa `ItemKey::Bpm` que según la documentación de lofty 0.21 es para *"Decimal BPM value... Not supported by ID3v2 that restricts BPM values to integers in TBPM"*. Para archivos ID3v2.4 (MP3), se debe usar `ItemKey::IntegerBpm` que mapea al frame TBPM.

**Fix**: Cambiar `ItemKey::Bpm` por `ItemKey::IntegerBpm` en la lectura (línea 86). Considerar intentar ambos (primero `IntegerBpm`, luego `Bpm` como fallback) para soportar formatos que usen BPM decimal (FLAC, OGG, etc.).

```rust
// Antes:
let bpm = tag.and_then(|t| {
  t.items()
    .find(|item| matches!(item.key(), &ItemKey::Bpm))
    .and_then(|item| item.value().text().and_then(|s| s.parse::<i32>().ok()))
});

// Después:
let bpm = tag.and_then(|t| {
  // AIDEV-NOTE: ID3v2 uses TBPM (IntegerBpm), other formats may use Bpm (decimal)
  t.items()
    .find(|item| matches!(item.key(), &ItemKey::IntegerBpm))
    .or_else(|| t.items().find(|item| matches!(item.key(), &ItemKey::Bpm)))
    .and_then(|item| item.value().text().and_then(|s| s.parse::<f64>().ok()))
    .map(|v| v.round() as i32)
});
```

También actualizar `write_metadata()` (línea 194) para escribir con `ItemKey::IntegerBpm`.

---

### Bug 2: Bitrate siempre es 0 (división extra por 1000)

**Archivo**: `src-tauri/src/libs/audio_metadata.rs:74-77`
**Problema**: `properties.audio_bitrate()` ya retorna el valor en **kbps** (confirmado por la doc oficial de lofty: `println!("Bitrate: {} kbps", properties.audio_bitrate().unwrap_or(0))`). El código divide por 1000 innecesariamente, produciendo 0 para la mayoría de archivos (ej: 320 / 1000 = 0 como i32).

**Fix**: Eliminar la división por 1000.

```rust
// Antes:
let bitrate = properties
  .audio_bitrate()
  .or_else(|| properties.overall_bitrate())
  .map(|b| (b / 1000) as i32);

// Después:
let bitrate = properties
  .audio_bitrate()
  .or_else(|| properties.overall_bitrate())
  .map(|b| b as i32);
```

---

### Bug 3: URL no se extrae (frame ID3v2.4 incorrecto)

**Archivo**: `src-tauri/src/libs/audio_metadata.rs:102-108`
**Problema**: El código usa `ItemKey::AudioFileUrl` que mapea al frame **WOAF** (Official audio file webpage). Pero la URL del track se guarda en el frame **WOAR** (Official artist/performer webpage), que en lofty 0.21 corresponde a `ItemKey::TrackArtistUrl`.

**Fix**: Cambiar `ItemKey::AudioFileUrl` por `ItemKey::TrackArtistUrl` tanto en lectura (línea 106) como en escritura (línea 206).

```rust
// Antes (lectura):
let url = tag.and_then(|t| {
  t.items()
    .find(|item| matches!(item.key(), &ItemKey::AudioFileUrl))
    .and_then(|item| item.value().text().map(|s| s.to_string()))
});

// Después:
// AIDEV-NOTE: WOAR frame (Official artist/performer webpage) stores track URL
let url = tag.and_then(|t| {
  t.items()
    .find(|item| matches!(item.key(), &ItemKey::TrackArtistUrl))
    .and_then(|item| item.value().text().map(|s| s.to_string()))
});
```

Y lo mismo para la escritura en `write_metadata()` (línea 206).

---

### Bug 4: Duración se muestra como "117:05:38" (unidad incorrecta)

**Archivos**:
- `src/lib/utils.ts:4-21` (`parseDuration`)
- `src/lib/utils/utils.ts:4-21` (`ParseDuration`)

**Problema**: El backend Rust almacena `duration` en **milisegundos** (línea 71: `(duration_seconds * 1000.0) as i64`), pero `parseDuration()` trata el valor como **segundos** (divide por 3600 para horas, por 60 para minutos). Ejemplo: un track de 5 minutos = 300,000 ms, se muestra como `83:20:00` en lugar de `05:00`.

**Fix**: Convertir milisegundos a segundos al inicio de la función. Hay que actualizar **ambas copias** de la función:

```typescript
// Antes:
export const parseDuration = (duration: number | null): string => {
  if (duration !== null) {
    const hours = Math.trunc(duration / 3600);
    const minutes = Math.trunc(duration / 60) % 60;
    const seconds = Math.trunc(duration) % 60;
    ...

// Después:
export const parseDuration = (duration: number | null): string => {
  if (duration !== null) {
    const totalSeconds = Math.trunc(duration / 1000); // ms -> s
    const hours = Math.trunc(totalSeconds / 3600);
    const minutes = Math.trunc(totalSeconds / 60) % 60;
    const seconds = totalSeconds % 60;
    ...
```

---

### Resumen de archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src-tauri/src/libs/audio_metadata.rs` | Fix BPM (IntegerBpm), Fix bitrate (quitar /1000), Fix URL (TrackArtistUrl) |
| `src/lib/utils.ts` | Fix parseDuration (ms -> s) |
| `src/lib/utils/utils.ts` | Fix ParseDuration (ms -> s) |

Total: 3 archivos, ~15 líneas modificadas.

---

### Verificación

Después de los cambios:
1. `cargo build` para verificar que el código Rust compila
2. `pnpm run typecheck` para verificar TypeScript
3. Probar escaneando un archivo MP3 con BPM, bitrate conocido, y WOAR tag para confirmar que se extraen correctamente
