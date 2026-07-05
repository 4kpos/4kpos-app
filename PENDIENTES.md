# Pendientes — verificación con evidencia (actualizado 2026-07-04, ronda 2)

Para cada punto: código real citado (archivo + línea), qué se hizo hoy, y
commit/versión para instalar y verificar tú mismo.

---

## 1. Clock In/Out en el menú hamburguesa

**El botón y el flujo SÍ existen en el código** (no es un placeholder):

```
4K-POS-v5/index.html:478
<button class="ham-item ham-sub" id="ham-clock-item" style="display:none;color:#10b981" onclick="closeHamMenu();openClockQuick()">⏱ Clock In/Out</button>
```
Está dentro del acordeón "Ventas e Inventario" (ver punto 3).

Flujo empleado → contraseña → fichar, ya implementado:
```
4K-POS-v5/index.html:5494  function openClockQuick(){...}       → abre modal, lista empleados
4K-POS-v5/index.html:5578  function renderClockQuickList(){...} → botón Entrada/Salida por empleado
4K-POS-v5/index.html:5599  function cqClockWithPin(id){...}     → pide contraseña de esa cuenta
4K-POS-v5/index.html:5611  function cqVerifyPass(){...}         → valida contra db.users (bcrypt); solo
                                                                    el propio usuario o un admin puede fichar
```

**Bug real que encontré y arreglé hoy:** `_applyRemoteMerge()` (la función
que aplica cambios recibidos por Realtime desde otra PC) actualiza
`db.employees` y `db.settings`, pero nunca volvía a llamar
`updateClockQuickBtn()`. Si activabas el toggle o marcabas
`useClockInOut` en un empleado desde OTRA PC (o esa data llegaba por
sync), esta PC nunca refrescaba el botón hasta reiniciar la app. Ya
arreglado:

```
4K-POS-v5/index.html:3910  updateClockQuickBtn();   ← agregado dentro de _applyRemoteMerge()
```

**Esto sigue siendo cierto y no es un bug — es la condición de diseño
para que aparezca:**
```
4K-POS-v5/index.html:2853  settings:{...,clockQuickEnabled:false}   ← apagado por defecto
4K-POS-v5/index.html:5466  function updateClockQuickBtn(){
                              const enabled=db.settings&&db.settings.clockQuickEnabled;
                              const hasClock=(db.employees||[]).some(e=>e.useClockInOut);
                              ...
```
Necesitas **las dos cosas** en tu cuenta real, desde la misma PC donde lo
vas a usar (o desde cualquiera, ahora que el sync ya refresca el botón):
1. Configuración → activar "⏱ Mostrar botón Clock In/Out en menú".
2. En Usuarios/Nómina, marcar "usar reloj checador" en al menos un empleado.

Si después de eso sigue sin verse, ahí sí sería un bug nuevo a reportar —
pero el código y el flujo ya están completos.

**Commit del fix:** `7143eb8` → release **v5.4.90**.

---

## 2. Mini-gráficas (sparklines) en Semana y Mes

**Verificado de forma más fuerte que la vez pasada:** no solo grep — abrí
`4kpos-dashboard.html` en un navegador real (Edge headless vía
Playwright), inyecté datos de venta de prueba y ejecuté `renderWeek()` /
`renderMonth()` directamente. Las 6 mini-gráficas se generaron como SVG
real en el DOM y se ven correctamente en captura de pantalla:

```
4kpos-dashboard.html:279  <div id="w-spark-inc"...></div>   → Esta semana
4kpos-dashboard.html:280  <div id="w-spark-avg"...></div>   → Promedio/día
4kpos-dashboard.html:281  <div id="w-spark-best"...></div>  → Mejor día
4kpos-dashboard.html:282  <div id="w-spark-yest"...></div>  → Ventas de ayer
4kpos-dashboard.html:292  <div id="m-spark-inc"...></div>   → Este mes
4kpos-dashboard.html:293  <div id="m-spark-avg"...></div>   → Promedio/día (mes)
```
Todas terminaron con `<svg viewBox="0 0 72 22"...><polyline .../></svg>`
dentro tras llamar a `renderWeek()`/`renderMonth()` — no vacías.

**No encontré ningún bug de código.** No hay service worker ni caché de
PWA en este repo que pudiera explicar contenido viejo servido. Si en tu
teléfono real sigues sin verlas:
- Prueba en una pestaña nueva / modo incógnito para descartar caché del
  navegador.
- Si el negocio no tuvo ventas en varios de esos días, la línea se dibuja
  igual pero puede verse casi plana pegada abajo de la tarjeta — no
  ausente, solo poco visible.

No hice cambios de código para este punto (no hacía falta). Commit ya
existente: `cdf1180` en `4kpos-dashboard` (repo aparte de `4kpos-app`,
sin número de versión de instalador — se sirve directo desde GitHub
Pages, ya está publicado).

---

## 3. Reorganización del menú hamburguesa — los 5 cambios, uno por uno

| # | Cambio pedido | ¿Está? | Evidencia |
|---|---|---|---|
| 1 | Fusionar Ventas + Inventario | ✅ Sí | `4K-POS-v5/index.html:470` → `<div id="ham-s-ventinv" class="ham-acc-body">` (un solo acordeón "💰 Ventas e Inventario") |
| 2 | Fusionar Administración + Configuración | ✅ Sí | `4K-POS-v5/index.html:481` → `<div id="ham-s-admcfg" class="ham-acc-body">` (un solo acordeón "👥 Administración y Configuración") |
| 3 | Sacar Refrescar del menú, devolverlo a pantalla principal | ✅ Sí | `4K-POS-v5/index.html:450` → `<button id="refresh-btn" onclick="refreshPOS()" title="Actualizar datos">🔄</button>` en la topbar; ya no existe ningún botón `onclick="refreshPOS()"` dentro de `#ham-menu` |
| 4 | Campana de notificaciones dentro del menú, con badge | ✅ Sí | `4K-POS-v5/index.html:466` → `<button class="ham-item" id="notif-btn"...>🔔 ... <span id="notif-badge">0</span></button>` dentro de `#ham-menu`; ya no está en la topbar |
| 5 | Buzón/nota dentro del menú, con badge | ✅ Sí | `4K-POS-v5/index.html:467` → mismo patrón, `id="note-btn"` / `id="note-badge"` |

Extra no pedido explícitamente pero agregado para que se note sin abrir
el menú: badge rojo agregado en el propio ícono ☰
(`4K-POS-v5/index.html:461`, `id="ham-badge"`).

**Los 5 están confirmados en código y verificados en vivo** (login real +
capturas de pantalla en la sesión anterior). Commit `afee6c3` → release
**v5.4.88** (o cualquier versión posterior, sigue incluido).

---

## 4. "Turno abierto" se actualizaba muy espaciado (dashboard móvil)

**Confirmado el problema:** el indicador leía `DB.shiftStatuses`, poblado
por `loadShiftStatus()`, pero esa función solo se llamaba dentro del ciclo
pesado de `loadData()` cada 30s:
```
4kpos-dashboard.html:1108 (antes)  refreshInterval=setInterval(function(){loadData(false);},30000);
```
`loadData()` recarga el blob completo de `pos_data` (ventas, productos,
etc.) — no es la tabla `pos_data` la que tiene Realtime activo en este
archivo (ese Realtime vive en `4K-POS-v5/index.html`, es un proyecto
aparte); aquí todo se hace por `fetch()` REST normal, sin websockets.
Meter un poll de 10-15s a `loadData()` completo habría triplicado esa
carga pesada solo para refrescar un indicador chico.

**Lo que hice:** separé el estado de turno en su propio poll liviano,
que solo consulta la tabla `categories` (filas `shift_status_*`, ya
liviana de por sí vía `loadShiftStatus()`), cada 12 segundos:
```
4kpos-dashboard.html:1109-1111
    if(shiftPollInterval)clearInterval(shiftPollInterval);
    shiftPollInterval=setInterval(async function(){await loadShiftStatus();renderShiftStatus();},12000);
```
El poll pesado de `loadData()` (ventas/productos) se queda igual en 30s.

**Commit:** `304f93a` en `4kpos-dashboard` (repo aparte, ya pusheado a
`main` — no requiere instalar nada en el POS, se sirve solo desde GitHub
Pages).

---

## Resumen — qué instalar para verificar

| Punto | Repo | Commit | Versión a instalar |
|---|---|---|---|
| 1. Clock In/Out + fix de sync | `4kpos-app` | `7143eb8` | **v5.4.90** |
| 2. Sparklines Semana/Mes | `4kpos-dashboard` | `cdf1180` (sin cambios hoy) | ya publicado, sin versión de instalador |
| 3. Reorganización del menú | `4kpos-app` | `afee6c3` | **v5.4.88** (incluido también en v5.4.90) |
| 4. Turno abierto cada 12s | `4kpos-dashboard` | `304f93a` | ya publicado, sin versión de instalador |

**Instala la release `v5.4.90` de `4kpos-app`** para verificar los puntos
1 y 3 juntos. Los puntos 2 y 4 ya están live en
`4kpos.github.io/4kpos-dashboard/` sin necesidad de reinstalar el POS —
si no ves el cambio de inmediato, prueba en pestaña nueva/incógnito por
posible caché del navegador.

Pendiente real de tu lado para el punto 1: activar el toggle de
Configuración + marcar `useClockInOut` en al menos un empleado, si aún
no lo has hecho — sin eso el botón sigue oculto a propósito.
