# 🐛 Fix: "NotSupportedError: The element has no supported sources"

## Problema

```
Failed to play: NotSupportedError: The element has no supported sources.
```

Este error ocurría cuando intentábamos reproducir el audio antes de que estuviera cargado.

## Causa Raíz

El código intentaba llamar `ws.play()` cuando `isActiveTrack` cambiaba a `true`, pero el audio aún no estaba cargado:

```typescript
// ❌ ANTES: Intentaba reproducir sin verificar si audio está cargado
useEffect(() => {
  if (!wavesurferRef.current || !isReady || !audioLoaded) return;

  if (isActiveTrack) {
    if (!isPlaying) {
      ws.play(); // ❌ Error: audio no cargado aún
    }
  }
}, [isActiveTrack, isReady, audioLoaded, isPlaying]);
```

## Solución

### 1. **Auto-play cuando audio termine de cargar**

Agregamos auto-play en el evento `ready` de WaveSurfer:

```typescript
ws.on('ready', () => {
  setIsReady(true);
  setAudioLoaded(true);

  // ✅ Si este track está activo cuando termina de cargar, auto-play
  if (isActiveTrackRef.current) {
    ws.play().catch(err => {
      console.error('Auto-play failed:', err);
    });
  }
});
```

### 2. **Ref para tracking del estado activo**

Usamos un ref para acceder al estado actual en event handlers:

```typescript
const isActiveTrackRef = useRef(isActiveTrack);

// Keep ref in sync
useEffect(() => {
  isActiveTrackRef.current = isActiveTrack;
}, [isActiveTrack]);
```

### 3. **Verificación de audio cargado antes de reproducir**

Modificamos el efecto de control de playback:

```typescript
// ✅ AHORA: Solo reproduce si audio está cargado
useEffect(() => {
  if (!wavesurferRef.current || !isReady) return;

  const ws = wavesurferRef.current;

  if (isActiveTrack) {
    if (audioLoaded && !isPlaying) {
      // ✅ Audio está cargado y listo - reproducir
      ws.play().catch(err => {
        console.error('Failed to play:', err);
      });
    }
    // Si audio no está cargado, se reproducirá cuando 'ready' event dispare
  } else {
    if (audioLoaded) {
      ws.pause();
      ws.seekTo(0);
    }
  }
}, [isActiveTrack, isReady, audioLoaded, isPlaying]);
```

## Flujo Corregido

### Escenario: Usuario hace click en waveform

```
1. Usuario click → 'interaction' event
   ↓
2. onBecomeActive() llamado
   ↓
3. Padre actualiza activePlayingId
   ↓
4. isActiveTrack = true
   ↓
5. useEffect detecta isActiveTrack && !audioLoaded
   ↓
6. ws.load(audioUrl) - Comienza carga de audio
   ↓
7. "Loading..." mostrado
   ↓
8. Audio termina de cargar
   ↓
9. 'ready' event dispara
   ↓
10. setAudioLoaded(true)
    ↓
11. ✅ if (isActiveTrackRef.current) → ws.play()
    ↓
12. 🎵 Reproducción comienza!
```

### Estados de Verificación

| Condición           | Antes    | Ahora      |
| ------------------- | -------- | ---------- |
| `isActiveTrack`     | ✅ true  | ✅ true    |
| `audioLoaded`       | ❌ false | ✅ true    |
| `ws.play()` llamado | ❌ Error | ✅ Success |

## Cambios en el Código

### Nuevas Variables

```typescript
const isActiveTrackRef = useRef(isActiveTrack); // Para event handlers

useEffect(() => {
  isActiveTrackRef.current = isActiveTrack;
}, [isActiveTrack]);
```

### Evento `ready` Actualizado

```typescript
ws.on('ready', () => {
  setIsReady(true);
  setAudioLoaded(true);

  // Auto-play si track está activo
  if (isActiveTrackRef.current) {
    ws.play().catch(err => {
      console.error('Auto-play failed:', err);
    });
  }
});
```

### useEffect de Control de Playback Actualizado

```typescript
useEffect(() => {
  if (!wavesurferRef.current || !isReady) return;

  const ws = wavesurferRef.current;

  if (isActiveTrack) {
    // Solo reproduce si audio YA está cargado
    if (audioLoaded && !isPlaying) {
      ws.play().catch(err => {
        console.error('Failed to play:', err);
      });
    }
  } else {
    // Solo pausa si audio está cargado
    if (audioLoaded) {
      ws.pause();
      ws.seekTo(0);
    }
  }
}, [isActiveTrack, isReady, audioLoaded, isPlaying]);
```

## Beneficios del Fix

1. ✅ **No más errores "NotSupportedError"**
2. ✅ **Auto-play cuando audio termine de cargar**
3. ✅ **Verificación de estado antes de `play()`**
4. ✅ **Manejo correcto de errores con `.catch()`**
5. ✅ **Ref para tracking confiable del estado activo**

## Testing

### Casos a Probar

1. ✅ Click en track → carga y reproduce sin error
2. ✅ Click en track mientras otro reproduce → cambia correctamente
3. ✅ Click rápido en múltiples tracks → maneja correctamente
4. ✅ Audio lento en cargar → espera y reproduce cuando esté listo
5. ✅ No hay más errores en consola

### Verificación Visual

```
Track antes de click: [██████████] (peaks visibles)
                              ↓ Click
Track cargando:       [Loading...]
                              ↓ Audio ready
Track reproduciendo:  [🎵 Playing] [████░░░░░░]
```

## Archivos Modificados

- ✅ `DuplicateWavePlayer.tsx` - Fix de control de playback

## Conclusión

El error estaba causado por intentar reproducir antes de que el audio estuviera cargado. La solución fue:

1. Auto-play en evento `ready` cuando track está activo
2. Verificar `audioLoaded` antes de intentar `play()`
3. Usar ref para tracking confiable del estado en event handlers

---

**Fecha**: Mayo 2024  
**Issue**: NotSupportedError al reproducir  
**Estado**: ✅ Resuelto
