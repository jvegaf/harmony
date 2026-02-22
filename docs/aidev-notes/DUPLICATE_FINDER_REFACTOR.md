# Duplicate Finder - Refactorización Completa

## 🎯 Objetivo

Simplificar el sistema de reproducción de audio en el Duplicate Finder eliminando la dependencia del reproductor global y permitiendo que cada instancia de WaveSurfer.js maneje su propio audio de forma independiente.

## ✨ Cambios Principales

### 1. **Sistema de Audio Independiente**

- ❌ **ANTES**: Usaba el reproductor global (`usePlayerStore`, `usePlayerAPI`)
- ✅ **AHORA**: Cada `DuplicateWavePlayer` tiene su propia instancia de WaveSurfer.js
- **Beneficio**: Elimina race conditions y problemas de sincronización de estado

### 2. **Uso Inteligente de Peaks Pre-Calculados**

- ❌ **ANTES**: Pre-análisis batch OR re-análisis cada vez
- ✅ **AHORA**:
  - Usa `track.waveformPeaks` de la BD si existen (carga instantánea)
  - Solo genera nuevos peaks cuando no existen
  - Guarda automáticamente nuevos peaks a la BD
- **Beneficio**:
  - Carga instantánea para tracks ya analizados
  - No re-analiza innecesariamente
  - Mejora progresiva (cada uso guarda data para el futuro)

### 3. **Lazy Loading de Audio**

- ❌ **ANTES**: Cargaba audio de todos los tracks al montar
- ✅ **AHORA**: Solo carga audio cuando el usuario hace click en un track
- **Beneficio**:
  - Mucho más rápido (no carga 10+ archivos de audio)
  - Solo muestra "Loading..." en el track específico que se está cargando
  - Menos uso de memoria y red

### 4. **Control de Exclusión Mutua Simplificado**

- **Regla**: Solo un track puede estar "activo" (`isActiveTrack`) a la vez
- **Implementación**: Estado simple `activePlayingId` en el componente padre
- Cuando un track se vuelve activo, los demás se pausan automáticamente

## 📁 Archivos Modificados

### `DuplicateWavePlayer.tsx`

**Cambios clave:**

```typescript
// Props simplificadas
type DuplicateWavePlayerProps = {
  track: Track;
  isActiveTrack: boolean;
  onBecomeActive: () => void; // Solo necesita notificar al padre
  // ELIMINADO: onPlay, onSeek (manejo interno ahora)
};
```

**Flujo de trabajo optimizado:**

1. **Mount**: Crea WaveSurfer con peaks (de BD o placeholder)
   - ✅ Si `track.waveformPeaks` existe → usa esos peaks (instantáneo)
   - ✅ Si no existe → usa placeholder temporal
2. **Click del usuario**: `interaction` event → `onBecomeActive()`
3. **Activación**: Componente recibe `isActiveTrack=true`
4. **Lazy load audio**: Primera vez que se activa → carga archivo de audio
5. **Decode**: WaveSurfer decodifica audio
   - ✅ Si no había peaks en BD → guarda los nuevos peaks automáticamente
6. **Play**: Reproduce desde posición clickeada

**Estado interno:**

- `isReady`: WaveSurfer está inicializado (con peaks)
- `isPlaying`: Track está reproduciéndose actualmente
- `audioLoaded`: Audio file ha sido cargado (lazy)
- `peaksSavedRef`: Previene guardar peaks múltiples veces

### `DuplicateFinderTool.tsx`

**Eliminado:**

- ❌ Todo el código de análisis de waveforms (`handleAnalyzeWaveforms`, `tracksMissingWaveforms`, etc.)
- ❌ Estado `isAnalyzing`, `analysisProgress`
- ❌ `useRef` para prevenir re-análisis
- ❌ Estado `pendingSeek` y su useEffect
- ❌ Imports de `usePlayerStore`, `usePlayerAPI`, `PlayerStatus`
- ❌ Listener de eventos `audioAnalysis.onProgress`, `audioAnalysis.onTrackComplete`

**Simplificado:**

- ✅ Un solo estado: `activePlayingId`
- ✅ Un solo handler: `handleSetActiveTrack(trackId)`

**De ~350 líneas → ~250 líneas** (30% reducción)

### `DuplicateGroup.tsx`

**Props simplificadas:**

```typescript
type DuplicateGroupProps = {
  // ... otros props
  onSetActiveTrack: (trackId: TrackId) => void;
  // ELIMINADO: onPlayTrack, onSeekTrack
};
```

**Propagación simple:**

- Pasa `isActiveTrack` a cada `DuplicateWavePlayer`
- Pasa `onSetActiveTrack` como `onBecomeActive`

## 🔄 Flujo de Interacción

### Caso 1: Track CON peaks en BD (primera vez)

```
1. Mount → WaveSurfer creado con track.waveformPeaks (instantáneo ✨)
2. Usuario ve waveform inmediatamente (no loading)
3. Usuario click en waveform
4. onBecomeActive() → activePlayingId actualizado
5. isActiveTrack=true → inicia carga de audio (único "Loading...")
6. Audio carga → ws.play() → ¡Reproduce! 🎵
```

### Caso 2: Track SIN peaks en BD (primera vez)

```
1. Mount → WaveSurfer creado con placeholder peaks
2. Usuario ve placeholder (gris, semi-transparente)
3. Usuario click en waveform
4. onBecomeActive() → activePlayingId actualizado
5. isActiveTrack=true → inicia carga de audio
6. Audio carga y decodifica
7. 'decode' event → extrae peaks reales
8. Guarda peaks a BD automáticamente (db.tracks.update)
9. ws.play() → ¡Reproduce! 🎵
10. ✅ Próxima vez: usará peaks de BD (Caso 1)
```

### Caso 3: Usuario cambia de track

```
1. Usuario click en waveform B (A está reproduciendo)
2. DuplicateFinderTool actualiza activePlayingId a B
3. WavePlayer A recibe isActiveTrack=false
   → ws.pause() + ws.seekTo(0)
4. WavePlayer B recibe isActiveTrack=true
   → Si audio no cargado: carga primero
   → ws.play()
5. Solo B está reproduciendo
```

1. Usuario click en waveform
2. WaveSurfer dispara evento 'interaction'
3. DuplicateWavePlayer llama onBecomeActive()
4. DuplicateFinderTool actualiza activePlayingId
5. Componente recibe isActiveTrack=true
6. useEffect detecta cambio → llama ws.play()
7. Track empieza a reproducirse

```

### Caso 2: Usuario hace click en otra waveform

```

1. Usuario click en waveform B (A está reproduciendo)
2. DuplicateFinderTool actualiza activePlayingId a B
3. WavePlayer A recibe isActiveTrack=false → ws.pause() + ws.seekTo(0)
4. WavePlayer B recibe isActiveTrack=true → ws.play()
5. Solo B está reproduciendo

```

### Caso 3: Usuario hace click en posición específica (seek)

```

1. Usuario click en posición X de waveform
2. WaveSurfer maneja el seek internamente
3. WaveSurfer dispara 'interaction'
4. onBecomeActive() se llama
5. ws.play() comienza desde posición X

````

## 🧹 Código Eliminado

### Sistema de análisis batch completo:

```typescript
// ❌ ELIMINADO - Ya no necesario
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [analysisProgress, setAnalysisProgress] = useState<...>(null);
const analysisTriggeredRef = useRef(false);
const tracksMissingWaveforms = useMemo(...);
const handleAnalyzeWaveforms = useCallback(async () => { ... });

useEffect(() => {
  const unsubProgress = audioAnalysis.onProgress(...);
  const unsubTrackComplete = audioAnalysis.onTrackComplete(...);
  return () => { ... };
}, []);

useEffect(() => {
  if (scanResult && tracksMissingWaveforms.length > 0 && !analysisTriggeredRef.current) {
    analysisTriggeredRef.current = true;
    setTimeout(() => handleAnalyzeWaveforms(), 500);
  }
}, [...]);
````

### Sistema de sincronización con player global:

```typescript
// ❌ ELIMINADO - Causaba race conditions
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';
const playerAPI = usePlayerAPI();
const { playerStatus, playingTrack } = usePlayerStore();
const [pendingSeek, setPendingSeek] = useState<...>(null);

const handlePlayTrack = useCallback((trackId: TrackId) => {
  setActivePlayingId(trackId);
  playerAPI.start([trackId], 0); // ❌ Sincronización compleja
}, [playerAPI]);

const handleSeekTrack = useCallback((trackId: TrackId, position: number) => {
  setActivePlayingId(trackId);
  setPendingSeek({ trackId, position }); // ❌ Estado temporal para race condition
  playerAPI.start([trackId], 0);
}, [playerAPI]);

useEffect(() => {
  if (pendingSeek && playerStatus === PlayerStatus.PLAY && playingTrack?.id === pendingSeek.trackId) {
    playerAPI.jumpTo(pendingSeek.position); // ❌ Timing frágil
    setPendingSeek(null);
  }
}, [playerStatus, playingTrack?.id, pendingSeek, playerAPI]);
```

## ✅ Ventajas de la Nueva Implementación

### 1. **Simplicidad**

- Menos estado compartido
- Flujo de datos unidireccional claro
- Cada componente es auto-contenido

### 2. **Performance**

- ✅ **Carga instantánea** para tracks con peaks en BD
- ✅ **Lazy loading** de audio (solo cuando se necesita)
- ✅ **Auto-guardado** de peaks para uso futuro
- ✅ **Mejora progresiva**: Cada uso hace la app más rápida

### 3. **Mantenibilidad**

- Menos líneas de código (~30% reducción)
- Menos edge cases que manejar
- Debugging más fácil (estado local vs global)

### 4. **Confiabilidad**

- ❌ **Eliminado**: Race conditions entre player global y WaveSurfer
- ❌ **Eliminado**: Problemas de timing con `pendingSeek`
- ❌ **Eliminado**: Re-análisis innecesario de tracks
- ❌ **Eliminado**: "Loading..." en todos los tracks simultáneamente
- ✅ **Nuevo**: Control directo sobre cada instancia
- ✅ **Nuevo**: Persistencia de peaks en base de datos

### 5. **Experiencia de Usuario**

- ⚡ Waveforms aparecen instantáneamente (si hay peaks en BD)
- ⚡ Solo UN "Loading..." visible (en el track siendo reproducido)
- ⚡ No re-análisis de tracks ya procesados
- ⚡ Primera carga genera data para futuras cargas más rápidas

## 🧪 Testing Checklist

### Funcionalidad Básica

- [ ] Scan encuentra duplicados correctamente
- [ ] Waveforms con peaks en BD aparecen instantáneamente
- [ ] Waveforms sin peaks muestran placeholder
- [ ] Click en waveform carga audio y reproduce
- [ ] Solo el track clickeado muestra "Loading..."
- [ ] Solo un track reproduce a la vez
- [ ] Cambiar de track pausa el anterior
- [ ] Nuevos peaks se guardan en BD automáticamente

### Edge Cases

- [ ] Click rápido entre múltiples tracks
- [ ] Click en mismo track mientras está cargando
- [ ] Scan nueva búsqueda mientras hay audio reproduciéndose
- [ ] Eliminar tracks mientras uno está reproduciéndose
- [ ] Navegar fuera de /tools mientras reproduce
- [ ] Re-scan mismo grupo (debería usar peaks guardados)

### Performance

- [ ] Tracks con peaks en BD cargan instantáneamente
- [ ] No hay "Loading..." en tracks no clickeados
- [ ] No re-análisis de tracks ya procesados
- [ ] No hay lag al cambiar entre tracks
- [ ] Memoria se libera correctamente (ws.destroy())

### Base de Datos

- [ ] Peaks se guardan correctamente después de primer análisis
- [ ] Próximo scan usa peaks guardados
- [ ] No duplica guardado de peaks (peaksSavedRef funciona)

## 🚀 Próximos Pasos Opcionales

### Mejoras Futuras (No urgentes)

1. **Pre-carga inteligente**: Cargar waveform del siguiente track en background
2. **Caché de waveforms**: Guardar peaks generados en localStorage
3. **Visualización de progreso**: Mostrar cuántas waveforms faltan por cargar
4. **Hotkeys**: Espacio para play/pause, flechas para navegar

### Consideraciones

- El sistema actual es suficiente para la mayoría de casos
- Solo optimizar si hay problemas de performance reportados
- Mantener la simplicidad es más valioso que micro-optimizaciones

## 📝 Notas de Migración

### Si necesitas rollback:

```bash
git log --oneline -- src/renderer/src/views/Tools/
# Encontrar commit antes del refactor
git checkout <commit-hash> -- src/renderer/src/views/Tools/
```

### Archivos a revisar si hay problemas:

1. `DuplicateWavePlayer.tsx` - Manejo de WaveSurfer
2. `DuplicateFinderTool.tsx` - Control de estado
3. Browser DevTools Console - Errores de WaveSurfer

---

**Fecha de refactor**: Mayo 2024  
**Motivación**: Simplificar arquitectura y eliminar race conditions  
**Estado**: ✅ Completado - Listo para testing
