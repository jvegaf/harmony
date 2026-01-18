# ⚡ Guía Rápida de Pruebas - Correcciones Drag & Drop

## 🚀 Iniciar App (10 segundos)

```bash
cd /home/th3g3ntl3man/Code/harmony
yarn dev
```

---

## ✅ Test 1: Cambio de Playlists (30 segundos) ⚠️ CRÍTICO

**Este era el bug principal - verificar primero**

1. Abrir Playlist A
2. Memorizar el título del primer track
3. Cambiar a Playlist B (click en otra playlist)
4. **¿Se ve el contenido de Playlist B?** ✅ / ❌
5. Volver a Playlist A
6. **¿Se ve el contenido correcto de Playlist A?** ✅ / ❌

**Antes:** ❌ Mostraba tracks incorrectos  
**Ahora:** ✅ Debe funcionar correctamente

---

## ✅ Test 2: Drag & Drop Instantáneo (30 segundos)

1. Abrir cualquier playlist
2. Arrastrar un track a otra posición
3. **¿Se mueve INSTANTÁNEAMENTE?** ✅ / ❌
4. **¿Aparece en la posición correcta?** ✅ / ❌
5. Navegar a otra vista y volver
6. **¿El orden persiste?** ✅ / ❌

---

## 📊 Test 3: Verificar Performance (1 minuto)

**En DevTools Console (`Ctrl+Shift+I`):**

```javascript
__clearDragPerfHistory();
```

1. Hacer 3 drag & drops
2. Ejecutar:

```javascript
__dragPerfSummary();
```

**Esperado:**

```
Average Total Lag: ~2-3ms
UI updated by AG Grid (managed - INSTANT)
```

**Si ves < 5ms → ✅ ÉXITO!**

---

## 🎨 Test 4: Drag Ghost (10 segundos)

1. Arrastrar cualquier track
2. Observar el "fantasma" que sigue al cursor

**¿Qué ves?**

- ✅ `🎵 Título - Artista` → Perfecto
- ⚠️ `Título - Artista` (sin emoji) → Aceptable
- ❌ Solo "1 row" → No funcionó

---

## 🏃 Test 5: Drags Rápidos (1 minuto)

1. Hacer 5 drag & drops rápidamente
2. **¿Cada uno se siente instantáneo?** ✅ / ❌
3. **¿Hay errores en consola?** ✅ / ❌
4. Recargar página
5. **¿Orden final es correcto?** ✅ / ❌

---

## ✅ Checklist Final

- ⏳ Cambiar playlists funciona correctamente
- ⏳ Drag & drop es instantáneo
- ⏳ Tracks aparecen en posición correcta
- ⏳ Orden persiste después de recargar
- ⏳ No hay errores en consola
- ⏳ Performance < 5ms

**¿Todos ✅?** → 🎉 **¡ÉXITO!**

---

## ❌ Si Algo Falla

### Cambio de playlists no funciona:

```
Reportar:
- ¿Qué playlist abriste primero?
- ¿Qué playlist abriste después?
- ¿Qué contenido se muestra?
```

### Drag & drop no funciona:

```
Reportar:
- ¿El track se mueve?
- ¿Aparece en posición incorrecta?
- ¿Errores en consola?
- Copiar mensaje de error
```

### Performance lenta:

```
Reportar:
- Resultado de __dragPerfSummary()
- Tamaño de la playlist (# de tracks)
```

---

## 📞 Formato de Reporte

```
✅ Test 1 (Cambio playlists): PASS / FAIL
✅ Test 2 (Drag instantáneo): PASS / FAIL
✅ Test 3 (Performance): ___ms
✅ Test 4 (Drag ghost): EMOJI / SIN EMOJI / FALLA
✅ Test 5 (Drags rápidos): PASS / FAIL

Errores en consola: SÍ / NO
(Si SÍ, copiar mensaje)

Comentarios:
___________________
```

---

**Tiempo total de testing: ~3 minutos**

**Documentación completa:** `docs/aidev-notes/MANAGED-MODE-FIX.md`
