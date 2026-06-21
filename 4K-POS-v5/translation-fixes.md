# Translation Fixes — 4K POS v5

Date: 2026-06-21
File: index.html

## Summary

**Total texts corrected: 67**
New keys added to T dictionary: 64 (both ES + EN)
HTML elements given IDs for applyLang: 27 elements
applyLang() entries added: 27

---

## Dictionary Keys Added

### Login lock / attempts
| ES | EN | Key | Function |
|---|---|---|---|
| `⛔ Cuenta bloqueada. Intenta en ` | `⛔ Account locked. Try in ` | `accountLockedPrefix` | `doLogin()` |
| ` min.` | ` min.` | `accountLockedSuffix` | `doLogin()` |
| `⛔ Demasiados intentos. Cuenta bloqueada 5 min.` | `⛔ Too many attempts. Account locked 5 min.` | `tooManyAttempts` | `doLogin()` |
| `Contraseña incorrecta (` | `Wrong password (` | `wrongPassPrefix` | `doLogin()` |
| `/5)` | `/5)` | `wrongPassSuffix` | `doLogin()` |

### Password reset / force change
| ES | EN | Key | Function |
|---|---|---|---|
| `🔑 Contraseña reseteada` | `🔑 Password reset` | `resetPassTitle` | HTML modal + `applyLang()` |
| `Usuario: ` | `User: ` | `resetPassUserLbl` | HTML modal + `applyLang()` |
| `Contraseña temporal` | `Temporary password` | `resetPassTempLbl` | HTML modal + `applyLang()` |
| `¿Resetear contraseña de ` | `Reset password for ` | `resetPassConfirmPre` | `resetUserPass()` |
| `?\nSe generará una contraseña temporal...` | `?\nA temporary password will be generated...` | `resetPassConfirmSuf` | `resetUserPass()` |
| `Mínimo 4 caracteres` | `Minimum 4 characters` | `min4chars` | `doForceChPass()` |
| `Las contraseñas no coinciden` | `Passwords do not match` | `passwordsNoMatch` | `doForceChPass()`, `saveBackupPass()` |
| `✅ Contraseña actualizada` | `✅ Password updated` | `passUpdated` | `doForceChPass()` |

### Backup password
| ES | EN | Key | Function |
|---|---|---|---|
| `Contraseña de Respaldo` | `Backup Password` | `backupPassSectionTitle` | HTML label + `applyLang()` |
| `⚠️ Tus backups no están cifrados...` | `⚠️ Your backups are not encrypted...` | `backupPassWarn` | HTML warn + `applyLang()` |
| `Nueva contraseña` | `New password` | `backupNewPassLbl` | HTML label + `applyLang()` |
| `Mín. 6 caracteres` | `Min. 6 characters` | `backupNewPassPh` | HTML placeholder + `applyLang()` |
| `Confirmar contraseña` | `Confirm password` | `backupConfirmPassLbl` | HTML label + `applyLang()` |
| `Repetir contraseña` | `Repeat password` | `backupRepeatPassPh` | HTML placeholder + `applyLang()` |
| `⚠️ Si olvidas esta contraseña, NO podrás recuperar...` | `⚠️ If you forget this password, you CANNOT recover...` | `backupPassSecWarn` | HTML warn + `applyLang()` |
| `🔐 Guardar contraseña` | `🔐 Save password` | `backupSaveBtn` | HTML button + `applyLang()` |
| `Quitar` | `Remove` | `backupRemoveBtn` | HTML button + `applyLang()` |
| `🔐 Cifrado activo · llave en sesión` | `🔐 Encryption active · key in session` | `encryptionActive` | `_updateBkpPassUI()` |
| `🔐 Contraseña configurada · ingresa para activar cifrado` | `🔐 Password set · enter to activate encryption` | `encryptionConfigured` | `_updateBkpPassUI()` |
| `Ingresa una contraseña` | `Enter a password` | `enterAPassword` | `saveBackupPass()` |
| `Mínimo 6 caracteres` | `Minimum 6 characters` | `min6chars` | `saveBackupPass()` |
| `Error: módulo crypto no disponible` | `Error: crypto module unavailable` | `cryptoUnavailable` | `saveBackupPass()` |
| `🔐 Contraseña de respaldo guardada` | `🔐 Backup password saved` | `backupPassSaved` | `saveBackupPass()` |
| `¿Quitar la contraseña de respaldo?...` | `Remove backup password?...` | `removeBackupPassConfirm` | `removeBackupPass()` |
| `✅ Contraseña de respaldo eliminada` | `✅ Backup password removed` | `backupPassRemoved` | `removeBackupPass()` |
| `Ingresa la contraseña` | `Enter password` | `enterPassword` | `_submitBkpPass()` |
| `Archivo inválido tras descifrado` | `Invalid file after decryption` | `invalidFileDecrypt` | `_submitBkpPass()` |
| `Contraseña incorrecta` | `Wrong password` | `wrongPassword` | `_submitBkpPass()` |
| `Contraseña incorrecta o archivo corrupto` | `Wrong password or corrupt file` | `wrongPassOrCorrupt` | `_submitBkpPass()` |

### Inactivity
| ES | EN | Key | Function |
|---|---|---|---|
| `Bloqueo por Inactividad` | `Inactivity Lock` | `inactivitySectionTitle` | HTML label + `applyLang()` |
| `⏱ Bloquear por inactividad` | `⏱ Lock on inactivity` | `inactivityToggleLbl` | HTML toggle + `applyLang()` |
| `Minutos sin actividad` | `Minutes of inactivity` | `inactivityMinutesLbl` | HTML label + `applyLang()` |
| `✅ Bloqueo por inactividad guardado` | `✅ Inactivity lock saved` | `inactivitySaved` | `saveInactivityCfg()` |
| `🔒 Sesión bloqueada por inactividad` | `🔒 Session locked due to inactivity` | `sessionLockedInactivity` | `_onInactivityTimeout()` |

### Notifications config
| ES | EN | Key | Function |
|---|---|---|---|
| `Notificaciones` | `Notifications` | `notifSectionTitle` | HTML label + `applyLang()` |
| `Umbral de stock bajo (global)` | `Low stock threshold (global)` | `lowStockThresholdLbl` | HTML label + `applyLang()` |
| description text | description text (EN) | `lowStockThresholdInfo` | HTML info div + `applyLang()` |
| `✅ Umbral de stock bajo guardado` | `✅ Low stock threshold saved` | `lowStockThresholdSaved` | `saveLowStockCfg()` |

### Admin confirm section
| ES | EN | Key | Function |
|---|---|---|---|
| `Confirmación Admin` | `Admin Confirmation` | `adminConfirmSectionTitle` | HTML label + `applyLang()` |
| `🔐 Admin exento de re-confirmar` | `🔐 Admin exempt from re-confirming` | `adminExemptToggleLbl` | HTML toggle + `applyLang()` |
| description text | description text (EN) | `adminExemptInfo` | HTML info div + `applyLang()` |
| `Código Admin requerido` | `Admin code required` | `adminCodeRequired` | `requireAdminCode()` |
| (`Código de acceso` → uses existing `pinTitle`) | — | `pinTitle` (existing) | `_cancelAdminConfirm()` |
| `✅ Configuración guardada` | `✅ Config saved` | `configSaved` | `saveAdminExemptCfg()` |

### Audit log
| ES | EN | Key | Function |
|---|---|---|---|
| `📋 Registro de Auditoría` | `📋 Audit Log` | `auditTitle` | HTML h3 + `applyLang()` |
| `Todos los usuarios` | `All users` | `auditAllUsers` | HTML option default + `openAudit()` |
| `Fecha` | `Date` | `auditColDate` | HTML th + `applyLang()` + `exportAuditCSV()` |
| `Hora` | `Time` | `auditColTime` | HTML th + `applyLang()` + `exportAuditCSV()` |
| `Usuario` | `User` | `auditColUser` | HTML th + `applyLang()` + `exportAuditCSV()` |
| `Acción` | `Action` | `auditColAction` | HTML th + `applyLang()` + `exportAuditCSV()` |
| `Detalle` | `Detail` | `auditColDetail` | HTML th + `applyLang()` + `exportAuditCSV()` |
| `Antes` | `Before` | `auditColBefore` | HTML th + `applyLang()` + `exportAuditCSV()` |
| `Después` | `After` | `auditColAfter` | HTML th + `applyLang()` + `exportAuditCSV()` |
| `Sin registros` | `No records` | `auditNoRecords` | `renderAuditTable()` |
| ` registros` | ` records` | `auditRecordsSuffix` | `renderAuditTable()` |
| `Sin registros de auditoría` | `No audit records` | `auditNoRecordsExport` | `exportAuditCSV()` |

### Notification panel
| ES | EN | Key | Function |
|---|---|---|---|
| `🔔 Notificaciones` | `🔔 Notifications` | `notifPanelTitle` | HTML span + `applyLang()` |
| `Marcar leídas` | `Mark all read` | `notifMarkAllRead` | HTML button + `applyLang()` |
| `Vencido` | `Overdue` | `notifLabelOverdue` | `openNotifPanel()` |
| `Por vencer` | `Due soon` | `notifLabelDueSoon` | `openNotifPanel()` |
| `Stock bajo` | `Low stock` | `notifLabelLowStock` | `openNotifPanel()` |
| `Actualización` | `Update` | `notifLabelUpdate` | `openNotifPanel()` |
| `✅ Sin notificaciones pendientes` | `✅ No pending notifications` | `notifEmpty` | `openNotifPanel()` |
| `vencido hace` | `overdue by` | `notifOverdueBy` | `calcNotifs()` |
| `vence en` | `due in` | `notifDueIn` | `calcNotifs()` |
| `días` | `days` | `notifDays` | `calcNotifs()` |
| `u. (mín:` | `u. (min:` | `notifUnitsMin` | `calcNotifs()` |

### Lock session / hamburger menu
| ES | EN | Key | Function |
|---|---|---|---|
| `Auditoría` | `Audit` | `auditMenu` | HTML span + `applyLang()` |
| `Bloquear sesión` | `Lock session` | `lockSession` | HTML span + `applyLang()` |
| `🔒 Sesión bloqueada` | `🔒 Session locked` | `sessionLocked` | `doQuickLock()` |
| `— carrito guardado` | `— cart saved` | `cartSaved` | `doQuickLock()`, `_onInactivityTimeout()` |

### Checkout / receipt
| ES | EN | Key | Function |
|---|---|---|---|
| `Pago exacto por defecto` | `Exact payment by default` | `exactPayment` | `calcChange()` |
| `⚠ Insuficiente — ` | `⚠ Insufficient — ` | `insufficientPrefix` | `calcChange()` |
| `✓ Cobrar Orden #` | `✓ Charge Order #` | `chargeOrderPrefix` | `openCheckoutModal()` |
| `Recibido` (receipt span) | `Received` (uses existing `received` key) | `received` (existing) | HTML `r-recv-span` + `applyLang()` |

---

## Refactors

- `resetUserPass()`: Migrated from native `confirm()` (untranslatable) to `confirm2()` with `t()` keys.
- `_cancelAdminConfirm()` + pin confirm flow: Now uses `t('pinTitle')` (existing key) instead of hardcoded `'Código de acceso'`.

---

## NOT translated (design decisions — see chat)

1. **Audit action names in DB** (`'Venta anulada'`, `'Login fallido'`, `'Cierre de turno'`, etc.): Stored in Spanish in `db.auditLog[]` records. Translating them would break the `acColors` lookup in `renderAuditTable()`. Requires decoupling the color map from the action name string.
2. **Open account ref strings** (`'Bloqueado – …'`, `'Inactividad – …'`): Internal record labels stored as OA account names. Left in Spanish as internal data.
