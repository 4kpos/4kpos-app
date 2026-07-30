# Manual Técnico — 4K POS

> **Uso privado.** Este documento es para el creador/administrador del sistema (Kelvin), no para operadores ni clientes. Documenta cómo gestionar licencias, builds, releases y la infraestructura de Supabase/GitHub detrás de 4K POS.
>
> Todo lo que sigue está verificado contra el código y la infraestructura reales al momento de escribir esto (2026-07-30). Donde algo no se pudo confirmar, se marca explícitamente como **no verificado** en vez de asumirlo.

---

## 1. Gestión de licencias (crear / renovar — 100% manual)

No existe ninguna acción `create_license` ni `renew_license` en `posapi`. Todo esto se hace a mano en **Supabase Studio → Table Editor → tabla `licenses`**.

### 1.1 Crear una licencia nueva

1. Entrá a Supabase Studio del proyecto `izalnhluwtyotuxwkqrh` → Table Editor → `licenses`.
2. Insertá una fila nueva con estos campos:

| Campo | Valor | Obligatorio | Notas |
|---|---|---|---|
| `key` | `4K-XXXX-XXXX-XXXX` (formato con guiones) | Sí | Es la identidad de la licencia — todo el sistema la usa como clave primaria funcional |
| `status` | `active` (string exacto, minúsculas) | Sí | Si no es **exactamente** `'active'`, `activate_license` y `verify_license` fallan con `license_invalid` / `license_inactive`. No hay tolerancia de mayúsculas ni variantes |
| `plan` | `pro`, `lifetime`, o cualquier otro string (ej. `basic`) | Sí, en la práctica | Determina el límite de dispositivos — ver advertencia abajo |
| `expires_at` | fecha ISO, o `null` | No | `null` = licencia permanente, sin vencimiento. Si tiene fecha, el sistema bloquea cuando pasa |
| `email` | email del cliente | No | Solo se devuelve en la respuesta de `activate_license`, no se usa para nada crítico |
| `business_name` | nombre del negocio | No | Idem — solo informativo |
| `device_id` | — | **No llenar a mano** | Lo escribe el sistema automáticamente en el primer `activate_license` |
| `last_seen` | — | **No llenar a mano** | Se actualiza solo en cada `verify_license` |

3. Guardá la fila. La licencia queda lista para usarse desde `activation.html`.

⚠️ **No verificado**: los constraints a nivel de base de datos (NOT NULL, defaults, tipos de columna exactos) de la tabla `licenses`. La tabla **no está en ninguna migración versionada** (`supabase/migrations/` solo tiene `pos_data.sql`) — se creó directamente en Supabase Studio en algún momento, sin dejar registro en el repo. Lo de la tabla de arriba es lo que el código de `posapi` *usa y necesita*, no necesariamente todo lo que la tabla *permite o exige* a nivel motor.

### 1.2 Renovar una licencia / darle más días

No hay botón ni acción para esto. Se edita el campo **`expires_at`** directo en la fila existente, en Supabase Studio, a la nueva fecha de vencimiento.

### 1.3 ⚠️ Advertencia clave — el límite de dispositivos NO es un dato de la licencia

No existe una columna `device_limit` ni nada similar en `licenses`. El límite de PCs por licencia es una **regla fija en el código**, no algo que se configure por licencia individual:

```ts
// supabase/functions/posapi/index.ts:21-25
function maxDevicesForPlan(plan: string): number {
  const p = (plan || "").toLowerCase();
  if (p.startsWith("pro") || p === "lifetime") return 3;
  return 1;
}
```

Si algún día necesitás una licencia con un límite distinto (por ejemplo, un cliente Pro con 5 PCs en vez de 3), **la única forma es cambiar esta función en el código y volver a deployar `posapi`** — no hay manera de hacerlo por licencia desde Supabase Studio.

---

## 2. Código de extensión offline (`4kpos-tools`) — NO es renovar la licencia

**Esto es una cosa completamente distinta a lo de la sección 1.** Renovar la licencia cambia `expires_at` en Supabase. El código de extensión offline **no toca Supabase para nada** — solo extiende, en el archivo local de un cliente puntual, cuántos días puede seguir usando el POS sin conectarse a internet.

### 2.1 Qué es y para qué sirve

`license.js` tiene una gracia offline de 15 días (`OFFLINE_GRACE_DAYS`): si el POS no logra verificar la licencia online, sigue funcionando hasta 15 días desde la última verificación exitosa. Si un cliente se queda sin internet más tiempo que eso, el POS se bloquea con "Verificación requerida" — y ahí es donde entra este código.

### 2.2 Flujo completo

1. El cliente, desde la pantalla de bloqueo offline, te manda su **código de dispositivo** (8 caracteres, visible en pantalla).
2. Vos corrés, desde `C:\Users\4k\4kpos-tools\`:
   ```
   node generate-extension-code.js <CODIGO_DISPOSITIVO>
   ```
   Ejemplo: `node generate-extension-code.js A3KM9PQZ`
3. El script imprime **dos códigos**: uno válido para la semana ISO actual y otro para la semana próxima (el POS acepta también el de la semana anterior como margen).
4. Le pasás el código correspondiente al cliente, que lo ingresa en la pantalla de extensión offline de `activation.html`.
5. Eso extiende localmente su gracia offline — **la licencia real en Supabase (`expires_at`, `status`, etc.) no cambia en absoluto.**

### 2.3 Secreto usado

`EXT_CODE_SECRET`, HMAC-SHA256 sobre `codigo_dispositivo:semana_ISO`. Vive en `C:\Users\4k\4kpos-tools\.env` (confirmé que el archivo existe con exactamente una variable: `EXT_CODE_SECRET=`). Es el **mismo secreto** que el pipeline de build inyecta en `license.js` en cada release (ver sección 4) — tienen que coincidir, si cambiás uno hay que cambiar el otro.

Si no está en el entorno ni en `.env`, el script pide setearlo:
```powershell
$env:EXT_CODE_SECRET = "tu_secreto_aqui"; node generate-extension-code.js XXXXXXXX
```

### 2.4 Otras utilidades en `4kpos-tools` (testing, NO gestión)

- **`test-license-expire.js`** — fuerza `last_verified` a hace 16 días en el archivo local de licencia (`%APPDATA%\4k-pos\4kpos_license.json`), para poder ver la pantalla de "licencia offline vencida" sin esperar 15 días reales. Es una herramienta de prueba, no toca nada en producción.
- **`cleanup-test-data.js`** — borra datos de prueba del POS local (ventas, devoluciones, cuentas abiertas, créditos, clientes, turnos, auditoría, facturas, gastos), preservando productos/categorías/usuarios/configuración. Hace backup automático antes de borrar (`4kpos-v5-backup-<fecha>.json` y `4kpos_license-backup-<fecha>.json`). Sirve para dejar una instalación de prueba lista para arrancar en limpio antes de entregarla a un cliente real. Correr con el POS cerrado.

---

## 3. Edge Function `posapi`

Único endpoint de backend del POS: `https://izalnhluwtyotuxwkqrh.supabase.co/functions/v1/posapi`. Expone exactamente **8 acciones** (confirmado leyendo `supabase/functions/posapi/index.ts` completo, 475 líneas):

| Acción | Qué hace |
|---|---|
| `activate_license` | Valida clave + hardware_id, registra el dispositivo (respetando el límite del plan), marca la licencia como usada en esa PC |
| `verify_license` | Re-verifica que la licencia siga activa y no vencida, para el hardware que la tiene activada — corre en cada boot online y en el watcher cada 2 min |
| `request_license_by_email` | Flujo del sitio web: busca si el email ya tiene licencia activa; si no, crea una fila `pending` y (si `RESEND_API_KEY` está seteado) manda emails de confirmación |
| `save` | Guarda el estado completo del POS de un negocio (`pos_data`), con merge append-only de ventas/devoluciones |
| `load` | Carga el estado guardado de un negocio |
| `commit_sale` | Cierra una venta de forma atómica con validación de stock server-side (vía RPC `pos_commit_sale`) |
| `reset_data` | Ejecuta el reset de "Zona Peligrosa", re-validando usuario/contraseña admin contra el hash guardado (vía RPC `pos_reset_data`) |
| `poll` | Consulta liviana de `updated_at`/`saved_by`, usada para detectar cambios entre PCs sin traer todo el blob |

### 3.1 Deploy — MANUAL, no está en CI

```
cd C:\Users\4k\4kpos-app
npx supabase functions deploy posapi
```

**El pipeline de GitHub Actions (`build.yml`) NO deploya la Edge Function** — solo compila y publica el `.exe` del POS de escritorio (ver sección 4). Si modificás `posapi/index.ts`, el cambio **no llega a producción hasta que corrás el deploy a mano**. Es fácil olvidarlo después de editar el archivo y pushear solo a git.

### 3.2 Secrets del proyecto (nombres confirmados, no valores)

Vía `npx supabase secrets list --project-ref izalnhluwtyotuxwkqrh`:

```
RESEND_API_KEY
SUPABASE_ANON_KEY
SUPABASE_DB_URL
SUPABASE_JWKS
SUPABASE_PUBLISHABLE_KEYS
SUPABASE_SECRET_KEYS
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
```

⚠️ **Pendiente de corregir**: `ADMIN_EMAIL` **no está seteado** como secret. El código cae al default hardcodeado `kelvin-2101@hotmail.com` (`posapi/index.ts:188`). Las notificaciones internas de "nueva solicitud de licencia" están yendo ahí en vez de a `get4ksupport@gmail.com`. Para corregirlo:
```
npx supabase secrets set ADMIN_EMAIL=get4ksupport@gmail.com --project-ref izalnhluwtyotuxwkqrh
```

---

## 4. Builds y releases (automático)

### 4.1 Comando de build

`4K-POS-v5/package.json`:
```json
"scripts": { "dist": "electron-builder --win --x64" },
"build": {
  "publish": [{ "provider": "github", "owner": "4kpos", "repo": "4kpos-app", "releaseType": "release" }]
}
```

### 4.2 Pipeline automático — `.github/workflows/build.yml`

Se dispara en **cada push a `main` o `master`** (y manualmente vía `workflow_dispatch`). Corre en `windows-latest`:

1. **Bump de versión**: sube el patch (`5.4.X` → `5.4.X+1`) en `package.json` y lo commitea directo: `chore: bump version to X [skip ci]`, luego pushea.
2. **Inyecta el secreto real**: reemplaza el placeholder `__EXT_CODE_SECRET__` en `license.js` por el valor real de `EXT_CODE_SECRET` (GitHub Secret), compila con eso adentro, y después **revierte `license.js`** a su estado con placeholder (`git checkout -- 4K-POS-v5/license.js`) antes de commitear cualquier otro cambio pendiente (`chore: auto-commit build assets [skip ci]`) — así el secreto real nunca queda commiteado en el repo.
3. **Build + publish**:
   ```
   npx electron-builder --win --publish always
   ```
   con `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (token automático de GitHub, no hay que configurarlo). Esto sube un GitHub Release nuevo con `4K-POS-Setup-X.X.X.exe`, `.blockmap` y `latest.yml`.

Confirmado contra la API real de GitHub: releases reales y recientes existen (ej. `v5.4.149`, publicado 2026-07-28).

### 4.3 Auto-update

`main.js` carga `electron-updater`:
- `autoDownload: true`, `autoInstallOnAppQuit: true`.
- Chequeo automático 10 segundos después de arrancar la app.
- Chequeo manual vía el botón "Buscar actualizaciones" del sidebar (`ipcMain.on('check-updates', ...)`).
- `latest.yml` (subido en cada release) es el manifiesto que `electron-updater` lee para saber si hay versión nueva disponible.

---

## 5. Repos y qué publica cada push ⚠️

Cuenta GitHub `4kpos` — es un **usuario**, no una organización, con 3 repos públicos.

### 5.1 `4kpos-app`
Push a `main`/`master` → dispara el pipeline de la sección 4 → build + release nuevo en GitHub → **el auto-updater lo reparte a TODOS los clientes con el POS abierto** (chequeo automático a los 10s de arrancar). No hay ambiente de staging — cualquier bug que llegue a `master` se distribuye solo, sin gate manual entre el push y que los clientes lo reciban (más allá de que cada cliente tenga que abrir/reabrir el POS).

### 5.2 `4kpos-dashboard`
Push a `main` → **producción directa**, sin build ni staging: GitHub Pages sirve los archivos tal cual quedan en el repo. Esto son DOS cosas en el mismo repo/dominio:
- El sitio de marketing (`get4ksolutions.com` — `index.html`).
- El dashboard móvil de los clientes con plan Pro (`4kpos-dashboard.html`).

Cualquier push rompe ambos si hay un error, en vivo, sin previsualización.

### 5.3 `4kpos-downloads` — ⚠️ problema documentado, pendiente

Repo separado, solo aloja un instalador fijo en `pos/4K-POS-Setup.exe` (GitHub Pages activado, `has_pages:true`). Historial de commits sobre ese archivo: **un solo commit**, 2026-06-30, "Add 4K POS Setup 5.0.0 installer" — nunca se volvió a tocar. La app real hoy va por **v5.4.149**.

El FAQ del sitio (`4kpos-dashboard/index.html`) dice que el link de descarga del instalador se manda **por email, manualmente**, después de coordinar el pago — no encontré ninguna referencia a `4kpos-downloads` en el código del sitio (grep sin resultados), así que no puedo confirmar si ese es efectivamente el link que se está mandando o si se manda otra cosa (ej. el `.exe` de un Release de `4kpos-app`).

**Pendiente a resolver**: si el link que mandás a clientes nuevos apunta a `4kpos-downloads`, están instalando una versión ~150 patches vieja. El auto-update debería corregirlo solo en el primer arranque *si el cliente tiene internet en ese momento* — pero es un punto frágil (primera impresión con una versión vieja, y depende de que el auto-update no falle). Opciones a evaluar más adelante: automatizar que `4kpos-downloads` se actualice en el mismo pipeline de la sección 4, o cambiar el link que se manda por email para que apunte directo al último Release de `4kpos-app`.

### 5.4 GitHub Secrets

No pude listarlos todos (sin `gh` CLI disponible ni token para pegarle a la API de Secrets, que de todas formas nunca devuelve valores, solo nombres). Confirmado que existe al menos **`EXT_CODE_SECRET`** en `4kpos-app` (se referencia en `build.yml` como `${{ secrets.EXT_CODE_SECRET }}`). `GITHUB_TOKEN` es automático, no se configura a mano.

---

## 6. Supabase (referencia)

**Project ID**: `izalnhluwtyotuxwkqrh` — `https://izalnhluwtyotuxwkqrh.supabase.co`

### 6.1 Tablas

| Tabla | ¿Versionada en `supabase/migrations/`? | Contenido |
|---|---|---|
| `pos_data` | Sí (`001_pos_data.sql`) | Una fila por `license_key`, con el blob completo del negocio (ventas, productos, clientes, config, etc.) |
| `licenses` | **No** — creada a mano en Supabase Studio | Las licencias (ver sección 1) |
| `license_devices` | **No** — creada a mano | Una fila por PC activada, para el límite de dispositivos por plan |
| `categories` | **No** — creada a mano | Reutilizada como almacén key-value genérico: categorías reales del negocio conviven con filas `shift_status_<pcId>`, `pos_alive_<pcId>` y `credit_summary`, todas distinguidas por el campo `id` |

Todas se relacionan por el mismo string `license_key` / `key`. **No hay foreign keys formales confirmadas** — es una convención de la aplicación, no algo garantizado por el motor (no verificado a nivel schema, mismas limitaciones que la sección 1.1).

### 6.2 RPCs (funciones Postgres, sí versionadas)

- **`pos_commit_sale`** (`002_realtime_stock.sql`, actualizada en `005_commit_sale_reset_aware.sql`) — cierre atómico de venta con validación de stock server-side.
- **`pos_reset_data`** (`003_reset_data.sql`, actualizada en `004_reset_data_saved_by.sql`) — el reset de Zona Peligrosa.

---

*Última verificación de este documento contra el sistema real: 2026-07-30. Si algo de lo marcado como "no verificado" cambia o se confirma, actualizar esta misma sección en vez de asumir que sigue igual.*
