# Capturas requeridas para manuales de Prismia POS Local

> Checklist de capturas de pantalla pendientes para ilustrar el manual de cliente,
> la guía técnica y la guía contable.
>
> Versión inicial: `0.1` · Fecha de creación: 2026-06-24.
> Aún no contiene imágenes. Servirá para la futura tanda de capturas y diseño final.

---

## 1. Propósito

Este archivo sirve como **checklist de capturas pendientes** para convertir los
manuales de Prismia POS Local en documentos con imágenes (PDF / Word).

Cada captura se asocia al documento donde se usará:

* `01_MANUAL_USO_CLIENTES.md` — manual operativo.
* `02_GUIA_CONTABLE_LOGICA_NEGOCIO.md` — guía contable.
* `03_GUIA_TECNICA_INTERNA_JOSE.md` — guía técnica interna.

---

## 2. Reglas para tomar capturas

* Usar **datos demo**, no datos reales de cliente.
* **No mostrar contraseñas.**
* **No mostrar claves de licencia reales.**
* **No mostrar `.env`.**
* **No mostrar datos personales sensibles.**
* Usar **resolución limpia** (preferiblemente 1920 × 1080 o superior).
* Evitar ventanas borrosas o parcialmente tapadas.
* Nombrar capturas de forma ordenada (ver sección 3).
* Guardar capturas en:

```
docs/manuales/assets/capturas/
```

> Si esa carpeta no existe, créala vacía antes de agregar imágenes.

---

## 3. Convención de nombres

Usar numeración secuencial con nombre descriptivo en minúsculas y guiones bajos:

```
01_login.png
02_dashboard.png
03_configuracion_negocio.png
04_usuarios_listado.png
05_productos_listado.png
06_producto_formulario.png
07_inventario_listado.png
08_caja_apertura.png
09_pos_venta.png
10_pos_pago_mixto.png
```

---

## 4. Capturas para el manual de cliente

### Acceso y configuración

- [ ] Login.
- [ ] Setup inicial.
- [ ] Dashboard.
- [ ] Configuración del negocio.
- [ ] Usuarios listado.
- [ ] Formulario de usuario.

### Clientes y productos

- [ ] Clientes listado.
- [ ] Formulario de cliente.
- [ ] Categorías listado.
- [ ] Productos listado.
- [ ] Formulario de producto.
- [ ] Producto con IVA.
- [ ] Producto sin IVA.
- [ ] Producto con imagen.

### Inventario

- [ ] Inventario listado.
- [ ] Historial de inventario.
- [ ] Ajuste de inventario.
- [ ] Conteo físico.
- [ ] Diferencias de conteo.

### Caja

- [ ] Caja inicio.
- [ ] Abrir caja.
- [ ] Movimiento manual.
- [ ] Gasto.
- [ ] Cerrar caja.
- [ ] Detalle de turno.
- [ ] Impresión / exportación de turno.

### Ventas

- [ ] POS principal.
- [ ] Búsqueda de producto.
- [ ] Carrito con productos.
- [ ] Descuento aplicado.
- [ ] Selección de cliente.
- [ ] Pago en efectivo.
- [ ] Pago mixto.
- [ ] Venta finalizada.
- [ ] Ticket.
- [ ] Historial de ventas.
- [ ] Detalle de venta.
- [ ] Anulación de venta.

### POS móvil / táctil

- [ ] Vista móvil / táctil.
- [ ] Búsqueda o selección de producto.
- [ ] Carrito en vista móvil.
- [ ] Pantalla de pago móvil, si aplica.

> `Pendiente de confirmar en instalación del cliente` — algunas capturas pueden
> depender de red, certificados o cámara del dispositivo.

### Compras y proveedores

- [ ] Proveedores listado.
- [ ] Formulario de proveedor.
- [ ] Compras listado.
- [ ] Formulario de compra.
- [ ] Detalle de compra.
- [ ] Cuentas por pagar.
- [ ] Pago a proveedor.
- [ ] Impresión de compra.

### Documentos internos

- [ ] Cotizaciones listado.
- [ ] Formulario de cotización.
- [ ] Detalle de cotización.
- [ ] Impresión de cotización.
- [ ] Remisiones listado.
- [ ] Formulario de remisión.
- [ ] Detalle de remisión.
- [ ] Notas crédito listado.
- [ ] Detalle de nota crédito.
- [ ] Impresión de nota crédito.

### Reportes

- [ ] Pantalla principal de reportes.
- [ ] Reporte de ventas.
- [ ] Reporte de IVA.
- [ ] Reporte de medios de pago.
- [ ] Reporte de utilidad / margen.
- [ ] Reporte de inventario, si aplica.

### Backups y licencia

- [ ] Backups pantalla principal.
- [ ] Modo soporte.
- [ ] Crear backup.
- [ ] Restaurar backup.
- [ ] Licencia estado.
- [ ] Activación de licencia.
- [ ] Pantalla licencia vencida.
- [ ] Error conocido de puerto ocupado — solo si se reproduce en entorno controlado.

---

## 5. Capturas para guía técnica interna

> Estas capturas **no son para cliente final**. Son opcionales y sirven para
> documentar el entorno de desarrollo y los scripts internos.

- [ ] Estructura de carpetas en VS Code.
- [ ] `package.json` scripts.
- [ ] `src/modules/`.
- [ ] `src/database/migrations/`.
- [ ] Ejemplo de `git status` limpio.
- [ ] Ejemplo de `check:pre-electron` exitoso.
- [ ] Ejemplo de `db:validate` exitoso.
- [ ] Carpeta `dist/` con instalador generado.

---

## 6. Capturas para guía contable

> Capturas opcionales para ilustrar cálculos, fórmulas y ejemplos de la guía
> contable. No son para cliente final, pero pueden incluirse en la versión
> para contador o dueño.

- [ ] Producto con IVA incluido.
- [ ] Producto con IVA no incluido.
- [ ] Producto sin IVA.
- [ ] Venta con descuento.
- [ ] Venta con pago mixto.
- [ ] Reporte de IVA.
- [ ] Reporte de utilidad.
- [ ] Cierre de caja con diferencia.
- [ ] Compra que actualiza costo promedio.
- [ ] Nota crédito interna por anulación.

---

## 7. Prioridad de capturas

### 🔴 Alta prioridad

* Login.
* Dashboard.
* Productos (listado y formulario).
* Venta POS.
* Pago (efectivo y mixto).
* Ticket.
* Caja apertura / cierre.
* Backup.
* Licencia.

### 🟡 Media prioridad

* Inventario.
* Compras.
* Reportes.
* Cotizaciones.
* Remisiones.
* Notas crédito.

### 🟢 Baja prioridad

* Guía técnica interna (capturas de VS Code, scripts, estructura).
* Auditorías.
* Scripts de desarrollo.
* Estructura de carpetas.

---

## 8. Estado del documento

| Campo | Valor |
| ----- | ----- |
| Documento | Capturas requeridas para manuales |
| Versión inicial | `0.1` |
| Fecha de creación | 2026-06-24 |
| Contiene imágenes | No — aún no se han tomado capturas |
| Siguiente paso | Tanda de capturas y diseño final de manuales |
