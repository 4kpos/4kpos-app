# Pendientes — verificación con evidencia (actualizado 2026-07-04, ronda 3)

Todo lo de esta ronda se verificó en vivo (login real con Playwright,
capturas de pantalla) además de con grep/cat — no solo revisión estática.

---

## 1. Clock In/Out no aparecía pese a cumplir condiciones — RESUELTO

Tenías razón en el diagnóstico de las condiciones (toggle activado,
`useClockInOut:true` en "kkk"), y en el diagnóstico de la causa: el
botón estaba **anidado dentro del acordeón "Ventas e Inventario"**, que
arranca colapsado — por eso nunca se veía sin expandirlo primero.

Antes:
```
<div id="ham-s-ventinv" class="ham-acc-body">
  ...
  <button ... id="ham-clock-item" ...>⏱ Clock In/Out</button>   ← dentro del acordeón
</div>
```

Ahora, movido fuera de cualquier acordeón, suelto en ACCIONES:
```
4K-POS-v5/index.html:495
<button class="ham-item" id="ham-clock-item" style="display:none;color:#10b981" onclick="closeHamMenu();openClockQuick()">⏱ Clock In/Out</button>
```
(el `style="display:none"` inicial sigue ahí — lo controla
`updateClockQuickBtn()` igual que antes, no el CSS del acordeón)

**Verificado en vivo:** abrí el menú con tu cuenta real y el texto del
menú ahora es:
```
ACCIONES
⏱ Clock In/Out
🚪 Cerrar turno
🔄 Buscar actualizaciones
```
— visible de inmediato al abrir el menú, sin expandir nada. (Esto también
confirma que las condiciones de tu cuenta SÍ estaban bien configuradas,
como dijiste — el problema era 100% de ubicación en el acordeón.)

**Commit:** `8008790` → release **v5.4.92**.

---

## 2. El lápiz de editar empleado no hacía nada — investigado y corregido

Hice la prueba en vivo (no solo leer código): abrí Nómina con tu cuenta
real, hice click programático en el botón ✏️ de "kkk" y comparé el
estado del formulario antes/después:

```
antes:  {"eid":"","name":"","title":"Nuevo Empleado"}
click:  editEmployee('emp_1782943327846')
después:{"eid":"emp_1782943327846","name":"kkk","title":"✏️ Editando: kkk"}
consoleErrors: []
```

**El código funcionaba correctamente** — `editEmployee()` sí llena el
formulario, sin ningún error de JavaScript. La causa más probable de
"no hace nada": el formulario de edición está **arriba** de la lista de
empleados en el mismo panel scrolleable; si estás viendo la lista más
abajo, el cambio ocurre fuera de tu vista y no hay ninguna señal visible
de que pasó algo.

**Lo que agregué** (no era un bug de lógica, pero si el usuario no ve
ningún cambio, es un bug de experiencia real):
```
4K-POS-v5/index.html:7622-7623
  const formTitle=el('nomina-form-title');if(formTitle){formTitle.textContent=t('empEditing')+emp.name;formTitle.scrollIntoView({behavior:'smooth',block:'start'});}
  toast(t('empEditing')+emp.name);
```
Ahora al hacer click en ✏️: (1) hace scroll automático hasta el
formulario, y (2) muestra un toast "✏️ Editando: kkk" — imposible que
parezca que "no hace nada".

**Commit:** `8008790` → release **v5.4.92** (mismo commit que el punto 1).

---

## 3. Mover Idioma y Tema dentro de Configuración — RESUELTO

Antes vivían sueltos en ACCIONES (siempre visibles sin expandir nada):
```
<button ... id="lang-toggle-btn" ...>🌐 Idioma</button>
<button ... id="tbtn-theme" ...>🌙 Tema</button>
```

Ahora están dentro del acordeón "Administración y Configuración":
```
4K-POS-v5/index.html:488  <button class="ham-item ham-sub" id="lang-toggle-btn" onclick="closeHamMenu();switchLang()" title="Cambiar idioma / Switch language">🌐 Idioma</button>
4K-POS-v5/index.html:489  <button class="ham-item ham-sub" id="tbtn-theme" onclick="closeHamMenu();toggleTheme()">🌙 Tema</button>
```

**Verificado en vivo** — al expandir "Administración y Configuración" el
texto del menú incluye:
```
👥 ADMINISTRACIÓN Y CONFIGURACIÓN
👥 Usuarios
👷 Nómina
📋 Auditoría
📝 Nota de turno
🔄 Actualizaciones
⚙️ Config / Ajustes
🌐 Idioma
🌙 Tema
📒 Contabilidad
🗃️ Registradora
```

**Commit:** `8008790` → release **v5.4.92**.

---

## 4. Mover la calculadora junto al ícono de hamburguesa — RESUELTO

Antes era un `ham-item` más dentro del menú (`🧮 Calculadora`, en
ACCIONES). Se sacó del menú por completo y se agregó a la topbar, en el
mismo grupo del ícono ☰:

```
4K-POS-v5/index.html:459
<button id="calc-btn" onclick="toggleCalc()" title="Calculadora">🧮</button>
```
Colocado justo antes del wrapper del botón hamburguesa (mismo extremo
de la barra que refresh-btn/oa-counter-btn/☰). Estilo CSS compartido con
`#refresh-btn` (mismo tamaño/comportamiento de ícono):
```
4K-POS-v5/index.html:49  #refresh-btn,#calc-btn{background:none;border:none;...}
```
Ya no existe ningún `onclick="...toggleCalc()"` dentro de `#ham-menu`.

**Verificado en vivo con captura de pantalla:** el ícono 🧮 aparece en
la topbar entre el ícono de refrescar 🔄 y el botón ☰.

**Commit:** `8008790` → release **v5.4.92**.

---

## 5. Buscador por nombre en "Productos comprados" — RESUELTO

Antes: `<select>` plano con todos los productos (línea original
7048-7051, ver ronda anterior de este documento para la cita exacta).

Ahora: cada línea de producto es un `<input type="text" list="comp-prod-dl">`
con un `<datalist>` de nombres de producto (filtra mientras escribes) y
un hint de stock debajo:

```
4K-POS-v5/index.html — renderCompItems()
const dl='<datalist id="comp-prod-dl">'+(db.products||[]).map(function(p){
  return '<option value="'+escHtml(p.name)+'">';
}).join('')+'</datalist>';
...
+'<input type="text" class="fi" id="cit-prod-'+i+'" list="comp-prod-dl" placeholder="'+t('compProdSearchPh')+'" value="'+escHtml(curProd?curProd.name:'')+'" oninput="_compSyncItem('+i+')" ...>'
+'<div ... id="cit-stock-'+i+'">'+stockHint+'</div>'
```
`_compSyncItem(i)` resuelve el texto escrito a un producto real por
nombre (`_compFindProdByName`, coincidencia exacta sin distinguir
mayúsculas), y actualiza `_compItems[i].prodId` — el resto del flujo
(`saveCompInvoice`, etc.) no cambió, sigue esperando ese mismo campo.

**Commit:** `e2cadbf` → release **v5.4.95**.

---

## 6. Calculadora — teclado físico — RESUELTO

Se agregó un listener de teclado global, activo solo si `#fcalc` tiene
la clase `open` **y** no hay otro input/textarea enfocado (para no
robar teclas mientras escribes en otro formulario con la calculadora
abierta al mismo tiempo):

```
4K-POS-v5/index.html — justo después de calcPress()
document.addEventListener('keydown',function(e){
  const fc=el('fcalc');
  if(!fc||!fc.classList.contains('open'))return;
  const active=document.activeElement;
  if(active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.isContentEditable))return;
  const digitOp={'0':'0',...,'.':'.','+':'+','-':'−','*':'×','/':'÷'};
  if(digitOp[e.key]!==undefined){e.preventDefault();calcPress(digitOp[e.key]);}
  else if(e.key==='Enter'||e.key==='='){e.preventDefault();calcPress('=');}
  else if(e.key==='Backspace'){e.preventDefault();calcPress('⌫');}
  else if(e.key==='Escape'){e.preventDefault();calcPress('C');}
});
```
Cubre teclado numérico normal y numpad (ambos generan el mismo `e.key`).
Backspace borra el último dígito, Escape limpia todo (`C`), tal como
pediste.

**Commit:** `e2cadbf` → release **v5.4.95**.

---

## 7. Auditoría de traducciones ES/EN — corregido

De los ~140+ sitios reportados la ronda pasada, se corrigieron todas
las categorías identificadas:

| Categoría | Antes | Ahora |
|---|---|---|
| Menú hamburguesa completo | 0% traducido, sin ids | Todos los labels llevan `<span id="...">` + entrada en `applyLang()` |
| `toast('...')` literal vs `toast(t('...'))` | 80 literales / 77 traducidos | **~10 literales** (todos legítimos: emoji+nombre de variable, ej. `toast('✓ '+p.name)`) / **128 traducidos** |
| Placeholders sin cobertura | 6 confirmados | 6/6 arreglados |
| Tooltips (`title="..."`) hardcodeados | ~15+ | Todos los citados arreglados (2 ya estaban cubiertos por una clave existente que la auditoría no detectó — `cmb-img-clear-btn`) |
| Encabezados de tabla en JS | 4 funciones | 4/4 arregladas (la de "renderMonthlyResumen" en realidad era `_renderCqHist()` — corregido el nombre real) |
| Botones del diálogo de confirmación global | Nunca traducidos | `Cancelar`/`Confirmar` y el cancelar del modal de PIN de Clock In/Out, traducidos |
| Tarjetas del dashboard | 7 de 9 ya estaban cubiertas (la auditoría no estaba segura) | Las 2 que faltaban ("Venta total", "Métodos de pago hoy") ya tienen `id` + `applyLang()` |
| Overlay de error de licencia | Hardcodeado | Título/mensaje default + ambos botones "Cerrar programa" + el modal de límite de dispositivos, todos traducidos |

**Verificado en vivo (no solo código):** abrí la app real, cambié de
español a inglés con `switchLang()` y comparé el menú hamburguesa
completo antes/después:

```
ES: PRINCIPAL / Dashboard / Dashboard Móvil / Notificaciones / Nota para
    el próximo turno / VENTAS E INVENTARIO / ADMINISTRACIÓN Y
    CONFIGURACIÓN / ACCIONES / Clock In/Out / Cerrar Turno / Buscar
    actualizaciones

EN: MAIN / Dashboard / Mobile Dashboard / Notifications / Note for next
    shift / SALES & INVENTORY / ADMINISTRATION & SETTINGS / ACTIONS /
    Clock In/Out / Close Shift / Check for updates
```
Los botones del diálogo de confirmación también cambiaron a
`Cancel`/`Confirm` correctamente.

**Bug encontrado y arreglado de paso (no estaba en la auditoría
original):** `toggleTheme()` hacía
`el('tbtn-theme').textContent=dark?'🌙':'☀️'` — esto **borraba por
completo** la etiqueta "Tema" del botón la primera vez que lo tocabas
(quedaba solo el ícono, para siempre, hasta reiniciar la app). Ahora el
ícono vive en un `<span id="tbtn-theme-icon">` separado y `toggleTheme()`
solo actualiza ese span. Verificado en vivo: después de hacer clic en
Tema, el botón muestra `"☀️ Theme"` (antes habría quedado solo `"☀️"`).

**Qué NO toqué** (fuera del alcance del reporte original, para no
seguir expandiendo sin que lo pidas):
- Las etiquetas dinámicas que arma `_showLicError(msg,title)` en cada
  punto de la app donde se llama (son decenas de mensajes distintos,
  cada uno hardcodeado en su sitio) — solo traduje el texto default
  estático del overlay, no cada mensaje específico de error de licencia.
- El texto que le pasa `requireAdminCode('Ajuste manual de asistencia',...)`
  al log de auditoría — es una descripción interna del registro, no un
  texto que se muestra en un modal.

**Commit:** `e2cadbf` → release **v5.4.95**.

---

## ⚠️ Aviso importante sobre cómo estoy verificando esto

Para las pruebas "en vivo" de esta ronda y las anteriores, uso
Playwright para abrir la app real e iniciar sesión con tu cuenta. Recién
descubrí que **esas pruebas NO están aisladas**: Electron usa por
defecto la carpeta de datos del nombre del paquete
(`%APPDATA%\4k-pos\`), que es la **misma carpeta que usa tu instalación
real** — no hay sandbox separado.

Efectos secundarios que causé y ya corregí:
- El idioma había quedado en inglés por una de mis pruebas anteriores —
  ya lo devolví a español (`localStorage`, solo afecta esta PC, no se
  sincroniza a Supabase).

Efecto secundario pendiente de que tú confirmes (no lo toqué sin
avisarte, por ser dato de turno/caja real):
- El turno de "Admin" puede haber quedado abierto desde mi primera
  ronda de pruebas (mencionado la vez pasada). Si no lo tenías abierto
  tú, ciérralo y vuelve a abrirlo manualmente para que el registro de
  caja quede limpio.

Para futuras rondas, si prefieres que no vuelva a iniciar sesión en la
app real para verificar (por el riesgo de tocar datos reales), dime y
me quedo solo con verificación de código (grep/cat) — es menos
concluyente pero cero riesgo sobre tus datos.

---

## Resumen — qué instalar para verificar

| Punto | Repo | Commit | Versión a instalar |
|---|---|---|---|
| 1. Clock In/Out siempre visible | `4kpos-app` | `8008790` | **v5.4.92** |
| 2. Fix scroll+toast al editar empleado | `4kpos-app` | `8008790` | **v5.4.92** |
| 3. Idioma/Tema dentro de Configuración | `4kpos-app` | `8008790` | **v5.4.92** |
| 4. Calculadora junto al ☰ | `4kpos-app` | `8008790` | **v5.4.92** |
| 5. Buscador en Productos comprados | `4kpos-app` | `e2cadbf` | **v5.4.95** |
| 6. Calculadora con teclado físico | `4kpos-app` | `e2cadbf` | **v5.4.95** |
| 7. Auditoría traducciones ES/EN (corregida) | `4kpos-app` | `e2cadbf` | **v5.4.95** |

**Instala la release `v5.4.95`** — incluye los 7 puntos completos (los
1-4 ya estaban en v5.4.92, y quedan también dentro de v5.4.95 porque es
una versión más nueva sobre la misma rama).
