# 🔧 Fix: DuplicateWavePlayer - Lazy Loading & DB Persistence

## 🐛 Problemas Identificados

1. ❌ **Todas las waveforms mostraban "Loading..."** al hacer click en una
2. ❌ **Re-analizaba tracks que ya tenían waveforms** en la base de datos
3. ❌ **No guardaba nuevos análisis** generados por WaveSurfer

## ✅ Soluciones Implementadas

### 1. **Lazy Loading de Audio**

```typescript
// ANTES: Cargaba audio inmediatamente al montar
ws.load(audioUrl); // En useEffect inicial

// AHORA: Solo carga cuando usuario hace click
useEffect(() => {
  if (isActiveTrack && !audioLoaded) {
    ws.load(audioUrl); // Solo cuando se activa
  }
}, [isActiveTrack, audioLoaded]);
```

**Resultado**: Solo el track clickeado muestra "Loading...", no todos a la vez.

### 2. **Uso de Peaks Pre-Calculados**

```typescript
// Verifica si hay peaks en BD
const hasPreComputedPeaks = track.waveformPeaks && track.waveformPeaks.length > 0;

// Usa peaks de BD si existen
const ws = WaveSurfer.create({
  peaks: hasPreComputedPeaks ? [track.waveformPeaks!] : [placeholderPeaks],
  duration: track.duration || 180,
  // ... sin cargar audio todavía
});
```

**Resultado**: Waveforms con peaks en BD aparecen instantáneamente.

### 3. **Auto-Guardado de Nuevos Peaks**

```typescript
// Escucha evento 'decode' cuando WaveSurfer genera peaks
ws.on('decode', async () => {
  if (!hasPreComputedPeaks && !peaksSavedRef.current) {
    peaksSavedRef.current = true;

    // Extrae peaks del audio decodificado
    const exportedPeaks = ws.getDecodedData()?.getChannelData(0);

    // Downsample a ~1000 puntos para eficiencia
    const filteredPeaks = downsample(exportedPeaks, 1000);

    // Guarda a BD para uso futuro
    await db.tracks.update(track.id, { waveformPeaks: filteredPeaks });
  }
});
```

**Resultado**: Primera reproducción genera y guarda peaks. Próximas veces usan peaks guardados (más rápido).

## 📊 Comparación de Estados

### Estado: `isLoading` → `audioLoaded`

**ANTES**:

```typescript
const [isLoading, setIsLoading] = useState(false);

// Se activaba para TODOS los tracks al mismo tiempo
setIsLoading(true);
ws.load(audioUrl); // En mount de cada componente
```

**AHORA**:

```typescript
const [audioLoaded, setAudioLoaded] = useState(false);

// Solo se activa para el track específico que el usuario clickeó
if (isActiveTrack && !audioLoaded) {
  ws.load(audioUrl);
}

// Loading indicator solo en track activo
{isActiveTrack && !audioLoaded && <div>Loading...</div>}
```

## 🎯 Flujo Completo (Track CON peaks en BD)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Mount Component                                          │
│    - Crea WaveSurfer con track.waveformPeaks de BD         │
│    - ⚡ Waveform visible INSTANTÁNEAMENTE                   │
│    - audioLoaded = false (sin audio todavía)               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Usuario Click en Waveform                                │
│    - WaveSurfer 'interaction' event                         │
│    - Llama onBecomeActive()                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Padre Actualiza Estado                                   │
│    - setActivePlayingId(track.id)                           │
│    - isActiveTrack = true                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Lazy Load Audio (Primera Vez)                            │
│    - if (isActiveTrack && !audioLoaded)                     │
│    - ws.load(audioUrl)                                      │
│    - Muestra "Loading..." SOLO en este track               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Audio Ready                                              │
│    - 'ready' event → setAudioLoaded(true)                  │
│    - ws.play() → 🎵 Reproduce!                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Flujo Completo (Track SIN peaks en BD)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Mount Component                                          │
│    - Crea WaveSurfer con placeholderPeaks                  │
│    - Waveform placeholder visible (gris transparente)      │
│    - audioLoaded = false                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2-4. Mismo proceso que arriba                               │
│      (Click → Become Active → Load Audio)                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Audio Decode Complete                                    │
│    - 'decode' event                                         │
│    - Extrae peaks reales del audio                         │
│    - Downsample a 1000 puntos                              │
│    - db.tracks.update({ waveformPeaks })                   │
│    - ✅ Peaks guardados para próxima vez                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Play                                                     │
│    - ws.play() → 🎵 Reproduce!                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ ✅ Próximo Scan del Mismo Track                             │
│    - Usa peaks de BD (Flujo rápido)                        │
│    - No re-análisis necesario                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Cambios en el Código

### Nuevas Variables de Estado

```typescript
const [audioLoaded, setAudioLoaded] = useState(false); // Reemplaza isLoading
const peaksSavedRef = useRef(false); // Previene guardado duplicado
```

### Nueva Lógica de Peaks

```typescript
// Detecta si hay peaks pre-calculados
const hasPreComputedPeaks = track.waveformPeaks && track.waveformPeaks.length > 0;

// Genera placeholder solo si no hay peaks
const placeholderPeaks = useMemo(() => {
  if (hasPreComputedPeaks) return null;
  // ... genera placeholder
}, [track.duration, hasPreComputedPeaks]);
```

### Nuevo Evento: 'decode'

```typescript
ws.on('decode', async () => {
  if (!hasPreComputedPeaks && !peaksSavedRef.current) {
    // Extrae, procesa y guarda peaks
    await db.tracks.update(track.id, { waveformPeaks: filteredPeaks });
  }
});
```

### Nuevo Loading Indicator Condicional

```typescript
// ANTES: Siempre mostraba si isLoading
{isLoading && <div className={styles.loadingIndicator}>Loading...</div>}

// AHORA: Solo muestra si este track específico está siendo cargado
{isActiveTrack && !audioLoaded && <div className={styles.loadingIndicator}>Loading...</div>}
```

## ✅ Verificación Visual

### Escenario 1: Primera Carga (Sin Peaks en BD)

```
Track A: [████████░░] (placeholder gris)
Track B: [████████░░] (placeholder gris)
Track C: [████████░░] (placeholder gris)

Usuario click en Track B
     ↓
Track A: [████████░░]
Track B: [Loading...] ← Solo este
Track C: [████████░░]

Audio carga...
     ↓
Track A: [████████░░]
Track B: [Playing 🎵] [██████░░░░] ← Reproduciendo
Track C: [████████░░]

✅ Peaks guardados en BD para Track B
```

### Escenario 2: Segunda Carga (Con Peaks en BD)

```
Track A: [██▌██▌█▌▌█] ← Peaks de BD (instantáneo)
Track B: [█▌▌██▌███▌] ← Peaks de BD (instantáneo)
Track C: [██▌█▌▌█▌██] ← Peaks de BD (instantáneo)

Usuario click en Track B
     ↓
Track B: [Loading...] ← Solo carga AUDIO, peaks ya existen
     ↓
Track B: [Playing 🎵] [█▌▌██▌███▌] ← Reproduciendo inmediatamente
```

## 📦 Archivos Modificados

- ✅ `DuplicateWavePlayer.tsx` - Lógica completa de lazy loading + DB persistence

## 🎯 Próximos Pasos

1. **Probar el fix**:

   ```bash
   npm run dev
   ```

2. **Verificar comportamiento**:

   - [ ] Primera carga genera y guarda peaks
   - [ ] Segunda carga usa peaks de BD (más rápido)
   - [ ] Solo un "Loading..." a la vez
   - [ ] No re-análisis innecesario

3. **Si funciona correctamente**:
   - Commit los cambios
   - Actualizar documentación si necesario

---

**Fecha**: Mayo 2024  
**Issue**: Lazy loading + DB persistence  
**Estado**: ✅ Implementado - Listo para testing
