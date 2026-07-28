const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────
// Data: 33 sections, grouped, bilingual. Kept as plain objects so the HTML
// is generated from one source of truth instead of hand-duplicated markup.
// ─────────────────────────────────────────────────────────────────────────

const groups = [
  { id: 'g0', es: 'Antes de entrar', en: 'Before you start' },
  { id: 'g1', es: 'Una vez adentro', en: 'Once you are in' },
  { id: 'g2', es: 'Vender', en: 'Selling' },
  { id: 'g3', es: 'Consultar ventas', en: 'Checking sales' },
  { id: 'g4', es: 'Catálogo e inventario', en: 'Catalog & inventory' },
  { id: 'g5', es: 'Clientes', en: 'Customers' },
  { id: 'g6', es: 'Panel gerencial', en: 'Management panel' },
  { id: 'g7', es: 'Configuración', en: 'Settings' },
  { id: 'g8', es: 'Fuera del POS', en: 'Outside the POS' },
];

const S = [
{ n:1, group:'g0', admin:false,
  es:{ title:'Activación de licencia', purpose:'La primera vez que abrís 4K POS en una computadora nueva, te va a pedir una clave de activación antes de dejarte entrar.',
    steps:[ 'Escribí la clave que recibiste al comprar (formato 4K-XXXX-XXXX-XXXX) en el campo "Clave de activación".',
      'Tocá "Activar ahora". El sistema valida la clave contra el servidor y, si es válida, abre el POS automáticamente.',
      'Si no tenés clave todavía, tocá "Compra aquí" (te lleva a la página web) o escribí a soporte con el email que aparece en pantalla.',
      'Si preferís, podés escribir tu correo en "Solicitar acceso por email" y te llega la clave ahí.' ],
    note:'El "Hardware ID de este equipo" que aparece abajo es un número único de esta PC — soporte te lo va a pedir si necesitás transferir tu licencia a otra computadora.' },
  en:{ title:'License activation', purpose:'The first time you open 4K POS on a new computer, it will ask for an activation key before letting you in.',
    steps:[ 'Type the key you received when you purchased (format 4K-XXXX-XXXX-XXXX) into the "Activation key" field.',
      'Tap "Activate now". The system checks the key against the server and, if valid, opens the POS automatically.',
      'If you don\'t have a key yet, tap "Buy here" (takes you to the website) or email support using the address shown on screen.',
      'You can also enter your email under "Request access by email" and the key will be sent there.' ],
    note:'The "Hardware ID of this device" shown below is a unique number for this PC — support will ask for it if you ever need to move your license to another computer.' },
  imgs:[{f:'01-activacion.png', w:45}] },

{ n:2, group:'g0', admin:false,
  es:{ title:'Login y apertura de turno', purpose:'Cada vez que alguien va a usar el POS, primero elige su usuario y confirma cuánto efectivo hay en la caja.',
    steps:[ 'Elegí tu nombre en la lista y escribí tu contraseña.',
      'Tocá "Entrar al turno".',
      'La pantalla de Apertura de Turno te muestra el fondo de caja configurado — confirmá que ese monto está realmente en la caja física.',
      'Tocá "Confirmar y Abrir Turno" para empezar a vender.' ],
    note:'Si el fondo de caja no coincide con lo que hay en la caja, avisá a un administrador ANTES de confirmar — una vez abierto el turno, ese número queda como punto de partida para el cuadre del día.' },
  en:{ title:'Login and opening a shift', purpose:'Every time someone is about to use the POS, they first pick their user and confirm how much cash is in the drawer.',
    steps:[ 'Pick your name from the list and type your password.',
      'Tap "Start shift".',
      'The Shift Opening screen shows the configured starting cash — confirm that amount is actually in the physical drawer.',
      'Tap "Confirm & Open Shift" to start selling.' ],
    note:'If the starting cash doesn\'t match what\'s in the drawer, tell an administrator BEFORE confirming — once the shift is open, that number becomes the baseline for the day\'s cash count.' },
  imgs:[{f:'02-login.png', w:38, en:true},{f:'03-shift-open.png', w:38, en:true}] },

{ n:3, group:'g1', admin:false,
  es:{ title:'Barra lateral (Sidebar)', purpose:'Es el menú de navegación principal, siempre visible a la izquierda. Desde ahí llegás a todas las demás pantallas.',
    steps:[ '"Vender" te lleva a la pantalla de cobro. Debajo tiene dos atajos: "Ventas del día" y "Devoluciones".',
      '"Productos", "Clientes", "Reportes", "Administración" y "Contabilidad" abren el menú de administración en la pestaña correspondiente (piden código de administrador).',
      '"Configuración" abre los ajustes del sistema.',
      'Al final: Cerrar Turno, Nota para el próximo turno, Registradora, Dashboard Móvil, Idioma, Tema, Buscar actualizaciones y Soporte.' ],
    note:'Podés plegar la barra lateral con la flechita de arriba para tener más espacio en pantalla.' },
  en:{ title:'Sidebar navigation', purpose:'This is the main navigation menu, always visible on the left. Every other screen is reached from here.',
    steps:[ '"Sell" takes you to the checkout screen. Below it are two shortcuts: "Today\'s sales" and "Returns".',
      '"Products", "Customers", "Reports", "Administration" and "Accounting" open the admin menu on the matching tab (these ask for the administrator code).',
      '"Settings" opens the system configuration.',
      'At the bottom: Close Shift, Note for next shift, Cash Drawer, Mobile Dashboard, Language, Theme, Check for updates and Support.' ],
    note:'You can collapse the sidebar with the small arrow at the top to get more screen space.' },
  imgs:[{f:'04-sidebar.png', w:70, en:true}] },

{ n:4, group:'g1', admin:false,
  es:{ title:'Badge de licencia (topbar)', purpose:'Un indicador chico arriba a la derecha te avisa el estado de tu licencia sin tener que ir a buscarlo.',
    steps:[ 'Verde con un check: la licencia está activa y le quedan más de 7 días.',
      'Naranja con ⚠: quedan menos de 7 días — es momento de renovar.',
      'Si la licencia vence de verdad, el sistema bloquea el POS por completo hasta que se renueve.' ],
    note:'Cuando veas el aviso naranja, tocá "Renovar / Soporte" en la tarjeta "Mi Licencia" (Configuración) para coordinar el pago antes de que se corte el servicio.' },
  en:{ title:'License badge (top bar)', purpose:'A small indicator in the top-right corner shows your license status at a glance.',
    steps:[ 'Green with a check: the license is active with more than 7 days left.',
      'Orange with ⚠: fewer than 7 days left — time to renew.',
      'If the license actually expires, the system blocks the POS entirely until it\'s renewed.' ],
    note:'When you see the orange warning, tap "Renew / Support" on the "My License" card (Settings) to arrange payment before the service is interrupted.' },
  imgs:[{f:'05-badge-licencia.png', w:55}] },

{ n:5, group:'g1', admin:false,
  es:{ title:'Notificaciones (campana)', purpose:'El ícono de campana en la barra superior avisa de dos cosas que necesitan tu atención: stock bajo y créditos por vencer o vencidos.',
    steps:[ 'Tocá la campana para abrir el panel.',
      'Rojo = vencido o sin stock. Naranja = por vencer (3 días o menos) o stock bajo el mínimo.',
      '"Marcar leídas" limpia el contador sin borrar los avisos.',
      'Un aviso desaparece solo cuando se resuelve (se cobra el crédito o se repone el stock).' ],
    note: null },
  en:{ title:'Notifications (bell)', purpose:'The bell icon in the top bar flags two things that need your attention: low stock and credits that are due soon or overdue.',
    steps:[ 'Tap the bell to open the panel.',
      'Red = overdue or out of stock. Orange = due soon (3 days or less) or stock below the minimum.',
      '"Mark as read" clears the counter without deleting the alerts.',
      'An alert only disappears once it\'s actually resolved (the credit is paid or stock is restocked).' ],
    note: null },
  imgs:[{f:'06-notificaciones.png', w:45}] },

{ n:6, group:'g2', admin:false,
  es:{ title:'Pantalla Vender', purpose:'La pantalla principal para hacer una venta: elegís categoría, buscás o escaneás el producto, y arma el carrito a la derecha.',
    steps:[ 'Tocá una categoría para ver sus productos, o usá el buscador de arriba (funciona también con lector de código de barras).',
      'Tocá el botón "+" de una tarjeta de producto para agregarlo al carrito.',
      'El carrito muestra subtotal, impuesto (si está activado) y total en tiempo real.',
      'Cada producto muestra su stock — si está en rojo o amarillo, queda poco.' ],
    note:'Un producto sin stock no se puede agregar al carrito — hay que reponerlo primero desde Inventario.' },
  en:{ title:'The Sell screen', purpose:'The main screen for making a sale: pick a category, search or scan the product, and the cart builds up on the right.',
    steps:[ 'Tap a category to see its products, or use the search bar at the top (also works with a barcode scanner).',
      'Tap the "+" button on a product card to add it to the cart.',
      'The cart shows subtotal, tax (if enabled) and total in real time.',
      'Each product shows its stock — if it\'s red or yellow, it\'s running low.' ],
    note:'A product with no stock can\'t be added to the cart — it needs to be restocked first from Inventory.' },
  imgs:[{f:'07-vender.png', w:70, en:true}] },

{ n:7, group:'g2', admin:false,
  es:{ title:'Cobrar', purpose:'Una vez armado el carrito, tocá "Orden" para abrir el modal de cobro y elegir cómo paga el cliente.',
    steps:[ 'Elegí el método: Efectivo, Tarjeta, Transferencia o Dividir (parte efectivo, parte tarjeta).',
      'Con Efectivo, usá el teclado numérico para anotar cuánto te dio el cliente — el sistema calcula el cambio solo.',
      'Si hay un descuento activado, tocá el botón de descuento antes de confirmar.',
      'Tocá "Confirmar pago" para cerrar la venta e imprimir el recibo.' ],
    note:'El cajón de dinero se abre automáticamente SOLO si el pago fue en Efectivo (si esa opción está activada en Configuración). Con tarjeta, transferencia o crédito no se abre solo — usá el botón "Registradora" si necesitás abrirlo a mano.' },
  en:{ title:'Checkout', purpose:'Once the cart is ready, tap "Order" to open the checkout modal and pick how the customer is paying.',
    steps:[ 'Choose the method: Cash, Card, Transfer or Split (part cash, part card).',
      'With Cash, use the number pad to enter how much the customer gave you — the system calculates the change automatically.',
      'If a discount applies, tap the discount button before confirming.',
      'Tap "Confirm payment" to close the sale and print the receipt.' ],
    note:'The cash drawer only opens automatically when the payment method is Cash (if that option is enabled in Settings). With card, transfer or credit it stays closed — use the "Cash Drawer" button if you need to open it manually.' },
  imgs:[{f:'08-cobrar.png', w:38, en:true}] },

{ n:8, group:'g2', admin:false,
  es:{ title:'Cuenta Abierta', purpose:'Sirve para "guardar" un pedido sin cobrarlo todavía — típico en mesas de restaurante o clientes que van a volver por más productos.',
    steps:[ 'Armá el carrito y tocá "Cta. Abierta" en vez de un método de pago.',
      'Ponele un nombre o número de mesa para identificarla.',
      'Para retomarla: abrí el gestor de Cuentas Abiertas, elegí la cuenta y se carga de nuevo en el carrito.',
      'Desde ahí seguís agregando productos o cobrás normalmente.' ],
    note: null },
  en:{ title:'Open Account (tab)', purpose:'Used to "park" an order without charging it yet — typical for restaurant tables or customers who\'ll come back for more items.',
    steps:[ 'Build the cart and tap "Open Account" instead of a payment method.',
      'Give it a name or table number so you can find it again.',
      'To resume it: open the Open Accounts manager, pick the tab, and it loads back into the cart.',
      'From there you keep adding products or check out normally.' ],
    note: null },
  imgs:[] },

{ n:9, group:'g2', admin:false,
  es:{ title:'Venta a Crédito', purpose:'Para vender "fiado" a un cliente registrado, con una fecha límite de pago.',
    steps:[ 'Armá el carrito y tocá "Crédito" (si está habilitado en Métodos de Pago).',
      'Buscá al cliente por nombre o cédula, o agregalo si es nuevo.',
      'Elegí la fecha límite (7, 15, 30 días o una fecha personalizada).',
      'Tocá "Registrar crédito" — la venta queda marcada como pendiente hasta que se pague.' ],
    note:'Un cliente sin cédula no se puede agregar — es el dato que identifica a cada cliente en el sistema de créditos.' },
  en:{ title:'Credit sale', purpose:'For selling on credit to a registered customer, with a payment due date.',
    steps:[ 'Build the cart and tap "Credit" (if enabled under Payment Methods).',
      'Search for the customer by name or ID number, or add them if they\'re new.',
      'Pick the due date (7, 15, 30 days, or a custom date).',
      'Tap "Register credit" — the sale is marked as pending until it\'s paid.' ],
    note:'A customer without an ID number can\'t be added — it\'s the field that identifies each customer in the credit system.' },
  imgs:[{f:'09-credito.png', w:34}] },

{ n:10, group:'g2', admin:false,
  es:{ title:'Recibo', purpose:'Se muestra automáticamente al cerrar una venta, con toda la información del ticket.',
    steps:[ 'Tocá "Imprimir" para mandarlo a la impresora.',
      'Tocá "Nueva Orden" para volver a la pantalla de Vender y empezar la siguiente venta.',
      'Para reimprimir un recibo de una venta anterior: andá a "Ventas del día", tocá la orden, y "Ver recibo".' ],
    note: null },
  en:{ title:'Receipt', purpose:'Shown automatically when a sale closes, with all the ticket information.',
    steps:[ 'Tap "Print" to send it to the printer.',
      'Tap "New Order" to go back to the Sell screen and start the next sale.',
      'To reprint a past receipt: go to "Today\'s sales", tap the order, then "View receipt".' ],
    note: null },
  imgs:[{f:'10-recibo.png', w:34, en:true}] },

{ n:11, group:'g3', admin:false,
  es:{ title:'Ventas del día', purpose:'Resumen rápido de todo lo vendido en el turno actual — ideal para chequear cómo va el día sin salir del POS.',
    steps:[ 'Muestra ventas cobradas, número de órdenes y ticket promedio.',
      'Si hay ventas anuladas o devueltas, aparece un contador arriba de la lista.',
      'Tocá cualquier orden de la lista para ver o reimprimir su recibo.' ],
    note: null },
  en:{ title:"Today's sales", purpose:'A quick summary of everything sold in the current shift — great for checking how the day is going without leaving the POS.',
    steps:[ 'Shows collected sales, number of orders and average ticket.',
      'If any sales were cancelled or returned, a counter appears above the list.',
      'Tap any order in the list to view or reprint its receipt.' ],
    note: null },
  imgs:[{f:'11-ventas-dia.png', w:42, en:true}] },

{ n:12, group:'g3', admin:false,
  es:{ title:'Devoluciones', purpose:'Para procesar la devolución de una venta ya cobrada (el cliente trae el producto de vuelta).',
    steps:[ 'Abrí "Devoluciones" desde la barra lateral.',
      'Tocá la orden correspondiente para ver el detalle.',
      'Tocá "Devolver" — la venta queda marcada como devuelta y el stock se repone automáticamente.',
      'Una devolución ya hecha se puede eliminar del historial con el ícono de basura, si fue un error.' ],
    note:'Distinto de "Anular": anular es para una venta del MISMO turno que todavía no se le entregó nada al cliente. Devolver es cuando el cliente ya se llevó el producto y lo trae de vuelta.' },
  en:{ title:'Returns', purpose:'For processing the return of an already-charged sale (the customer brings the product back).',
    steps:[ 'Open "Returns" from the sidebar.',
      'Tap the matching order to see its detail.',
      'Tap "Return" — the sale is marked as returned and stock is restored automatically.',
      'A return can be deleted from the history with the trash icon, if it was a mistake.' ],
    note:'Different from "Cancel": cancelling is for a sale in the SAME shift where nothing was handed to the customer yet. Returning is when the customer already took the product and brings it back.' },
  imgs:[{f:'12-devoluciones.png', w:42, en:true}] },

{ n:13, group:'g4', admin:false,
  es:{ title:'Productos', purpose:'Acá se crean y editan los productos que aparecen en la grilla de Vender.',
    steps:[ 'Completá nombre, categoría, precio, stock y stock mínimo.',
      'El precio de compra es opcional pero necesario si querés ver el margen de ganancia.',
      'Podés subir una foto o dejar que el sistema muestre la inicial del nombre.',
      'El código de barras permite buscar el producto escaneando.',
      'Tocá "Guardar" para agregarlo a la lista.' ],
    note: null },
  en:{ title:'Products', purpose:'This is where you create and edit the products shown on the Sell screen.',
    steps:[ 'Fill in name, category, price, stock and minimum stock.',
      'The purchase cost is optional but needed if you want to see the profit margin.',
      'You can upload a photo or let the system show the first letter of the name.',
      'The barcode lets you find the product by scanning.',
      'Tap "Save" to add it to the list.' ],
    note: null },
  imgs:[{f:'13-productos.png', w:70}] },

{ n:14, group:'g4', admin:false,
  es:{ title:'Inventario', purpose:'Vista general del stock de todos los productos, con semáforo de colores para detectar problemas rápido.',
    steps:[ 'Verde = stock saludable. Amarillo = stock bajo (por debajo del mínimo). Rojo = sin stock.',
      'Podés cambiar entre vista de tabla y vista de tarjetas.',
      'Desde acá también se hace el conteo físico de inventario cuando corresponda.' ],
    note: null },
  en:{ title:'Inventory', purpose:'An overview of stock for every product, with a color light system to spot problems quickly.',
    steps:[ 'Green = healthy stock. Yellow = low stock (below the minimum). Red = out of stock.',
      'You can switch between table view and card view.',
      'This is also where you do a physical inventory count when needed.' ],
    note: null },
  imgs:[{f:'14-inventario.png', w:70}] },

{ n:15, group:'g4', admin:false,
  es:{ title:'Combos y Especiales', purpose:'Dos formas de armar promociones: Combos (varios productos a un precio fijo) y Especiales (descuentos, 2x1, precio por cantidad).',
    steps:[ 'Combos: elegís los productos que lo componen y le ponés un precio único.',
      'Especiales — Descuento: un % de descuento sobre un producto, con fecha de inicio/fin opcional.',
      'Especiales — 2x1 (BOGO): "lleva X, paga Y" sobre el mismo producto.',
      'Especiales — Por cantidad: un precio especial al comprar X unidades o más.',
      'Todos se pueden activar/desactivar sin borrarlos, con el botón ⏯.' ],
    note: null },
  en:{ title:'Combos and Specials', purpose:'Two ways to build promotions: Combos (several products at one fixed price) and Specials (discounts, buy-one-get-one, quantity pricing).',
    steps:[ 'Combos: pick the products that make it up and set one combined price.',
      'Specials — Discount: a % off a product, with an optional start/end date.',
      'Specials — BOGO: "buy X, pay Y" on the same product.',
      'Specials — Quantity: a special price when buying X units or more.',
      'All of them can be turned on/off without deleting them, with the ⏯ button.' ],
    note: null },
  imgs:[{f:'15-especiales.png', w:70}] },

{ n:16, group:'g4', admin:false,
  es:{ title:'Etiquetas', purpose:'Imprime etiquetas de precio para pegar en los productos o góndolas.',
    steps:[ 'Elegí los productos a etiquetar.',
      'Elegí el formato de hoja (Avery) y si la impresora es normal o térmica.',
      'Revisá la vista previa antes de imprimir.' ],
    note: null },
  en:{ title:'Labels', purpose:'Prints price labels to stick on products or shelves.',
    steps:[ 'Choose the products to label.',
      'Choose the sheet format (Avery) and whether the printer is regular or thermal.',
      'Check the preview before printing.' ],
    note: null },
  imgs:[{f:'16-etiquetas.png', w:70}] },

{ n:17, group:'g5', admin:false,
  es:{ title:'Clientes', purpose:'Base de datos de clientes registrados, usada sobre todo para ventas a crédito.',
    steps:[ 'Registrá nombre, cédula y teléfono como mínimo.',
      'Desde acá podés ver el historial de cada cliente.' ],
    note: null },
  en:{ title:'Customers', purpose:'The database of registered customers, used mainly for credit sales.',
    steps:[ 'Register at least a name, ID number and phone.',
      'From here you can see each customer\'s history.' ],
    note: null },
  imgs:[{f:'17-clientes.png', w:70}] },

{ n:18, group:'g5', admin:false,
  es:{ title:'Créditos y abonos', purpose:'Panel con todos los créditos pendientes de cobro, ordenados por fecha de vencimiento.',
    steps:[ 'Cada tarjeta muestra el original, lo abonado y lo pendiente.',
      '"Abonar" registra un pago parcial (elegís el monto y el método).',
      '"Marcar pagado" cierra el crédito completo de una vez.',
      'El color de la fecha te dice si está vencido (rojo) o por vencer (naranja).' ],
    note: null },
  en:{ title:'Credits and payments', purpose:'A panel with every credit still owed, sorted by due date.',
    steps:[ 'Each card shows the original amount, what\'s been paid, and what\'s still owed.',
      '"Add payment" records a partial payment (you choose the amount and method).',
      '"Mark as paid" closes the whole credit at once.',
      'The date color tells you if it\'s overdue (red) or due soon (orange).' ],
    note: null },
  imgs:[{f:'18-creditos.png', w:60}] },

{ n:19, group:'g6', admin:false,
  es:{ title:'Dashboard', purpose:'La vista gerencial: cómo va el negocio hoy, de un vistazo, con gráficos y números clave.',
    steps:[ '5 tarjetas principales: Ventas hoy, Transacciones, Ganancia hoy, Ticket promedio, Productos vendidos (cada una comparada contra ayer).',
      'Gráfico de Ventas por período (7 o 30 días) y donut de Métodos de pago.',
      'Resumen de inventario, Ventas por categoría, Actividad reciente y Créditos pendientes, todo en la misma pantalla.' ],
    note:'La "Ganancia hoy" es un estimado — usa el costo actual cargado en cada producto, así que puede no ser exacta si el costo cambió desde que se compró el producto.' },
  en:{ title:'Dashboard', purpose:'The management view: how the business is doing today, at a glance, with charts and key numbers.',
    steps:[ '5 main cards: Today sales, Transactions, Profit today, Avg. ticket, Products sold (each compared against yesterday).',
      'Sales-by-period chart (7 or 30 days) and a Payment methods donut chart.',
      'Inventory summary, Sales by category, Recent activity and Pending credits, all on the same screen.' ],
    note:'"Profit today" is an estimate — it uses the cost currently saved on each product, so it may not be exact if the cost changed since the product was purchased.' },
  imgs:[{f:'19-dashboard.png', w:70, en:true}] },

{ n:20, group:'g6', admin:false,
  es:{ title:'Reportes / Contabilidad / Gastos / Compras', purpose:'La sección de números del negocio: resumen por período, gastos, compras a proveedores y créditos, todo agrupado.',
    steps:[ 'Elegí el período (hoy, semana, mes o personalizado) arriba.',
      'La pestaña de Gastos registra egresos por categoría (servicios, insumos, etc).',
      'La pestaña de Compras registra lo comprado a proveedores, con su costo.',
      'Contabilidad cruza ventas, gastos y compras para mostrar la utilidad real del período.' ],
    note:'Esta pantalla requiere código de administrador para entrar.' },
  en:{ title:'Reports / Accounting / Expenses / Purchases', purpose:'The numbers section of the business: period summary, expenses, supplier purchases and credits, all grouped together.',
    steps:[ 'Pick the period (today, week, month or custom) at the top.',
      'The Expenses tab logs money spent by category (utilities, supplies, etc).',
      'The Purchases tab logs what was bought from suppliers, with its cost.',
      'Accounting combines sales, expenses and purchases to show the real profit for the period.' ],
    note:'This screen requires the administrator code to open.' },
  imgs:[{f:'20-contabilidad.png', w:70}] },

{ n:21, group:'g6', admin:true,
  es:{ title:'Usuarios y roles', purpose:'Alta de cajeros y administradores, y qué puede hacer cada uno dentro del sistema.',
    steps:[ 'Completá nombre, usuario, contraseña y rol (Admin o Cajero).',
      'Los permisos por módulo se activan/desactivan uno por uno para cada usuario.',
      'El ícono 🔑 te deja resetear la contraseña de alguien que la olvidó (le pide cambiarla en el próximo login).',
      'El usuario "1" (el admin original) no se puede borrar.' ],
    note: null },
  en:{ title:'Users and roles', purpose:'Creating cashiers and administrators, and what each one is allowed to do in the system.',
    steps:[ 'Fill in name, username, password and role (Admin or Cashier).',
      'Permissions per module are turned on/off individually for each user.',
      'The 🔑 icon lets you reset a forgotten password (they\'ll be asked to set a new one on next login).',
      'The original admin account ("1") can\'t be deleted.' ],
    note: null },
  imgs:[{f:'21-usuarios.png', w:70}] },

{ n:22, group:'g6', admin:false,
  es:{ title:'Nómina y Clock In/Out', purpose:'Gestión de empleados: cómo se les paga y, si corresponde, el registro de entrada y salida.',
    steps:[ 'Elegí tipo de pago: semanal, quincenal o mensual, con su monto.',
      'Activá "Usar Clock In/Out" si el empleado marca entrada/salida (necesita tarifa por hora y un PIN de 4 dígitos).',
      'Con Clock In/Out activo, el botón de entrada/salida aparece en el menú para que el empleado fiche.',
      'El sistema calcula las horas trabajadas en el mes automáticamente.' ],
    note: null },
  en:{ title:'Payroll and Clock In/Out', purpose:'Employee management: how they get paid and, if applicable, clocking in and out.',
    steps:[ 'Choose the pay type: weekly, biweekly or monthly, with the amount.',
      'Turn on "Use Clock In/Out" if the employee punches in/out (needs an hourly rate and a 4-digit PIN).',
      'With Clock In/Out on, the clock in/out button appears in the menu for the employee to use.',
      'The system calculates hours worked in the month automatically.' ],
    note: null },
  imgs:[{f:'22-nomina.png', w:70}] },

{ n:23, group:'g6', admin:true,
  es:{ title:'Auditoría', purpose:'Historial de cambios importantes hechos en el sistema: quién hizo qué y cuándo.',
    steps:[ 'Podés filtrar por usuario o por rango de fechas.',
      'Cada línea muestra la acción, el detalle y quién la hizo.' ],
    note:'Sirve para resolver dudas tipo "¿quién cambió el precio de este producto?" sin tener que preguntarle a todo el equipo.' },
  en:{ title:'Audit log', purpose:'A history of important changes made in the system: who did what, and when.',
    steps:[ 'You can filter by user or by date range.',
      'Each line shows the action, the detail, and who did it.' ],
    note:'Useful for answering questions like "who changed this product\'s price?" without having to ask the whole team.' },
  imgs:[{f:'23-auditoria.png', w:70}] },

{ n:24, group:'g7', admin:true,
  es:{ title:'Código Admin, Fondo de Caja y Métodos de Pago', purpose:'Los ajustes base del negocio: la contraseña maestra, el efectivo inicial de cada turno, y qué formas de pago se aceptan.',
    steps:[ 'Código Admin: cambiá el código de 4 dígitos que se pide para entrar a pantallas administrativas.',
      'Fondo de Caja: el monto que se sugiere confirmar al abrir cada turno.',
      'Métodos de Pago: activá o desactivá Tarjeta, Transferencia, Cuentas Abiertas y Crédito (Efectivo siempre está activo).',
      'Si activás Crédito, configurá los días límite por defecto y si los cajeros pueden cambiar esa fecha.' ],
    note:'Toda la sección de Configuración pide el código de administrador para entrar.' },
  en:{ title:'Admin Code, Cash Fund and Payment Methods', purpose:'The business\'s base settings: the master code, the starting cash for each shift, and which payment methods are accepted.',
    steps:[ 'Admin Code: change the 4-digit code required to enter administrative screens.',
      'Cash Fund: the amount suggested to confirm when opening each shift.',
      'Payment Methods: turn Card, Transfer, Open Accounts and Credit on or off (Cash is always on).',
      'If you enable Credit, set the default due-date days and whether cashiers can change that date.' ],
    note:'The whole Settings section requires the administrator code to open.' },
  imgs:[{f:'24-config-overview.png', w:70}] },

{ n:25, group:'g7', admin:true,
  es:{ title:'Registradora', purpose:'Configura el puerto de la impresora fiscal/cajón de dinero y si se abre solo al cobrar en efectivo.',
    steps:[ 'Escribí el puerto COM correcto (ej: COM3).',
      'Tocá "Probar" para confirmar que el cajón responde.',
      '"Abrir automáticamente al cobrar" controla si se abre solo con pagos en efectivo.' ],
    note: null },
  en:{ title:'Cash Drawer', purpose:'Configures the cash drawer\'s port and whether it opens automatically on cash sales.',
    steps:[ 'Enter the correct COM port (e.g. COM3).',
      'Tap "Test" to confirm the drawer responds.',
      '"Auto-open when charging" controls whether it opens automatically for cash payments.' ],
    note: null },
  imgs:[] },

{ n:26, group:'g7', admin:true,
  es:{ title:'Formato de hora y Recibo', purpose:'Personalizá cómo se ve la hora en el sistema y qué información aparece impresa en cada ticket.',
    steps:[ 'Elegí 12h (AM/PM) o 24h para todo el sistema.',
      'Cargá el logo, nombre del negocio, subtítulo, mensaje de agradecimiento, teléfono, redes sociales y un QR opcional para el recibo.' ],
    note: null },
  en:{ title:'Time format and Receipt', purpose:'Customize how time is displayed and what information is printed on every ticket.',
    steps:[ 'Choose 12h (AM/PM) or 24h for the whole system.',
      'Set the logo, business name, subtitle, thank-you message, phone, social media and an optional QR code for the receipt.' ],
    note: null },
  imgs:[] },

{ n:27, group:'g7', admin:false,
  es:{ title:'Idioma y Tema', purpose:'Cambiá el idioma de toda la aplicación (Español/English) y entre modo oscuro o claro.',
    steps:[ 'Idioma y Tema también están disponibles directo en la barra lateral, sin necesidad de entrar a Configuración.' ],
    note: null },
  en:{ title:'Language and Theme', purpose:'Change the language of the whole app (Español/English) and switch between dark and light mode.',
    steps:[ 'Language and Theme are also available directly from the sidebar, no need to open Settings.' ],
    note: null },
  imgs:[] },

{ n:28, group:'g7', admin:true,
  es:{ title:'Datos — exportar, importar y backup', purpose:'Copias de seguridad de toda la información del negocio.',
    steps:[ 'Exportar datos (JSON): descarga un archivo con toda la base de datos actual.',
      'Importar datos (JSON): carga un archivo exportado previamente.',
      'Backup automático: corre solo cada 5 minutos, en silencio.',
      'Contraseña de Respaldo: protegé los backups con una contraseña propia.' ],
    warn:'Si olvidás la contraseña de los backups, NO hay forma de recuperar esos respaldos cifrados. Guardala en un lugar seguro.' },
  en:{ title:'Data — export, import and backup', purpose:'Backup copies of all the business information.',
    steps:[ 'Export data (JSON): downloads a file with the entire current database.',
      'Import data (JSON): loads a previously exported file.',
      'Automatic backup: runs silently every 5 minutes on its own.',
      'Backup Password: protect your backups with their own password.' ],
    warn:'If you forget the backup password, there is NO way to recover those encrypted backups. Store it somewhere safe.' },
  imgs:[] },

{ n:29, group:'g7', admin:true,
  es:{ title:'Bloqueo por inactividad y stock bajo', purpose:'Dos ajustes de seguridad y control: bloquear la sesión sola después de un rato sin uso, y a partir de qué cantidad se considera "stock bajo".',
    steps:[ 'Activá el bloqueo por inactividad y elegí después de cuántos minutos sin actividad se bloquea la pantalla.',
      'El umbral de stock bajo es global — cada producto puede tener su propio "Stock mínimo" que lo sobreescribe.' ],
    note: null },
  en:{ title:'Inactivity lock and low stock', purpose:'Two safety/control settings: locking the session automatically after a period of no activity, and the quantity that counts as "low stock".',
    steps:[ 'Turn on inactivity lock and choose how many minutes of no activity trigger it.',
      'The low-stock threshold is global — each product can have its own "Minimum stock" that overrides it.' ],
    note: null },
  imgs:[] },

{ n:30, group:'g7', admin:true,
  es:{ title:'Impuesto', purpose:'Configura si el POS cobra impuesto (IVA, ITBIS, sales tax, etc.) y cómo se calcula.',
    steps:[ 'Activá "Cobrar impuesto" y ponele un nombre (el que use tu país).',
      'Cargá la tasa (%).',
      '"Precio ya incluye impuesto" cambia si el impuesto se suma al precio o si ya está adentro y se desglosa en el ticket.' ],
    note: null },
  en:{ title:'Tax', purpose:'Configures whether the POS charges tax (VAT, sales tax, etc.) and how it\'s calculated.',
    steps:[ 'Turn on "Charge tax" and give it a name (whatever your country uses).',
      'Enter the rate (%).',
      '"Price already includes tax" changes whether tax is added on top of the price or already included and broken out on the ticket.' ],
    note: null },
  imgs:[] },

{ n:31, group:'g7', admin:true,
  es:{ title:'Zona Peligrosa — Reset de datos', purpose:'Borra datos del negocio para empezar de cero (por ejemplo, al terminar una prueba y arrancar en producción).',
    steps:[ 'Tocá "Borrar Todos los Datos" para ver exactamente qué se borra y qué NO se borra.',
      'Se recomienda crear un backup antes de continuar.',
      'Se pide usuario y contraseña de administrador para confirmar — es la identidad real, no solo el código.' ],
    warn:'Esta acción es IRREVERSIBLE. Se borran ventas, productos, categorías, clientes, créditos, combos, turnos, clock in/out, auditoría y notificaciones. NO se borran usuarios, licencia, configuración de impresora, impuestos ni datos del negocio.' },
  en:{ title:'Danger Zone — Data reset', purpose:'Erases business data to start fresh (for example, after finishing a trial and moving into real production).',
    steps:[ 'Tap "Delete All Data" to see exactly what gets deleted and what does NOT.',
      'Creating a backup first is recommended.',
      'You\'ll be asked for the administrator\'s username and password to confirm — the real identity, not just the code.' ],
    warn:'This action is IRREVERSIBLE. Sales, products, categories, customers, credits, combos, shifts, clock in/out, audit log and notifications are deleted. Users, license, printer settings, tax settings and business info are NOT deleted.' },
  imgs:[{f:'25-zona-peligrosa.png', w:55}] },

{ n:32, group:'g7', admin:false,
  es:{ title:'Mi Licencia', purpose:'Estado completo de tu licencia: plan, si está activa, cuándo vence y cuántos dispositivos estás usando.',
    steps:[ 'Revisá el plan (Básico o Pro) y el estado (Activa, Inactiva u Offline).',
      'La fecha de vencimiento y los días restantes se actualizan solos.',
      'Tocá "Renovar / Soporte" para escribirle a soporte por WhatsApp con tu clave ya incluida en el mensaje.' ],
    note:'El plan Básico permite 1 PC. El plan Pro permite hasta 3 PCs y desbloquea el Dashboard Móvil.' },
  en:{ title:'My License', purpose:'The full status of your license: plan, whether it\'s active, when it expires, and how many devices you\'re using.',
    steps:[ 'Check the plan (Basic or Pro) and status (Active, Inactive or Offline).',
      'The expiry date and days remaining update automatically.',
      'Tap "Renew / Support" to message support on WhatsApp with your key already included in the message.' ],
    note:'The Basic plan allows 1 PC. The Pro plan allows up to 3 PCs and unlocks the Mobile Dashboard.' },
  imgs:[{f:'26-mi-licencia.png', w:55}] },

{ n:33, group:'g8', admin:false,
  es:{ title:'Dashboard móvil', purpose:'Una versión del Dashboard pensada para el celular — para revisar cómo va el negocio sin estar frente a la computadora. Requiere plan Pro.',
    steps:[ 'Escaneá el código QR desde "Dashboard Móvil" en el menú del POS, o entrá con tu clave de licencia desde el navegador del celular.',
      'Muestra ingresos de hoy, órdenes, ticket mayor, créditos pendientes, métodos de pago y productos más vendidos — con pestañas para Semana, Mes e Inventario.',
      'El indicador de arriba a la derecha muestra si el POS de escritorio está conectado en tiempo real: verde "Conectado" o rojo "Desconectado" con el tiempo desde la última señal.',
      'Debajo del nombre del negocio, una línea aparte muestra el estado de cada PC individualmente (útil si tenés más de una PC con el plan Pro) — una PC puede estar "Conectada" aunque nadie tenga el turno abierto en ese momento; son dos cosas distintas.' ],
    note:'Si no ves el indicador de conexión, puede ser que tu POS de escritorio todavía no tenga la versión que lo manda — actualizalo desde "Buscar actualizaciones".' },
  en:{ title:'Mobile dashboard', purpose:'A phone-friendly version of the Dashboard — to check how the business is doing without sitting at the computer. Requires the Pro plan.',
    steps:[ 'Scan the QR code from "Mobile Dashboard" in the POS menu, or log in with your license key from your phone\'s browser.',
      'Shows today\'s income, orders, highest ticket, pending credits, payment methods and top products — with tabs for Week, Month and Inventory.',
      'The indicator in the top-right corner shows in real time whether the desktop POS is connected: green "Connected" or red "Disconnected" with how long since the last signal.',
      'Below the business name, a separate line shows the status of each PC individually (useful if you have more than one PC on the Pro plan) — a PC can be "Connected" even if no one currently has a shift open there; those are two different things.' ],
    note:'If you don\'t see the connection indicator, your desktop POS may not have the version that sends it yet — update it from "Check for updates".' },
  imgs:[{f:'27-dashboard-movil-verde.png', w:38, en:true},{f:'27-dashboard-movil-rojo.png', w:38, en:true}] },
];

// ─────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────

function esc(s) { return s; }

function imgTag(img, w, lang) {
  let f = img.f;
  if (lang === 'en' && img.en) f = f.replace(/\.png$/, '_en.png');
  return `<img class="shot" style="width:${w}%" src="${f}" alt="">`;
}

function renderImgs(imgs, lang) {
  if (!imgs || !imgs.length) return '';
  if (imgs.length === 1) return imgTag(imgs[0], imgs[0].w, lang);
  return `<div class="shot-row">${imgs.map(i => imgTag(i, 100, lang)).join('')}</div>`;
}

function renderSection(item, lang) {
  const d = item[lang];
  const adminBadge = item.admin ? `<span class="admin-badge">${lang === 'es' ? 'SOLO ADMINISTRADOR' : 'ADMIN ONLY'}</span>` : '';
  const steps = d.steps.map(s => `<li>${s}</li>`).join('');
  const note = d.note ? `<div class="note">${lang === 'es' ? '💡 Nota: ' : '💡 Note: '}${d.note}</div>` : '';
  const warn = d.warn ? `<div class="warn">${lang === 'es' ? '⚠ Advertencia: ' : '⚠ Warning: '}${d.warn}</div>` : '';
  return `
<section class="topic" id="${lang}-s${item.n}">
  <h3><span class="num">${item.n}</span> ${d.title} ${adminBadge}</h3>
  <div class="purpose">${d.purpose}</div>
  <ul class="steps">${steps}</ul>
  ${note}${warn}
  ${renderImgs(item.imgs, lang)}
</section>`;
}

function renderLangBody(lang) {
  let html = '';
  let lastGroup = null;
  for (const item of S) {
    if (item.group !== lastGroup) {
      const g = groups.find(x => x.id === item.group);
      const first = lastGroup === null ? ' first' : '';
      html += `<div class="group-header${first}">${g[lang]}</div>`;
      lastGroup = item.group;
    }
    html += renderSection(item, lang);
  }
  return html;
}

function renderIndexCol(lang) {
  let html = '';
  let lastGroup = null;
  for (const item of S) {
    if (item.group !== lastGroup) {
      const g = groups.find(x => x.id === item.group);
      html += `<div class="idx-group">${g[lang]}</div>`;
      lastGroup = item.group;
    }
    const dot = item.admin ? '<span class="idx-admin-dot"></span>' : '';
    html += `<div class="idx-item"><span class="n">${item.n}.</span> <a href="#${lang}-s${item.n}">${item[lang].title}</a>${dot}</div>`;
  }
  return html;
}

const indexPage = `
<div class="idx-page">
  <h1 style="text-align:center;margin-bottom:4px">Índice / Table of Contents</h1>
  <p style="text-align:center;color:#64748b;font-size:9pt;margin-bottom:18px">
    <span class="idx-admin-dot" style="margin-left:0"></span> = ${'requiere código de administrador / requires administrator code'}
  </p>
  <div class="idx-cols">
    <div class="idx-col">
      <h2>ES · Español — pág. siguiente</h2>
      ${renderIndexCol('es')}
    </div>
    <div class="idx-col">
      <h2>EN · English — page ${S.length + 6}*</h2>
      ${renderIndexCol('en')}
    </div>
  </div>
  <p style="font-size:7.5pt;color:#94a3b8;margin-top:10px">*El número exacto de página depende del lector de PDF — usá los enlaces de este índice para saltar directo a cada sección. / *Exact page number depends on your PDF viewer — use this index's links to jump straight to each section.</p>
</div>`;

const esDivider = `
<div class="lang-divider">
  <div class="flag">ESPAÑOL</div>
  <h1>Manual del Operador</h1>
  <p>4K POS — Sistema de Punto de Venta</p>
</div>`;

const enDivider = `
<div class="lang-divider">
  <div class="flag">ENGLISH</div>
  <h1>Operator Manual</h1>
  <p>4K POS — Point of Sale System</p>
</div>`;

const body = indexPage + esDivider + renderLangBody('es') + enDivider + renderLangBody('en');

const template = fs.readFileSync(path.join(__dirname, 'manual.html'), 'utf8');
const out = template.replace('<!--BODY-->', body);
fs.writeFileSync(path.join(__dirname, 'manual-final.html'), out, 'utf8');
console.log('Built manual-final.html, sections:', S.length);
