# Track Details Navigation Feature

**Date:** 2026-02-11  
**Status:** ✅ Completed  
**Last Update:** 2026-02-11 - Added unsaved changes confirmation dialog

## Overview

Implementación de navegación Anterior/Siguiente en la pantalla de detalles de track (DetailsView) y cambio del comportamiento del botón Save para que NO navegue de regreso automáticamente.

---

## Funcionalidad Implementada

### 1. Navegación Anterior/Siguiente

**Características:**

- ✅ Botones "Previous" y "Next" en el footer del formulario
- ✅ Navegación dentro del contexto de la lista actual (Library, Playlist, etc.)
- ✅ Los botones se deshabilitan automáticamente cuando no hay track anterior/siguiente
- ✅ Iconos de chevron left/right para mejor UX
- ✅ Mantiene el estado de la lista filtrada/ordenada al momento de abrir Details

### 2. Diálogo de Confirmación para Cambios Sin Guardar

**Características:**

- ✅ Los botones "Previous", "Next" y "Close" verifican si hay cambios sin guardar antes de navegar
- ✅ Si hay cambios pendientes (`form.isDirty()`), muestra un modal de confirmación
- ✅ Modal de Mantine con título "Unsaved changes" y botones "Leave" (rojo) / "Stay"
- ✅ Si el usuario confirma, ejecuta la acción de navegación y descarta cambios
- ✅ Si cancela, permanece en la pantalla sin perder los cambios
- ✅ El botón "Save" NO muestra confirmación (guarda directamente)

**Implementación:**

```typescript
const confirmNavigation = useCallback(
  (action: () => void) => {
    if (form.isDirty()) {
      modals.openConfirmModal({
        title: 'Unsaved changes',
        children: 'You have unsaved changes. Are you sure you want to leave without saving?',
        labels: { confirm: 'Leave', cancel: 'Stay' },
        confirmProps: { color: 'red' },
        onConfirm: action,
      });
    } else {
      action();
    }
  },
  [form],
);
```

### 3. Botón "Cancel" → "Close"

**Cambios:**

- ✅ El botón "Cancel" se renombró a "Close" para mejor semántica
- ✅ El botón "Close" ejecuta `navigate(-1)` (vuelve a la ruta anterior)
- ✅ Incluye verificación de cambios sin guardar antes de cerrar

### 4. Cambio de Comportamiento del Botón Save

- Cuando el usuario hace click derecho en un track y selecciona "Show Details", el sistema captura la lista completa de tracks visibles en ese momento (respetando filtros y ordenamiento)
- El usuario puede navegar hacia adelante y atrás dentro de esa lista usando los botones Previous/Next
- Si no hay más tracks en una dirección, el botón correspondiente se deshabilita

### 2. Cambio de Comportamiento del Botón Save

**Antes:**

```typescript
const handleSubmit = async values => {
  await libraryAPI.updateTrackMetadata(track.id, values);
  navigate('/'); // ❌ Navegaba de regreso automáticamente
};
```

**Después:**

```typescript
const handleSubmit = async values => {
  await libraryAPI.updateTrackMetadata(track.id, values);
  form.resetDirty(values); // ✅ Reset del estado "dirty" del formulario
  revalidator.revalidate(); // ✅ Revalida los datos del router
  // ✅ NO navega - el usuario permanece en Details
};
```

**Ventajas:**

- El usuario puede guardar cambios y continuar editando sin perder el contexto
- Permite usar el botón "Next" inmediatamente después de guardar
- El botón "Close" (antes "Cancel") sigue disponible para volver a la vista anterior
- Protección contra pérdida accidental de cambios al navegar

---

## Flujos de Usuario

### Flujo 1: Usuario navega con cambios sin guardar

1. Usuario abre Details de un track
2. Edita el campo "Title"
3. Click en "Next" (o "Previous" o "Close")
4. **Sistema muestra diálogo:** "You have unsaved changes. Are you sure you want to leave without saving?"
5. **Opción A:** Usuario elige "Leave" → Descarta cambios y navega al siguiente track
6. **Opción B:** Usuario elige "Stay" → Permanece en Details, cambios intactos

### Flujo 2: Usuario navega sin cambios

1. Usuario abre Details de un track
2. NO edita ningún campo
3. Click en "Next" (o "Previous" o "Close")
4. **Sistema navega directamente** sin mostrar diálogo

### Flujo 3: Usuario guarda y navega

1. Usuario abre Details de un track
2. Edita el campo "Label"
3. Click en "Save"
4. **Sistema guarda, resetea `form.isDirty()`, permanece en Details**
5. Click en "Next"
6. **Sistema navega directamente** (sin diálogo porque ya guardó)

---

## Arquitectura de la Solución

### Nuevo Store: `useDetailsNavigationStore`

**Archivo:** `src/renderer/src/stores/useDetailsNavigationStore.ts`

```typescript
type DetailsNavigationStore = {
  trackIds: TrackId[]; // Lista de IDs de tracks
  currentIndex: number; // Posición actual
  setContext: (trackIds, currentTrackId) => void;
  getCurrentTrackId: () => TrackId | null;
  getPreviousTrackId: () => TrackId | null;
  getNextTrackId: () => TrackId | null;
  navigateToPrevious: () => TrackId | null;
  navigateToNext: () => TrackId | null;
  clear: () => void;
};
```

**Responsabilidades:**

- Almacenar la lista de track IDs del contexto actual
- Mantener el índice de navegación
- Proveer helpers para obtener el track anterior/siguiente
- Actualizar el índice cuando se navega

### Captura del Contexto en TrackList

**Archivo:** `src/renderer/src/components/TrackList/TrackList.tsx` (líneas 269-288)

**¿Cuándo se captura el contexto?** Cuando el usuario hace click derecho en un track (antes de abrir el context menu):

```typescript
const onShowCtxtMenu = useCallback(
  (event: CellContextMenuEvent) => {
    // ... selección del track ...

    // AIDEV-NOTE: Captura el contexto para Details view
    if (selected.length === 1 && gridApi) {
      const allDisplayedTracks: Track[] = [];
      gridApi.forEachNodeAfterFilterAndSort(node => {
        if (node.data) {
          allDisplayedTracks.push(node.data);
        }
      });
      const trackIds = allDisplayedTracks.map(t => t.id);
      detailsNavAPI.setContext(trackIds, selected[0].id);
    }

    menu.tracklist(payload);
  },
  [playlists, currentPlaylist, gridApi, detailsNavAPI],
);
```

**Ventajas de este enfoque:**

- ✅ Captura la lista **tal como está renderizada** (con filtros y ordenamiento aplicados)
- ✅ Usa `forEachNodeAfterFilterAndSort` de ag-Grid para obtener el orden exacto
- ✅ No requiere modificar el IPC ni el main process
- ✅ Funciona tanto para Library como para Playlists

### Navegación en Details View

**Archivo:** `src/renderer/src/views/Details/Details.tsx`

**Hooks utilizados:**

```typescript
const revalidator = useRevalidator();
const detailsNavAPI = useDetailsNavigationAPI();
const { getPreviousTrackId, getNextTrackId } = useDetailsNavigationStore();
```

**Handlers:**

```typescript
// AIDEV-NOTE: Wrapper para confirmación de navegación con cambios sin guardar
const confirmNavigation = useCallback(
  (action: () => void) => {
    if (form.isDirty()) {
      modals.openConfirmModal({
        title: 'Unsaved changes',
        children: 'You have unsaved changes. Are you sure you want to leave without saving?',
        labels: { confirm: 'Leave', cancel: 'Stay' },
        confirmProps: { color: 'red' },
        onConfirm: action,
      });
    } else {
      action();
    }
  },
  [form],
);

const handlePrevious = useCallback(() => {
  confirmNavigation(() => {
    const prevTrackId = detailsNavAPI.navigateToPrevious();
    if (prevTrackId) {
      navigate(`/details/${prevTrackId}`);
    }
  });
}, [confirmNavigation, detailsNavAPI, navigate]);

const handleNext = useCallback(() => {
  confirmNavigation(() => {
    const nextTrackId = detailsNavAPI.navigateToNext();
    if (nextTrackId) {
      navigate(`/details/${nextTrackId}`);
    }
  });
}, [confirmNavigation, detailsNavAPI, navigate]);

const handleClose = useCallback(() => {
  confirmNavigation(() => {
    navigate(-1);
  });
}, [confirmNavigation, navigate]);
```

**Botones en el footer:**

```tsx
<Group gap='xs'>
  <Button
    variant='subtle'
    leftSection={<IconChevronLeft size={18} />}
    onClick={handlePrevious}
    disabled={!getPreviousTrackId()}
  >
    Previous
  </Button>
  <Button
    variant='subtle'
    rightSection={<IconChevronRight size={18} />}
    onClick={handleNext}
    disabled={!getNextTrackId()}
  >
    Next
  </Button>
</Group>
```

---

## UI/UX Changes

### Nuevo Layout del Footer

**Antes:**

```
[                               Cancel ] [ Save ]
```

**Después:**

```
[ < Previous ] [ Next > ]      [ Close ] [ Save ]
```

- **Izquierda:** Botones de navegación Previous/Next con iconos de chevron y confirmación de cambios sin guardar
- **Derecha:** Botones Close (antes Cancel) con confirmación y Save sin confirmación
- **Layout:** `justify='space-between'` para distribuir los grupos

### Estados de los Botones

| Botón | Estado Normal | Estado Deshabilitado | Confirmación si Dirty | Variante |
| --- | --- | --- | --- | --- |
| Previous | Activo si hay track anterior | Gris si está en el primer track | ✅ Sí | `subtle` |
| Next | Activo si hay track siguiente | Gris si está en el último track | ✅ Sí | `subtle` |
| Close | Siempre activo | N/A | ✅ Sí | `subtle` + hover rojo |
| Save | Activo (submit del form) | N/A | ❌ No | `filled` |

---

## Archivos Modificados

| #   | Archivo                                                | Cambios                                               |
| --- | ------------------------------------------------------ | ----------------------------------------------------- |
| 1   | `src/renderer/src/stores/useDetailsNavigationStore.ts` | **NUEVO** - Store Zustand para contexto de navegación |
| 2   | `src/renderer/src/components/TrackList/TrackList.tsx`  | Captura contexto en `onShowCtxtMenu`                  |
| 3   | `src/renderer/src/views/Details/Details.tsx`           | Botones Previous/Next, cambio de `handleSubmit`       |

---

## Casos de Uso

### Caso 1: Usuario navega desde Library

1. Usuario está en la vista Library con 500 tracks
2. Aplica un filtro de búsqueda → quedan 50 tracks
3. Ordena por BPM ascendente
4. Click derecho en el track #25 → "Show Details"
5. **Sistema captura:** Los 50 track IDs en orden de BPM, posición 25
6. Usuario puede navegar entre los 50 tracks filtrados usando Previous/Next
7. Si hace click en "Next", va al track #26 (por BPM)
8. Si edita y hace "Save", **permanece** en el Details del track #26

### Caso 2: Usuario navega desde Playlist

1. Usuario abre una playlist con 30 tracks
2. Click derecho en el track #10 → "Show Details"
3. **Sistema captura:** Los 30 track IDs de la playlist, posición 10
4. Usuario edita el campo "Label" y hace "Save"
5. **Permanece** en Details del track #10
6. Click en "Next" → va al track #11 de la playlist
7. Click en "Previous" → vuelve al track #10

### Caso 3: Límites de navegación

1. Usuario abre Details del **primer** track de una lista
2. Botón "Previous" está **deshabilitado** (gris)
3. Usuario navega con "Next" hasta el **último** track
4. Botón "Next" está **deshabilitado** (gris)
5. Botón "Previous" está **habilitado**

---

## Notas Técnicas

### AIDEV-NOTE: Uso de `forEachNodeAfterFilterAndSort`

Es **crítico** usar el método `gridApi.forEachNodeAfterFilterAndSort` en lugar de simplemente usar el array `tracks` original, porque:

1. **Respeta el orden de la columna ordenada** (si el usuario ordenó por BPM, la navegación seguirá ese orden)
2. **Respeta los filtros aplicados** (si hay búsqueda activa, solo incluye tracks visibles)
3. **Es el orden exacto que ve el usuario** en la UI

### AIDEV-NOTE: `revalidator.revalidate()`

Después de guardar, llamamos a `revalidator.revalidate()` para que React Router recargue los datos del loader sin cambiar de ruta. Esto asegura que si el usuario:

- Edita el título del track
- Hace "Save"
- El título actualizado se refleja inmediatamente en la UI (cover, título en el loader data, etc.)

### AIDEV-NOTE: Persistencia del contexto

El contexto de navegación se guarda en el store Zustand, que **persiste durante toda la sesión** de la aplicación. Si el usuario:

1. Abre Details desde Library
2. Navega a Settings
3. Vuelve a abrir Details (sin hacer click derecho primero)

El contexto **sigue disponible** y los botones Previous/Next funcionarán con la lista capturada originalmente.

Para **limpiar** el contexto (si se desea en el futuro):

```typescript
detailsNavAPI.clear();
```

---

## Testing Manual

Para verificar la funcionalidad:

1. **Test básico de navegación:**

   - Abrir Library
   - Click derecho en un track del medio de la lista
   - Verificar que ambos botones Previous/Next están habilitados
   - Click en "Next" → debe cargar el siguiente track
   - Click en "Previous" → debe volver al track anterior

2. **Test de límites:**

   - Click derecho en el **primer** track de la lista
   - Verificar que "Previous" está **deshabilitado**
   - Navegar con "Next" hasta el **último** track
   - Verificar que "Next" está **deshabilitado**

3. **Test de Save sin navegación:**

   - Abrir Details de cualquier track
   - Editar el campo "Title"
   - Click en "Save"
   - Verificar que **NO navega** de regreso a Library
   - Verificar que el título se actualizó (revalidation funcionó)

4. **Test con filtros:**

   - En Library, escribir algo en el buscador (ej: "house")
   - Click derecho en uno de los tracks filtrados
   - Navegar con Previous/Next
   - Verificar que **solo navega entre los tracks filtrados**

5. **Test en Playlist:**

   - Abrir una playlist
   - Click derecho en un track
   - Navegar con Previous/Next
   - Verificar que **solo navega dentro de la playlist**

6. **🆕 Test de confirmación con cambios sin guardar:**

   - Abrir Details de cualquier track
   - Editar el campo "Label" (o cualquier campo)
   - **NO hacer click en Save**
   - Click en "Next"
   - **Verificar:** Aparece modal "Unsaved changes" con botones "Leave" / "Stay"
   - Click en "Stay" → Modal se cierra, permanece en Details, cambios intactos
   - Click nuevamente en "Next"
   - Click en "Leave" → Cambios se descartan, navega al siguiente track

7. **🆕 Test de navegación sin diálogo después de guardar:**

   - Abrir Details de cualquier track
   - Editar el campo "BPM"
   - Click en "Save"
   - Click en "Next" (o "Previous" o "Close")
   - **Verificar:** Navega directamente SIN mostrar diálogo de confirmación

8. **🆕 Test del botón Close con cambios:**
   - Abrir Details de cualquier track
   - Editar el campo "Artist"
   - Click en "Close"
   - **Verificar:** Aparece modal de confirmación
   - Click en "Leave" → Vuelve a la vista anterior (Library o Playlist)

---

## Verificación

✅ **TypeCheck:** `yarn typecheck` → Sin errores  
✅ **Lint:** `yarn lint` → Sin errores  
✅ **Format:** `yarn format` → Código formateado correctamente

---

## Dependencias

Esta funcionalidad requiere:

- ✅ `@mantine/modals` - Para el diálogo de confirmación
- ✅ `ModalsProvider` - Debe estar configurado en `Providers.tsx` (ya existente)
- ✅ `form.isDirty()` - Hook de `@mantine/form` para detectar cambios
- ✅ `form.resetDirty(values)` - Para resetear estado después de guardar

---

**Last Updated:** 2026-02-11 (Added unsaved changes confirmation)
