# Traktor Background Operations - Full Implementation

## Resumen

Se ha implementado un sistema completo de operaciones en background para Traktor usando Worker Threads y un Worker Pool, que incluye:

1. **Sincronización en background**: Import desde Traktor NML sin bloquear la UI
2. **Export en background**: Export a Traktor NML sin bloquear la UI
3. **Worker Pool**: Sistema de pool para gestionar múltiples workers concurrentes

## Arquitectura

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                 TraktorWorkerManager (Singleton)                │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │   Sync Worker Pool       │  │  Export Worker Pool      │   │
│  │  - Max 2 workers         │  │  - Max 2 workers         │   │
│  │  - 60s idle timeout      │  │  - 60s idle timeout      │   │
│  └──────────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
    ┌─────────────┐              ┌─────────────┐
    │ sync-worker │              │export-worker│
    │    .js      │              │    .js      │
    └─────────────┘              └─────────────┘
```

### Flujo de Operaciones

#### Sync Operation

```
Main Thread                          Worker Thread
────────────                         ─────────────
executeSyncInternal()
  │
  ├─> Load tracks from DB
  ├─> Load cue points from DB
  │
  └─> workerManager.executeSync() ────┐
                                       │
                                       ▼
                               Parse NML (CPU)
                               Match tracks (CPU)
                               Execute sync (CPU)
                               Validate files (I/O)
                                       │
  ┌─────────────────────────────────┘
  │
  └─> Persist to DB
      ├─> updateTrack()
      ├─> insertTracks()
      └─> saveCuePoints()
```

#### Export Operation

```
Main Thread                          Worker Thread
────────────                         ─────────────
exportToNmlInternal()
  │
  ├─> Load tracks from DB
  ├─> Load cue points from DB
  ├─> Load playlists from DB
  │
  └─> workerManager.executeExport() ──┐
                                       │
                                       ▼
                               Parse NML (CPU)
                               Build XML (CPU)
                               Create backup (I/O)
                               Write file (I/O)
                                       │
  ┌─────────────────────────────────┘
  │
  └─> Log results
```

## Archivos Creados/Modificados

### Nuevos Archivos

#### 1. `src/main/lib/traktor/sync/worker-pool.ts` (~340 líneas)

Worker pool genérico para gestionar múltiples workers:

**Características:**

- Límite configurable de workers concurrentes
- Workers mínimos que se mantienen vivos
- Idle timeout para terminar workers inactivos
- Cola de tareas cuando todos los workers están ocupados
- Reutilización de workers para múltiples tareas
- Estadísticas del pool

**API:**

```typescript
const pool = new WorkerPool<InputType, OutputType>(workerPath, {
  maxWorkers: 4,
  minWorkers: 1,
  idleTimeout: 30000,
});

const result = await pool.runTask(input, onProgress);
pool.destroy();
```

#### 2. `src/main/lib/traktor/sync/export-worker.ts` (~200 líneas)

Worker para exportar datos de Harmony a Traktor NML:

**Entrada:**

```typescript
{
  type: 'export',
  nmlPath: string,
  harmonyTracks: Track[],
  harmonyCuesByTrackId: Record<string, CuePoint[]>,
  harmonyPlaylists: Playlist[],
  createBackup: boolean
}
```

**Salida:**

```typescript
{
  type: 'result',
  success: boolean,
  tracksExported: number,
  playlistsExported: number,
  backupPath?: string
}
```

**Operaciones:**

- Parse del NML existente
- Construcción de XML actualizado con datos de Harmony
- Creación de backup (opcional)
- Escritura del archivo NML
- Deduplicación automática de cue points

#### 3. `src/main/lib/traktor/sync/traktor-worker-manager.ts` (~200 líneas)

Manager singleton que gestiona ambos pools (sync y export):

**API:**

```typescript
const manager = TraktorWorkerManager.getInstance();

// Sync
const syncResult = await manager.executeSync(nmlPath, tracks, cues, options, onProgress);

// Export
const exportResult = await manager.executeExport(nmlPath, tracks, cues, playlists, createBackup, onProgress);

// Stats
const stats = manager.getStats();

// Cleanup
manager.destroy();
```

**Pools:**

- **Sync Pool**: Max 2 workers, 0 mínimos, 60s timeout
- **Export Pool**: Max 2 workers, 0 mínimos, 60s timeout

### Archivos Modificados

#### 4. `src/main/modules/IPCTraktorModule.ts`

**Cambios principales:**

- Reemplazado `SyncWorkerManager` con `TraktorWorkerManager` (singleton)
- Método `executeSyncInternal()` usa el worker manager
- Método `exportToNmlInternal()` completamente reescrito para usar worker
- Ambas operaciones envían eventos de progreso al renderer

**Antes:**

```typescript
private syncWorkerManager: SyncWorkerManager;
```

**Después:**

```typescript
private workerManager: TraktorWorkerManager; // Singleton
```

#### 5. `src/main/lib/traktor/index.ts`

Actualizados exports para incluir:

```typescript
export { TraktorWorkerManager } from './sync/traktor-worker-manager';
export { WorkerPool } from './sync/worker-pool';
export type {
  SyncWorkerExecutionResult,
  ExportWorkerExecutionResult,
  SyncProgressCallback,
  ExportProgressCallback,
  WorkerPoolOptions,
  WorkerTask,
} from './sync/...';
```

#### 6. `electron.vite.config.ts`

Agregado el export-worker como entry point:

```typescript
input: {
  index: resolve('src/main/index.ts'),
  'analysis-worker': resolve('src/main/lib/audio-analysis/analysis-worker.ts'),
  'sync-worker': resolve('src/main/lib/traktor/sync/sync-worker.ts'),
  'export-worker': resolve('src/main/lib/traktor/sync/export-worker.ts'), // NUEVO
}
```

#### 7. `src/renderer/src/hooks/useAutoSyncNotification.ts`

Hook que gestiona las notificaciones para auto-sync:

- Muestra notificaciones durante auto-sync en startup o cambios de librería
- Actualiza con progreso en tiempo real (fase y porcentaje)
- Maneja estados de éxito y error con colores apropiados

#### 8. `src/renderer/src/views/Settings/SettingsTraktor.tsx`

Actualizado handlers de sync/export manual:

**Cambios en `handleExecuteSync`:**

- Crea notificación con ID único
- Se suscribe a eventos de progreso del worker
- Actualiza notificación con fase y porcentaje en tiempo real
- Muestra resumen de cambios al completar
- Maneja errores con notificación roja

**Cambios en `handleExportToNml`:**

- Similar implementación para operaciones de export
- Muestra progreso de parsing, build XML, y escritura
- Confirma éxito con notificación verde

## Beneficios

### 1. UI Completamente Responsive

- ✅ **Sync no bloquea**: Parsing, matching y sync en worker thread
- ✅ **Export no bloquea**: XML generation y file writing en worker thread
- ✅ **Múltiples operaciones**: Sync y export pueden correr simultáneamente

### 2. Worker Pool Eficiente

- ✅ **Reutilización**: Workers se reutilizan para múltiples tareas
- ✅ **Escalado automático**: Crea workers hasta el máximo cuando hay carga
- ✅ **Limpieza automática**: Termina workers inactivos después del timeout
- ✅ **Cola de tareas**: Encola tareas cuando todos los workers están ocupados

### 3. Mejor Experiencia de Usuario

- ✅ **Progreso en tiempo real**: Eventos de progreso durante toda la operación
- ✅ **No interrumpe trabajo**: Usuario puede seguir usando la app
- ✅ **Backups automáticos**: El export crea backups sin bloquear

## Configuración del Pool

### Parámetros Actuales

```typescript
// Sync Pool
{
  maxWorkers: 2,      // Max 2 sync operations concurrentes
  minWorkers: 0,      // No mantener workers vivos cuando idle
  idleTimeout: 60000  // Terminar workers después de 1 minuto idle
}

// Export Pool
{
  maxWorkers: 2,      // Max 2 export operations concurrentes
  minWorkers: 0,      // No mantener workers vivos cuando idle
  idleTimeout: 60000  // Terminar workers después de 1 minuto idle
}
```

### Por Qué Estos Valores

- **maxWorkers: 2**: Suficiente para la mayoría de casos sin consumir demasiados recursos
- **minWorkers: 0**: No hay necesidad de mantener workers vivos; las operaciones son poco frecuentes
- **idleTimeout: 60s**: Balance entre reutilización y consumo de memoria

### Ajuste de Parámetros

Para ajustar según necesidades:

```typescript
// En traktor-worker-manager.ts constructor
this.syncPool = new WorkerPool<SyncWorkerInput, SyncWorkerResult>(syncWorkerPath, {
  maxWorkers: 4, // Más workers para colecciones grandes
  minWorkers: 1, // Mantener 1 worker listo
  idleTimeout: 30000, // Terminar más rápido
});
```

## Testing

### Build y Ejecución

```bash
# Compilar
yarn build

# Ejecutar
yarn start
```

### Verificación

1. **Sync en Background**

   - Iniciar la app con auto-sync habilitado
   - ✓ La UI debe permanecer responsive
   - ✓ Ver eventos de progreso en el renderer
   - ✓ Tracks se importan/actualizan correctamente

2. **Export en Background**

   - Hacer cambios en tracks/playlists
   - Ejecutar export desde settings
   - ✓ La UI no se congela
   - ✓ Ver eventos de progreso
   - ✓ Backup creado si está habilitado
   - ✓ NML actualizado correctamente

3. **Operaciones Concurrentes**
   - Iniciar sync y export simultáneamente
   - ✓ Ambos completan sin errores
   - ✓ Pool stats muestra workers activos

### Monitoreo del Pool

Para ver estadísticas del pool:

```typescript
// En IPCTraktorModule o donde sea necesario
const stats = this.workerManager.getStats();
log.info('Pool stats:', {
  sync: stats.sync, // { totalWorkers, busyWorkers, idleWorkers, queuedTasks }
  export: stats.export,
});
```

## Consideraciones Técnicas

### Serialización

- **Maps → Records**: Los `Map` objects se convierten a `Record` para comunicación entre threads
- **Deduplicación**: Cue points se deduplicada automáticamente en el export worker

### TypeORM Thread Safety

- ✅ **DB operations en main thread**: Todas las operaciones de DB permanecen en el main thread
- ✅ **Workers sin DB**: Los workers no tienen acceso a TypeORM

### Worker Lifecycle

```
Worker Creation
    │
    ├─> Task Assigned → Busy
    │   └─> Task Complete → Idle
    │       └─> Idle Timeout → Terminated
    │
    └─> Below minWorkers → Keep Alive
```

### Error Handling

- Worker errors se propagan al caller como Promises rechazadas
- Pool continúa funcionando si un worker falla
- Workers fallidos se remueven automáticamente del pool

## Limitaciones y Consideraciones

### Límites de Workers

- **Max 2 sync + 2 export = 4 workers concurrentes**
- Si se excede, las tareas se encolan
- Para colecciones muy grandes (>50k tracks), considerar aumentar `maxWorkers`

### Memoria

- Cada worker consume memoria adicional
- Workers inactivos se terminan después de 60s
- El singleton manager asegura que no se creen pools duplicados

### File Locking

- Solo puede haber 1 export activo por NML path
- Múltiples sync operations pueden leer el mismo NML concurrentemente
- El worker pool no previene conflictos de escritura - el caller debe asegurar exclusión mutua si es necesario

## UI Notifications

### Auto-Sync Notifications

El hook `useAutoSyncNotification.ts` muestra notificaciones durante auto-sync en startup o cuando se detectan cambios en la librería:

- **Inicio**: Muestra notificación con spinner y mensaje inicial
- **Progreso**: Actualiza con fase actual y porcentaje (`Parsing: Loading tracks (25%)`)
- **Éxito**: Cambia a verde con resumen de cambios (auto-close en 3s)
- **Error**: Cambia a rojo con mensaje de error (auto-close en 5s)

### Manual Sync/Export Notifications

Los handlers en `SettingsTraktor.tsx` muestran notificaciones para operaciones manuales:

#### Manual Sync (Import from Traktor)

```typescript
// Inicio
notifications.show({
  id: notificationId,
  title: 'Traktor: Import from Traktor',
  message: 'Starting sync...',
  loading: true,
});

// Durante operación (actualiza en tiempo real)
notifications.update({
  id: notificationId,
  message: 'Parsing: Loading tracks (25%)',
  loading: true,
});

// Éxito
notifications.update({
  id: notificationId,
  title: 'Traktor Import Complete',
  message: 'Imported 15 tracks, 32 cue points',
  color: 'green',
  autoClose: 3000,
});
```

#### Manual Export (Export to Traktor)

```typescript
// Similar flow con título "Traktor: Export to Traktor"
// Muestra fases: Parsing → Building XML → Writing → Complete
```

### Características de las Notificaciones

- ✅ **Progreso en tiempo real**: Se suscribe a eventos de progreso del worker
- ✅ **Fases claras**: Parsing, Loading, Analyzing, Syncing, Writing, Complete
- ✅ **Porcentaje visual**: Muestra el % de completitud
- ✅ **Auto-close**: Éxito en 3s, error en 5s
- ✅ **Colores semánticos**: Blue (running), Green (success), Red (error)
- ✅ **No bloquean**: Usuario puede cerrarlas manualmente si lo desea

## Próximos Pasos Posibles

1. **Métricas y Telemetría**: Agregar logging de tiempos y performance
2. **Progreso más granular**: Más eventos de progreso durante parsing
3. **Cancelación**: Permitir cancelar operaciones en progreso (requiere AbortController)
4. **Retry Logic**: Reintentar automáticamente en caso de errores transitorios
5. **Pool Compartido**: Usar un solo pool para sync y export (menos overhead)
6. **Notificaciones personalizadas**: Sonidos o animaciones para completitud

## Fixes y Mejoras

Ver `traktor-export-fixes.md` para detalles sobre:

- ✅ Fix: Progreso de export estancado en 60%
- ✅ Fix: Export innecesario en cada inicio (flag de cambios pendientes)

## Migración desde Implementación Anterior

### Breaking Changes

- `SyncWorkerManager` reemplazado por `TraktorWorkerManager` (singleton)
- `executeExport()` ahora disponible en el manager
- Imports cambiados en `index.ts`

### Compatibilidad

- ✅ La API pública de `IPCTraktorModule` no cambió
- ✅ IPC channels permanecen igual
- ✅ Renderer code no necesita cambios
- ✅ Auto-sync funciona igual que antes

---

**Última actualización**: 2026-02-07
