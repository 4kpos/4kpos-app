# Translation Audit — 4K POS v5

**Date:** 2026-06-22  
**File audited:** `4K-POS-v5/index.html`  
**Total fixes applied:** 57

---

## Dictionary additions (36 new keys × ES + EN)

| Key | ES | EN |
|-----|----|----|
| `taxSectionTitle` | Impuesto | Tax |
| `taxEnabledLbl` | 🧾 Cobrar impuesto | 🧾 Charge tax |
| `taxNameLbl` | Nombre del impuesto | Tax name |
| `taxRateLbl` | Tasa (%) | Rate (%) |
| `taxIncludedLbl` | Precio ya incluye impuesto (desglosar) | Price already includes tax (itemize) |
| `taxIncludedInfo` | Si activo: precio ya incluye impuesto... | When enabled: price already includes tax... |
| `taxSaveBtn` | 💾 Guardar impuesto | 💾 Save tax |
| `taxDefaultName` | Impuesto | Tax |
| `taxSaved` | ✅ Impuesto guardado | ✅ Tax saved |
| `drawerOpened` | 🗃️ Registradora abierta | 🗃️ Drawer opened |
| `exitConfirm` | ¿Salir del programa? | Exit program? |
| `noLicense` | ⚠ Sin licencia | ⚠ No license |
| `cashInDrawer` | Efectivo en caja | Cash in drawer |
| `abonosTitle` | 💰 Abonos de Crédito | 💰 Credit Payments |
| `fcpTitle` | 🔐 Cambia tu contraseña | 🔐 Change your password |
| `fcpSubtitle` | Tu cuenta tiene una contraseña temporal... | Your account has a temporary password... |
| `fcpNewPass` | Nueva contraseña | New password |
| `fcpNewPassPh` | Mínimo 4 caracteres | Minimum 4 characters |
| `fcpConfirmPass` | Confirmar contraseña | Confirm password |
| `fcpConfirmPassPh` | Repite la contraseña | Repeat password |
| `fcpSaveBtn` | 💾 Guardar nueva contraseña | 💾 Save new password |
| `insufficientAmt` | ⚠ Monto insuficiente | ⚠ Insufficient amount |
| `abonoRegisteredPre` | ✅ Abono registrado · | ✅ Payment recorded · |
| `abonoFullSuffix` | (pago total) | (full payment) |
| `payCreditFullPre` | ¿Marcar como pagado total el crédito de | Mark credit as fully paid for |
| `updateChecking` | Buscando actualizaciones... | Checking for updates... |
| `updateDownloading` | Descargando actualización... | Downloading update... |
| `updateReady` | Actualización lista. ¿Reiniciar ahora? | Update ready. Restart now? |
| `updateNone` | Ya tienes la última versión | Already on latest version |
| `updateError` | Error al buscar actualizaciones | Error checking for updates |
| `noteSavedToast` | 📋 Nota guardada | 📋 Note saved |
| `noteClearedToast` | 📋 Nota eliminada | 📋 Note cleared |
| `adminOnly` | Solo administrador | Admin only |
| `forceCloseConfirm` | ¿Forzar cierre con diferencia de efectivo? | Force close shift with cash difference? |
| `deleteUserConfirm` | ¿Eliminar usuario | Delete user |
| `deleteCatConfirm` | ¿Eliminar categoría? | Delete category? |
| `noCreditsFoundFor` | No se encontraron créditos para | No credits found for |
| `noPendingCreditsCheck` | Sin créditos pendientes ✓ | No pending credits ✓ |
| `cpayProductsSec` | Productos | Products |
| `cpayNoDetail` | Sin detalle | No detail |
| `cpayPriorPayments` | Abonos anteriores | Prior payments |
| `cpayVenta` | 📅 Venta: | 📅 Sale: |
| `cpayVence` | Vence: | Due: |
| `cpayNoLimit` | Sin fecha límite | No due date |

---

## HTML — IDs added (to enable applyLang wiring)

- Tax config section: `cfg-tax-section-title`, `cfg-tax-enabled-lbl`, `cfg-tax-name-lbl`, `cfg-tax-rate-lbl`, `cfg-tax-included-lbl`, `cfg-tax-included-info`, `cfg-tax-save-btn`
- Force-change-password modal: `fcp-title`, `fcp-subtitle`, `fcp-new-pass-lbl`, `fcp-confirm-pass-lbl`, `fcp-save-btn`
- Abonos list modal: `ov-abonos-list-title`
- Already had IDs, now wired: `cart-tax-lbl`, `r-tax-lbl`, `ck-tax-lbl`, `abono-search`

---

## applyLang() changes

- **Removed dead code**: `cpay-pending-lbl` reference (element was deleted in credit modal redesign)
- **Fixed inline ternaries**: `lo-cash-close-lbl` and `lo-declared-lbl` now use `t('cashInDrawer')` and `t('declaredCash')`
- **Added 21 new wirings** for all IDs listed above

---

## JS function strings fixed

| Location | Before | After |
|----------|--------|-------|
| `updateLicBadge()` | `'⚠ Sin licencia'` | `t('noLicense')` |
| `openDrawer()` | `'🗃️ Registradora abierta'` | `t('drawerOpened')` |
| `exitApp()` | inline ternary | `t('exitConfirm')` |
| `saveTaxCfg()` | `'✅ Impuesto guardado'` | `t('taxSaved')` |
| `checkout()` ×2 | `'⚠ Monto insuficiente'` | `t('insufficientAmt')` |
| `openCheckoutModal()` | `taxName\|\|'Impuesto'` | `taxName\|\|t('taxDefaultName')` |
| `forceAdminLogout()` | inline ternaries | `t('adminOnly')`, `t('forceCloseConfirm')` |
| update-status listener ×5 | inline ternaries | `t('updateChecking')` etc. |
| `checkUpdates()` | inline ternary | `t('updateChecking')` |
| `saveShiftNote()` | inline ternary | `t('noteSavedToast')` / `t('noteClearedToast')` |
| `deleteUser()` | `'¿Eliminar usuario '+name` | `t('deleteUserConfirm')+name` |
| `delCat()` | `'¿Eliminar categoría?'` | `t('deleteCatConfirm')` |
| `payCreditFull()` | hardcoded confirm2 | `t('payCreditFullPre')+...` |
| `doCreditPayment()` toast | hardcoded strings | `t('abonoRegisteredPre')`, `t('abonoFullSuffix')` |
| `renderAbonosList()` | hardcoded no-results | `t('noCreditsFoundFor')`, `t('noPendingCreditsCheck')` |
| `renderContaCredits()` | hardcoded no-results | `t('noCreditsFoundFor')` |
| `_buildCpayInfo()` ×7 | hardcoded ES labels | `t('cpayNoLimit')`, `t('cpayNoDetail')`, `t('cpayPriorPayments')`, `t('cpayVenta')`, `t('cpayVence')`, `t('cpayProductsSec')`, `t('creditOriginal')`, `t('creditPaid')`, `t('creditPending')` |
