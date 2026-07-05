# Pendientes — verificación con evidencia (2026-07-04)

Para cada punto: código real citado (archivo + línea), qué hace, y por qué
podría no verse en la app aunque el código exista.

---

## 1. Clock In/Out en el menú hamburguesa

**Estado real: el botón y el flujo completo SÍ existen en el código**, pero
están ocultos por una condición de configuración — probablemente por eso
"no se ve".

Botón dentro del acordeón "Ventas e Inventario" del menú:

```
4K-POS-v5/index.html:478
<button class="ham-item ham-sub" id="ham-clock-item" style="display:none;color:#10b981" onclick="closeHamMenu();openClockQuick()">⏱ Clock In/Out</button>
```

Nótese `style="display:none"` — arranca oculto. Se muestra solo si se cumplen
**las dos condiciones siguientes a la vez**:

```
4K-POS-v5/index.html:5466
const enabled=db.settings&&db.settings.clockQuickEnabled;
4K-POS-v5/index.html:5467
const hasClock=(db.employees||[]).some(function(e){return e.useClockInOut;});
...
4K-POS-v5/index.html:5471
const hamClock=el('ham-clock-item');if(hamClock)hamClock.style.display=(enabled&&hasClock)?'':'none';
```

`clockQuickEnabled` es `false` por defecto:
```
4K-POS-v5/index.html:2853
settings:{...,clockQuickEnabled:false}
```

Se activa desde Configuración con este toggle (por ahora probablemente
apagado en tu instalación):
```
4K-POS-v5/index.html:923
<div class="tog"><span class="tog-label" id="cfg-clock-quick-lbl">⏱ Mostrar botón Clock In/Out en menú</span><label class="tog-sw"><input type="checkbox" id="cfg-clock-quick" onchange="saveClockQuickCfg()"><span class="slider"></span></label></div>
```

Y además necesita que **al menos un empleado** tenga marcado "usar reloj
checador" (`useClockInOut:true`) en su ficha, en Usuarios/Nómina.

El flujo de selección de usuario + contraseña **ya está implementado**
(no es un placeholder):

```
4K-POS-v5/index.html:5494  function openClockQuick(){...}       → abre modal, lista empleados
4K-POS-v5/index.html:5578  function renderClockQuickList(){...} → un botón Entrada/Salida por empleado
4K-POS-v5/index.html:5599  function cqClockWithPin(id){...}     → pide contraseña de esa cuenta
4K-POS-v5/index.html:5611  function cqVerifyPass(){...}         → valida contra db.users (bcrypt), solo
                                                                    el propio usuario o un admin puede fichar
```

**Conclusión:** no está "sin implementar" — está implementado y reubicado
correctamente en el menú (commit `afee6c3`), pero permanece invisible hasta
que actives el toggle de Configuración Y marques `useClockInOut` en al
menos un empleado. Si lo que quieres es que aparezca siempre sin ese
requisito, eso es un cambio de comportamiento nuevo a decidir, no un bug.

---

## 2. Mini-gráficas (sparklines) en Semana/Mes — dashboard móvil

**Este código vive en otro repositorio**, no en `4kpos-app`:
`C:\Users\4k\4kpos-dashboard` (`4kpos-dashboard.html`, servido por GitHub
Pages en `4kpos.github.io/4kpos-dashboard/`, abierto desde el POS solo vía
QR — no está embebido en el instalador de Windows).

**Estado real: el código SÍ existe, está commiteado y pusheado** a
`origin/main` de ese repo (verificado con `git status` → "up to date with
origin/main", "nothing to commit"):

```
4kpos-dashboard.html:560  function makeSpark(vals,color){...}     → genera el SVG del sparkline
4kpos-dashboard.html:702  // Sparklines — totales diarios de los últimos 7 días  (renderWeek)
4kpos-dashboard.html:707  var _si=document.getElementById('w-spark-inc');if(_si)_si.innerHTML=makeSpark(_v7,'#34d399');
4kpos-dashboard.html:721  // Sparklines — totales diarios de los últimos 30 días (renderMonth)
4kpos-dashboard.html:726  var _mi=document.getElementById('m-spark-inc');if(_mi)_mi.innerHTML=makeSpark(_v30,'#34d399');
```

Y los contenedores existen en las tarjetas KPI de ambas pestañas:

```
4kpos-dashboard.html:279  <div id="w-spark-inc" style="margin-top:8px;line-height:0"></div>   (Esta semana)
4kpos-dashboard.html:280  <div id="w-spark-avg" style="margin-top:8px;line-height:0"></div>
4kpos-dashboard.html:281  <div id="w-spark-best" style="margin-top:8px;line-height:0"></div>
4kpos-dashboard.html:282  <div id="w-spark-yest" style="margin-top:8px;line-height:0"></div>
4kpos-dashboard.html:292  <div id="m-spark-inc" style="margin-top:8px;line-height:0"></div>    (Este mes)
4kpos-dashboard.html:293  <div id="m-spark-avg" style="margin-top:8px;line-height:0"></div>
```

Commit: `cdf1180` — "feat(mobile-dashboard): sparklines SVG en pestañas
Semana y Mes" (2026-07-04 16:49).

**Lo que NO pude verificar yo:** no abrí el dashboard real en un navegador
con tus datos sincronizados (necesita license key + datos de Supabase), así
que no confirmé con mis propios ojos que se dibuje en tu teléfono. Si tú lo
abriste y no lo viste, las causas más probables — en orden de probabilidad —
son:
- **Caché del navegador/PWA** en el teléfono: si lo instalaste como PWA o
  ya lo tenías abierto en una pestaña, puede seguir sirviendo la versión
  vieja. Prueba cerrar completamente la pestaña/app y volver a abrir, o
  forzar refresco (en Android Chrome: menú → Configuración → Privacidad →
  Borrar datos de navegación, solo para ese sitio; o desinstalar/reinstalar
  la PWA).
- El sparkline solo dibuja una línea de 7 o 30 puntos; si son todos $0
  (sin ventas en esos días) se ve como una línea plana casi invisible, no
  como que "no está" — vale la pena mirar de cerca.

No es un caso de "código faltante": el código está y está publicado.

---

## 3. Reorganización del menú hamburguesa

**Confirmado: sí se aplicó**, commit `afee6c3` en `4kpos-app` (incluido en
la release `v5.4.88`).

Categorías fusionadas:
```
4K-POS-v5/index.html:469  <button class="ham-acc-hdr" onclick="toggleHamSection('ham-s-ventinv')"><span>💰 Ventas e Inventario</span>...
4K-POS-v5/index.html:480  <button class="ham-acc-hdr" onclick="toggleHamSection('ham-s-admcfg')"><span>👥 Administración y Configuración</span>...
```

Refrescar fuera del menú, de vuelta en la topbar:
```
4K-POS-v5/index.html:450  <button id="refresh-btn" onclick="refreshPOS()" title="Actualizar datos">🔄</button>
```
(y ya no existe ningún `<button ... onclick="refreshPOS()">` dentro de
`#ham-menu` — se movió, no se duplicó.)

Campana y buzón dentro del menú, con badge rojo:
```
4K-POS-v5/index.html:466  <button class="ham-item" id="notif-btn" onclick="closeHamMenu();toggleNotifPanel()" title="Notificaciones">🔔 <span style="flex:1">Notificaciones</span><span id="notif-badge">0</span></button>
4K-POS-v5/index.html:467  <button class="ham-item" id="note-btn" onclick="closeHamMenu();openWriteNote()" title="Nota para el próximo turno">📬 <span style="flex:1">Nota para el próximo turno</span><span id="note-badge">1</span></button>
```
Ya no existen esos dos botones en la topbar (`#topbar .top-mid`).

Badge agregado extra en el propio ícono ☰, visible sin abrir el menú:
```
4K-POS-v5/index.html:461  <span id="ham-badge" style="display:none;position:absolute;...">0</span>
4K-POS-v5/index.html:8023 function _updateHamBadge(){...} // suma notificaciones sin leer + nota pendiente
```

Verificado en vivo (no solo por código): abrí la app real con Playwright,
inicié sesión como Admin y tomé capturas — el acordeón fusionado, el badge
rojo "2" en Notificaciones y en el ícono ☰, y el botón 🔄 en la topbar se
ven exactamente como se describe arriba.

---

## Versión / commit a instalar

| Item | Repo | Commit | Incluido en |
|---|---|---|---|
| 1. Clock In/Out (reubicado, gating existente) | `4kpos-app` | `afee6c3` | **v5.4.88** |
| 3. Reorganización del menú | `4kpos-app` | `afee6c3` | **v5.4.88** |
| 2. Sparklines dashboard móvil | `4kpos-dashboard` (repo aparte, sin versión de instalador — se sirve directo desde GitHub Pages) | `cdf1180` | ya publicado en `origin/main`, no requiere instalar nada en el POS |

**Instala/descarga la release `v5.4.88` de `4kpos-app`** (tag creado
automáticamente por el workflow de GitHub Actions tras el push de
`afee6c3`) para los puntos 1 y 3. El punto 2 no depende de qué versión del
POS instales — se actualiza solo la próxima vez que el navegador/PWA del
dashboard cargue la versión nueva de `4kpos-dashboard.html`.
