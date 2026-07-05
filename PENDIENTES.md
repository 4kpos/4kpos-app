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

## 5. Buscador por nombre en "Productos comprados" — PENDIENTE (aún no implementado)

Confirmado con grep/cat: la pantalla es "Contabilidad → Compras"
(`Facturas` de proveedor), sección `COMPRAS DE INVENTARIO`:

```
4K-POS-v5/index.html:1365-1383  <!-- COMPRAS DE INVENTARIO --> ... <div class="slbl">Productos comprados</div> ... <div id="comp-items"></div>
```

Cada línea de producto se agrega con `compAddItem()` y se renderiza con
`renderCompItems()`, que arma un `<select>` con **todos** los productos
sin ningún filtro:

```
4K-POS-v5/index.html:7048-7051
function renderCompItems(){
  const opts='<option value="">'+t('invSelectProd')+'</option>'+(db.products||[]).map(function(p){
    return '<option value="'+p.id+'">'+escHtml(p.name)+' (Stock: '+(p.stock||0)+')</option>';
  }).join('');
```

No encontré ningún input de búsqueda/filtro por nombre ni en esta
función ni en el HTML de la sección (`comp-content`, líneas 1368-1395).
Confirmado: **no existe hoy** — es un `<select>` plano con el listado
completo de productos, sin escáner de código de barras tampoco en esta
pantalla específica. Falta implementar.

---

## 6. Calculadora sin soporte de teclado físico — PENDIENTE (aún no implementado)

Confirmado con grep/cat: la calculadora arma sus botones dinámicamente
y solo les asigna `onclick`, sin ningún listener de teclado:

```
4K-POS-v5/index.html:7834-7840
(function buildCalc(){
  const keys=[{l:'C',c:'cl s2'},{l:'⌫',c:'op'},{l:'÷',c:'op'},...];
  const g=el('fc-grid');
  keys.forEach(k=>{const b=document.createElement('button');...
    b.onclick=()=>calcPress(k.l);g.appendChild(b);});
  ...
})();
```

Busqué cualquier `addEventListener('keydown'...)` relacionado con
`fcalc`/`fc-grid`/`calcPress` en todo el archivo — los únicos
`keydown` que existen (líneas 1860, 4819, 5720, 7690, 7915, 8112, 8146)
son para: bloquear DevTools, inputs de búsqueda/cantidad (Enter/Escape),
y otros modales — **ninguno** alimenta `calcPress()`. Confirmado: la
calculadora solo responde a clics de mouse hoy. Falta implementar un
listener de teclado (mientras `#fcalc` tenga la clase `open`) que
mapee dígitos, `+ - * /`, Enter/`=`, Backspace/`⌫` y Escape hacia
`calcPress()`.

---

## 7. Auditoría de traducciones ES/EN — reporte (aún sin corregir, como pediste)

Encargué una auditoría de solo-lectura (grep/cat) de todo
`4K-POS-v5/index.html` (9243 líneas) contra el sistema `T`/`t()`/
`applyLang()` (líneas 1930, 2843, 2982-3505). Resultado: **~140+ sitios
de texto hardcodeado confirmados**, repartidos así:

| Categoría | Cantidad aprox. | Detalle |
|---|---|---|
| Menú hamburguesa (`#ham-menu`) completo | ~24 strings | Todo el dropdown, sin un solo `id` cubierto por `applyLang()` |
| `toast('...')` literal vs `toast(t('...'))` | 80 literales / 77 traducidos | ~51% de los toasts son texto fijo en español |
| Placeholders sin cobertura en `applyLang()` | ~8 confirmados | La mayoría de placeholders SÍ están cubiertos — estos son la excepción |
| Tooltips (`title="..."`) hardcodeados | ~15+ | Sobre todo botones que solo tienen ícono/emoji |
| Encabezados de tabla en HTML generado por JS | ~4 funciones (12+ `<th>`) | Inconsistente: mismas funciones con una tabla traducida y otra no |
| Botones del diálogo de confirmación global | 2 (usado en ~25 lugares) | `Cancelar` / `Confirmar` nunca cambian de idioma |

**Hallazgo más grande — el menú hamburguesa completo nunca se tradujo:**
```
4K-POS-v5/index.html:464  <div class="ham-sec">PRINCIPAL</div>
4K-POS-v5/index.html:465  <button ...>📊 Dashboard</button>
4K-POS-v5/index.html:467  ...<span style="flex:1">Notificaciones</span>...   ← solo el title="" se traduce, el texto visible no
4K-POS-v5/index.html:469  <span>💰 Ventas e Inventario</span>
4K-POS-v5/index.html:471-477  Ventas del día / Devoluciones / Créditos / Productos / Categorías / Inventario / Etiquetas
4K-POS-v5/index.html:479  <span>👥 Administración y Configuración</span>
4K-POS-v5/index.html:481-491  Usuarios / Nómina / Auditoría / Nota de turno / Actualizaciones / Config·Ajustes / Idioma / Tema / Contabilidad / Registradora
4K-POS-v5/index.html:494  <div class="ham-sec">ACCIONES</div>
4K-POS-v5/index.html:495-498  Clock In/Out / Cerrar turno / Buscar actualizaciones
```
No existe ninguna clave `PRINCIPAL` ni `ACCIONES` en el diccionario `T`
(confirmado con grep). Este menú es una pieza de UI más nueva que nunca
se conectó a `applyLang()` — a diferencia del panel `#ov-unified`
(pestañas Productos/Usuarios/etc.), que sí usa `<span id="tab-prods-txt">`
+ `t('tabProds')` correctamente.

**Botones de confirmar/cancelar globales — alto impacto, bajo esfuerzo de arreglar:**
```
4K-POS-v5/index.html:1525  <p id="conf-msg">¿Confirmar?</p>            ← el mensaje SÍ se traduce por llamada, pero el default no
4K-POS-v5/index.html:1527  <button ... onclick="confNo()">Cancelar</button>   ← sin id, nunca traducido
4K-POS-v5/index.html:1528  <button ... onclick="confYes()">Confirmar</button> ← sin id, nunca traducido
```
Este único diálogo (`confirm2()`) se usa en ~25 lugares del programa
(borrar producto, borrar empleado, cerrar turno, etc.) — arreglar estos
2 botones arregla la mayoría de las confirmaciones de la app de un solo
golpe.

**Muestra de `toast()` 100% en español fijo** (hay 80 en total, esta es
una muestra representativa con cita exacta):
```
4K-POS-v5/index.html:5556  toast('Selecciona empleado y hora');
4K-POS-v5/index.html:5564  toast('La salida debe ser después de la entrada');
4K-POS-v5/index.html:6014  toast('⚠ Nombre requerido');
4K-POS-v5/index.html:6016  toast('⚠ Ya existe un cliente con esa cédula');
4K-POS-v5/index.html:7091  toast('⚠ El nombre del proveedor es obligatorio');
4K-POS-v5/index.html:7121  toast('✅ Factura guardada. Stock actualizado — '+facItems.length+' producto(s), total '+dolr(total));
4K-POS-v5/index.html:7163  toast('🗑 Factura eliminada — stock revertido');
```
Patrón encontrado: los flujos de carrito/checkout/crédito sí usan
`toast('⚠ '+t('key'))` de forma consistente; las áreas de **Facturas de
compra (~7091-7172), nómina/clock in-out (~5556-5717) y respaldo/backup
(~5826-5852)** son casi 100% texto fijo.

**Encabezados de tabla inconsistentes dentro de la misma función:**
```
4K-POS-v5/index.html:7731       <th>Fecha</th><th>Entrada</th><th>Salida</th><th>Hrs</th>     ← hardcodeado
4K-POS-v5/index.html:7809-7813  ...misma función renderMonthlyResumen(), la OTRA tabla sí usa t('empNameLbl') etc.
```

**Placeholders sin cubrir (los pocos que sí faltan):**
```
4K-POS-v5/index.html:772   id="u-user" placeholder="maria123"
4K-POS-v5/index.html:992   id="cmb-name" placeholder="Ej: Combo Familiar"
4K-POS-v5/index.html:1060  id="emp-name" placeholder="Juan Pérez"
4K-POS-v5/index.html:1631  id="oa-name" placeholder="Ej: Juan"
4K-POS-v5/index.html:1632  id="oa-table" placeholder="Ej: Mesa 3"
4K-POS-v5/index.html:915   id="cfg-tax-rate" placeholder="Ej: 18"
```
(la gran mayoría de placeholders del resto de la app SÍ están bien
cubiertos por `applyLang()` — no es un problema generalizado, solo estos).

**Otros hallazgos puntuales:**
- Tarjetas del dashboard interno (`Ventas hoy`, `Transacciones`,
  `Créditos pendientes`, `Ticket promedio`, `Venta total`, `Ventas por
  período`, `Top 5 productos`, `Métodos de pago hoy`, `Semáforo de
  stock` — líneas 566-617) — texto plano sin `id`, candidatas a revisar.
- Overlay de error de licencia (líneas 637-654): "Error de licencia",
  "Contacta a soporte.", "Cerrar programa", "Límite de PCs alcanzado" —
  todo hardcodeado.

**No corregí nada de esto todavía** — es el reporte que pediste "antes
de corregirlos". Si quieres, en la próxima ronda lo puedo arreglar
empezando por lo de mayor impacto/menor esfuerzo: (1) los 2 botones del
diálogo de confirmación global, (2) el menú hamburguesa completo
(agregar ids + entradas en `applyLang()`), y después ir por los `toast()`
literales por bloques (facturas, nómina, backup).

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
| 5. Buscador en Productos comprados | `4kpos-app` | — (pendiente, sin implementar) | — |
| 6. Calculadora con teclado físico | `4kpos-app` | — (pendiente, sin implementar) | — |
| 7. Auditoría traducciones ES/EN | `4kpos-app` | — (solo reporte, sin corregir) | — |

**Instala la release `v5.4.92`** para verificar los puntos 1 al 4. Los
puntos 5, 6 y 7 quedan documentados y confirmados con evidencia real
(grep/cat) pero **todavía no se implementaron** — a la espera de que me
digas si seguimos con esos ahora o en otra ronda.
