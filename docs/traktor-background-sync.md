# Traktor Background Sync Implementation

## Resumen

Se ha implementado la sincronización de Traktor en background usando Worker Threads de Node.js para evitar que la aplicación se congele durante el inicio.

## Problema Original

La sincronización con Traktor se ejecutaba en el hilo principal de Electron durante el inicio de la aplicación (con un `setTimeout` de 2 segundos), lo que causaba:

- Congelamiento de la UI
- Aplicación no responsive
- Mala experiencia de usuario durante el startup

## Solución Implementada

Se movió toda la lógica CPU-intensiva a un Worker Thread dedicado:

- **Parsing XML del archivo NML**: Ejecutado en worker
- **Comparación y matching de tracks**: Ejecutado en worker
- **Merge de metadatos y cue points**: Ejecutado en worker
- **Validación de archivos en disco**: Ejecutado en worker

Las operaciones de base de datos (TypeORM) permanecen en el hilo principal ya que TypeORM no es thread-safe.

## Archivos Creados

### 1. `src/main/lib/traktor/sync/sync-worker.ts`

Worker Thread que ejecuta la sincronización completa:

**Entrada:**

```typescript
{
  type: 'sync',
  nmlPath: string,
  harmonyTracks: Track[],
  harmonyCuesByTrackId: Record<string, CuePoint[]>,
  options: SyncOptions
}
```

**Salida:**

```typescript
{
  type: 'result',
  result: SyncResult,
  traktorCuesByPath: Record<string, CuePoint[]>,
  parsedNml: TraktorNML
}
```

**Características:**

- Emite eventos de progreso (`type: 'progress'`)
- Maneja errores y los envía al hilo principal (`type: 'error'`)
- Valida que los archivos de tracks importados existan en disco

### 2. `src/main/lib/traktor/sync/sync-worker-manager.ts`

Manager para gestionar el lifecycle del worker:

**API:**

```typescript
const manager = new SyncWorkerManager();

const result = await manager.executeSync(nmlPath, harmonyTracks, harmonyCuesByTrackId, options, progress => {
  console.log(progress.message, progress.progress);
});

manager.destroy(); // Cleanup
```

**Responsabilidades:**

- Crear y destruir el worker
- Serializar/deserializar Maps (no son transferibles vía postMessage)
- Manejar eventos de progreso
- Propagar errores

## Archivos Modificados

### 3. `src/main/modules/IPCTraktorModule.ts`

**Cambios principales:**

- Agregado `syncWorkerManager: SyncWorkerManager` como propiedad de clase
- Método `executeSyncInternal()` completamente reescrito para usar el worker
- La persistencia en DB se mantiene en el hilo principal después de recibir el resultado del worker

**Flujo nuevo:**

```
executeSyncInternal()
  ├─> db.getAllTracks() - Main thread
  ├─> db.getCuePointsByTrackIds() - Main thread
  ├─> syncWorkerManager.executeSync() - Worker thread
  │   ├─> Parse NML
  │   ├─> Match tracks
  │   ├─> Execute sync
  │   └─> Validate files
  └─> Persist to database - Main thread
      ├─> db.updateTrack()
      ├─> db.insertTracks()
      └─> db.saveCuePoints()
```

### 4. `src/main/lib/traktor/index.ts`

Agregados exports:

```typescript
export { SyncWorkerManager } from './sync/sync-worker-manager';
export type { SyncWorkerExecutionResult, SyncProgressCallback } from './sync/sync-worker-manager';
```

### 5. `electron.vite.config.ts`

Agregado el worker como entry point para que electron-vite lo compile:

```typescript
input: {
  index: resolve('src/main/index.ts'),
  'analysis-worker': resolve('src/main/lib/audio-analysis/analysis-worker.ts'),
  'sync-worker': resolve('src/main/lib/traktor/sync/sync-worker.ts'), // NUEVO
}
```

## Beneficios

1. **UI No Bloqueante**: La aplicación permanece responsive durante la sincronización
2. **Mejor UX**: El usuario puede interactuar con la app mientras se sincroniza
3. **Eventos de Progreso**: El usuario puede ver el progreso de la sincronización
4. **Arquitectura Escalable**: Fácil agregar más workers para otras operaciones CPU-intensivas

## Consideraciones Técnicas

### Serialización de Datos

Los `Map` objects no son transferibles vía `postMessage`, por lo que:

- Main → Worker: Convertimos `Map<string, CuePoint[]>` a `Record<string, CuePoint[]>`
- Worker → Main: Enviamos `Record<string, CuePoint[]>` y reconstruimos el Map

### TypeORM Thread Safety

TypeORM no es thread-safe, por lo que todas las operaciones de base de datos se ejecutan en el hilo principal después de que el worker completa el procesamiento.

### Electron-vite Configuration

El worker debe ser incluido como entry point separado en `electron.vite.config.ts` para que se compile correctamente como un módulo independiente.

## Testing

Para verificar que funciona correctamente:

1. **Build la aplicación:**

   ```bash
   yarn build
   ```

2. **Iniciar la aplicación:**

   ```bash
   yarn start
   ```

3. **Verificar:**
   - La UI no se congela durante el inicio
   - La sincronización completa correctamente
   - Los tracks se importan/actualizan
   - Los eventos de progreso aparecen en la UI

## Próximos Pasos (Opcional)

Si se desea mejorar aún más:

1. **Export to NML en background**: Actualmente el export también podría beneficiarse de un worker
2. **Cancelación de sync**: Permitir al usuario cancelar una sincronización en progreso
3. **Pool de workers**: Para múltiples operaciones concurrentes (si es necesario)

## Notas para Mantenimiento

- **AIDEV-NOTE**: El worker no tiene acceso a `Database`, `BrowserWindow`, ni `ipcMain` - solo ejecuta lógica pura
- **AIDEV-NOTE**: Si se modifica el formato de datos de `SyncResult`, asegurarse de que sea serializable (no usar Maps, Sets, etc.)
- **AIDEV-NOTE**: El worker se destruye automáticamente después de completar o en caso de error
