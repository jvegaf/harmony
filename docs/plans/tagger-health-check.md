# Plan: Health Check para Tag Providers

## Objetivo

Implementar un sistema de health check que permita visualizar el estado de cada tag provider (Beatport, Traxsource) desde Settings, indicando cuáles están operativos y cuáles fallan, junto con la razón del fallo.

---

## Arquitectura

### Flujo de datos

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Renderer      │────▶│   IPC Channel    │────▶│   Main Process  │
│  (Settings UI)  │◀────│  (health-check)  │◀────│  (Providers)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Componentes a modificar

| Componente | Localización | Responsabilidad |
|------------|--------------|------------------|
| `BeatportClient` | `src/main/lib/tagger/beatport/client/` | Método `healthCheck()` |
| `Traxsource` | `src/main/lib/tagger/traxsource/` | Método `healthCheck()` |
| `ipc-channels.ts` | `src/preload/lib/` | Nuevo channel |
| `IPCTaggerModule.ts` | `src/main/modules/` | Handler del health check |
| `SettingsTagger.tsx` | `src/renderer/src/views/Settings/` | UI del estado de providers |

---

## Implementación

### 1. Backend - Método healthCheck en providers

Cada provider implementa un método `healthCheck()` que hace una request mínima para verificar conectividad.

#### Beatport
- **Estrategia**: Hacer request a la página principal `https://www.beatport.com` y verificar que responde
- **Error posible**: Timeout, DNS, HTTP error
- **Ubicación**: `src/main/lib/tagger/beatport/client/client.ts`

```typescript
async healthCheck(): Promise<ProviderHealthStatus> {
  try {
    const response = await this.httpClient('https://www.beatport.com', {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
    });
    return { status: 'healthy', provider: 'beatport' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      provider: 'beatport', 
      error: error instanceof BeatportError ? error.message : String(error)
    };
  }
}
```

#### Traxsource
- **Estrategia**: Hacer request a `https://www.traxsource.com` y verificar respuesta
- **Error posible**: Timeout, DNS, HTTP error
- **Ubicación**: `src/main/lib/tagger/traxsource/traxsource.ts`

```typescript
async healthCheck(): Promise<ProviderHealthStatus> {
  try {
    await this.client.get('/');
    return { status: 'healthy', provider: 'traxsource' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      provider: 'traxsource', 
      error: String(error)
    };
  }
}
```

### 2. Backend - Definir tipos

#### Tipo ProviderHealthStatus
Crear en `src/preload/types/tagger/index.ts`:

```typescript
export type ProviderHealthStatus = {
  provider: ProviderSource;
  status: 'healthy' | 'unhealthy' | 'checking';
  error?: string;
  lastChecked?: Date;
};

export type ProviderHealthCheckResult = {
  providers: ProviderHealthStatus[];
  timestamp: Date;
};
```

### 3. Backend - Nuevo IPC channel

En `src/preload/lib/ipc-channels.ts`:

```typescript
TAGGER_HEALTH_CHECK: 'TAGGER_HEALTH_CHECK',
```

### 4. Backend - IPC Handler

En `src/main/modules/IPCTaggerModule.ts`:

```typescript
ipcMain.handle(channels.TAGGER_HEALTH_CHECK, async (): Promise<ProviderHealthCheckResult> => {
  const taggerManager = getTaggerWorkerManager();
  return taggerManager.healthCheckAll();
});
```

### 5. Backend - Tagger Worker Manager

Agregar método en `src/main/lib/tagger/worker/tagger-worker-manager.ts`:

```typescript
async healthCheckAll(): Promise<ProviderHealthCheckResult> {
  const results: ProviderHealthStatus[] = [];

  // Beatport
  try {
    const client = BeatportClient.new();
    await client.healthCheck(); // método a agregar
    results.push({ provider: 'beatport', status: 'healthy', lastChecked: new Date() });
  } catch (error) {
    results.push({ provider: 'beatport', status: 'unhealthy', error: String(error), lastChecked: new Date() });
  }

  // Traxsource
  try {
    const client = new Traxsource();
    await client.healthCheck();
    results.push({ provider: 'traxsource', status: 'healthy', lastChecked: new Date() });
  } catch (error) {
    results.push({ provider: 'traxsource', status: 'unhealthy', error: String(error), lastChecked: new Date() });
  }

  return { providers: results, timestamp: new Date() };
}
```

### 6. Frontend - Exponer en preload

En `src/preload/index.ts`, agregar:

```typescript
tagger: {
  healthCheck: () => ipcRenderer.invoke(channels.TAGGER_HEALTH_CHECK),
}
```

### 7. Frontend - UI en SettingsTagger

Modificar `src/renderer/src/views/Settings/SettingsTagger.tsx` para agregar:

- **Nueva sección**: "Provider Status" después de "Priority Order"
- **Componente**: Lista de providers con indicadores visuales
- **Estados**:
  - ✅ Verde: `healthy` - Provider operativo
  - ❌ Rojo: `unhealthy` - Provider fallando
  - ⏳ Amarillo: `checking` - Verificando estado

#### Diseño propuesto

```
┌─────────────────────────────────────────────────────┐
│ Provider Status                          [↻ Retry]│
├─────────────────────────────────────────────────────┤
│  ● Beatport       ✓ Healthy    Last checked: 10:30│
│    (sin errores)                                     │
├─────────────────────────────────────────────────────┤
│  ● Traxsource     ✗ Unhealthy  Last checked: 10:28 │
│    Error: Connection timeout after 10000ms          │
└─────────────────────────────────────────────────────┘
```

#### Componente `<ProviderStatusCard>`

```typescript
interface Props {
  provider: ProviderSource;
  displayName: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  error?: string;
  lastChecked?: Date;
  color: string;
}
```

- Badge de color según estado
- Tooltip con detalles del error (para estado unhealthy)
- Auto-refresh opcional cada 60 segundos

---

## Notas técnicas

### Timeout
- Usar timeout de 10 segundos para el health check
- No bloquear la UI durante el check (usar estado `checking`)

### Caching
- No guardar resultado en DB; mantener en memoria durante la sesión
- Refrescar automáticamente cada 60 segundos o manualmente

### Rate limiting
- El health check no cuenta para rate limiting de los providers
- Usar requests mínimos (GET a página principal)

---

## Tareas

1. [ ] Crear tipo `ProviderHealthStatus` en preload/types/tagger
2. [ ] Agregar método `healthCheck()` a `BeatportClient`
3. [ ] Agregar método `healthCheck()` a `Traxsource`
4. [ ] Agregar channel `TAGGER_HEALTH_CHECK` en ipc-channels.ts
5. [ ] Agregar handler en IPCTaggerModule.ts
6. [ ] Agregar método `healthCheckAll()` en tagger-worker-manager.ts
7. [ ] Exponer método en preload/index.ts (window.Main.tagger)
8. [ ] Actualizar SettingsTagger.tsx con UI de estado
9. [ ] Testing: verificar que ambos providers muestran estado correcto