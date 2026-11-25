# Guía contable y lógica del negocio de Prismia POS Local

> Explicación de cálculos, IVA, costos, utilidad, caja, compras, inventario y documentos
> internos.
>
> Versión inicial: `0.1` · Fecha de creación: 2026-06-24.
> Basada en `docs/manuales/00_MAPA_DOCUMENTAL_PRISMIA.md` y
> `docs/manuales/03_GUIA_TECNICA_INTERNA_JOSE.md`.
>
> Cuando un dato no se pudo confirmar desde el código o los documentos base, se marca como
> **Pendiente de confirmar**. No se documentan funcionalidades inventadas.

---

## 1. Propósito de esta guía

Esta guía está dirigida a:

* **contador** del negocio;
* **dueño** del negocio;
* **administrador**;
* **soporte técnico** que necesita entender los números.

Prismia POS Local es un **sistema de control operativo/comercial local** (punto de venta).
Esta guía explica **la lógica interna de negocio**: cómo Prismia calcula y registra ventas,
IVA, descuentos, costos, utilidad, caja, compras, inventario, reportes y notas crédito
internas.

Aclaraciones importantes:

* Prismia maneja **documentos internos** (no fiscales electrónicos).
* Las **notas crédito** de Prismia son **internas**.
* **No** debe documentarse ni venderse como **facturación electrónica DIAN**.
* **No** reemplaza una **contabilidad oficial completa**.
* **No** reemplaza la **declaración tributaria** ni la **asesoría contable profesional**.

> Esta guía sirve para entender y controlar el negocio día a día, no para sustituir al
> contador ni a la obligación fiscal del negocio.

---

## 2. Alcance contable de Prismia

**Qué controla Prismia (confirmado):**

* ventas y **detalle de ventas**;
* **pagos** de venta (uno o varios medios);
* **descuentos**;
* **IVA** (incluido / no incluido / sin IVA);
* **caja** y **turnos**;
* **compras** y detalle de compra;
* **inventario** y movimientos;
* **costos** (costo base, último costo, costo promedio);
* **utilidad bruta**;
* **margen** (en reportes);
* **reportes** operativos/de ventas;
* **notas crédito internas**;
* **anulaciones** de venta;
* **backups** como respaldo operativo.

**Qué NO cubre todavía o no debe prometerse:**

* facturación electrónica **DIAN**;
* contabilidad oficial completa;
* estados financieros formales (balance, P&G oficial, flujo de efectivo);
* declaraciones tributarias;
* nómina;
* conciliación bancaria avanzada;
* licenciamiento remoto / panel (pendiente de producto).

---

## 3. Modelo general del negocio

Entidades principales:

* **producto** — lo que se vende; tiene precio, costo, IVA y stock.
* **cliente** — a quién se le vende.
* **proveedor** — a quién se le compra.
* **venta** — la transacción de venta (cabecera).
* **detalle de venta** — cada línea/producto de la venta.
* **pago de venta** — cómo se pagó la venta (efectivo, transferencia, etc.).
* **turno de caja** — periodo de operación de caja (apertura → cierre).
* **movimiento de caja** — cada entrada/salida de dinero del turno.
* **compra** — la transacción de compra (cabecera).
* **detalle de compra** — cada línea/producto comprado.
* **movimiento de inventario** — cada entrada/salida de stock.
* **cotización** — documento comercial previo a la venta.
* **remisión** — documento de entrega/despacho.
* **nota crédito interna** — documento interno (hoy, por anulación de venta).
* **reporte** — vistas de ventas, utilidad, caja, inventario, etc.

Relación textual simple:

```txt
Producto → Detalle de venta → Venta → Pago → Caja
Compra → Inventario → Costo promedio → Utilidad de venta
Anulación → Nota crédito interna → Reverso de caja/inventario/pagos
```

---

## 4. Documentos internos que maneja Prismia

* **Venta interna / factura interna** — registro de la venta en el sistema.
* **Ticket** — comprobante imprimible de la venta para el cliente.
* **Cotización** — propuesta comercial previa a la venta (convertible a venta).
* **Remisión** — documento de entrega/despacho (convertible a venta).
* **Nota crédito interna** — documento interno generado al anular una venta.
* **Compra a proveedor** — registro de la compra de mercancía.
* **Pagos a proveedores** — abonos/pagos sobre compras.
* **Turnos de caja** — apertura, movimientos y cierre de caja.

Aclaraciones expresas:

```txt
Las notas crédito de Prismia son internas y no fiscales.
```

```txt
Prismia no debe documentarse todavía como sistema de facturación electrónica DIAN.
```

---

## 5. Conceptos base

| Concepto | Definición |
|---|---|
| **Precio de venta** | Precio al que se vende el producto (`precio_venta`). |
| **Precio de costo** | Costo base/manual del producto (`precio_costo`). |
| **Último costo** | Último costo final registrado en una compra (`ultimo_costo`). |
| **Costo promedio** | Costo ponderado del producto, actualizado por las compras (`costo_promedio`). |
| **Subtotal** | Valor de la venta/línea **sin IVA**. |
| **IVA** | Impuesto sobre las ventas (impuesto trasladado, no ingreso del negocio). |
| **Total** | Subtotal + IVA (lo que paga el cliente por la línea/venta). |
| **Descuento** | Rebaja aplicada por unidad / línea. |
| **Pago** | Dinero recibido por la venta (uno o varios medios). |
| **Cambio** | Dinero devuelto al cliente cuando paga de más (efectivo). |
| **Caja** | Dinero y movimientos del punto de venta. |
| **Turno** | Periodo de operación de caja (apertura → cierre). |
| **Utilidad bruta** | Subtotal (sin IVA) − costo. |
| **Margen bruto** | Utilidad bruta expresada como % sobre la venta neta. |
| **Stock** | Cantidad disponible del producto. |
| **Movimiento de inventario** | Cada entrada/salida que cambia el stock. |

---

## 6. Configuración de IVA

Campos y conceptos confirmados:

* **Producto que maneja IVA** (`maneja_iva = 1`): se le calcula IVA.
* **Porcentaje de IVA** (`porcentaje_iva`): entero (p. ej. `19`, `5`, `0`).
* **Precio incluye IVA** (`precio_incluye_iva = 1`): el precio mostrado **ya tiene IVA dentro**.
* **Precio NO incluye IVA** (`precio_incluye_iva = 0`): el IVA se **suma encima** del precio.
* **IVA por defecto desde configuración del negocio** (`configuracion_negocio`):
  `maneja_iva`, `iva_incluido_en_precio`, `porcentaje_iva_defecto`.

**Normalización de porcentajes (confirmada, migración 037):**

```txt
19 = 19%
5  = 5%
0  = sin IVA
```

Aclaración:

```txt
Ya NO se usa 1900 para representar el 19%.
```

---

## 7. Fórmulas de IVA en ventas

Tres casos principales. (Los importes se redondean a **pesos enteros**; ver sección 11.)

### 7.1 Producto con IVA incluido

Ejemplo:

```txt
Precio visible al cliente: $11.900
IVA: 19%
```

Fórmula:

```txt
Subtotal = Total / (1 + tasa IVA)
Subtotal = 11.900 / 1,19
Subtotal = 10.000

IVA = Total - Subtotal
IVA = 11.900 - 10.000
IVA = 1.900

Total = 11.900
```

> El IVA se **separa hacia atrás** desde el precio; el total que paga el cliente es el precio
> visible.

### 7.2 Producto con IVA no incluido

Ejemplo:

```txt
Precio base: $10.000
IVA: 19%
```

Fórmula:

```txt
Subtotal = 10.000
IVA = 10.000 x 19%
IVA = 1.900
Total = 11.900
```

> El IVA se **suma encima** del subtotal.

### 7.3 Producto sin IVA

```txt
Subtotal = precio_unitario_neto x cantidad
IVA = 0
Total = Subtotal
```

Aclaración:

```txt
Lo que es 0 es el IVA, no el subtotal.
```

> Es un error común creer que "sin IVA" significa subtotal 0. El subtotal es el valor normal
> del producto; lo que vale 0 es el impuesto.

---

## 8. Cálculo de una línea de venta

Base: `ventas.service.js` (`calcularLineaVenta`) y el mapa documental.

Paso 1 — precio neto y bruto:

```txt
precio_unitario_neto = precio_unitario - descuento_unitario
bruto_linea = redondear(precio_unitario_neto x cantidad)
```

Paso 2 — según IVA (ver sección 7):

```txt
subtotal_linea   (sin IVA)
impuesto_linea   (IVA de la línea)
total_linea      (subtotal + IVA)
```

Paso 3 — costo y utilidad:

```txt
costo_total_linea    = redondear(precio_costo_referencia x cantidad)
utilidad_bruta_linea = subtotal_linea - costo_total_linea
```

Aclaración importante:

```txt
La utilidad se calcula contra el subtotal SIN IVA, no contra el total.
```

> El IVA no es utilidad del negocio (es impuesto trasladado), por eso no entra en la utilidad.

---

## 9. Descuentos

* **Descuento unitario:** rebaja por unidad del producto (`descuento_unitario`).
* **Descuento por línea:** el efecto del descuento unitario en toda la cantidad de esa línea.
* **Descuento total de la venta:** suma de los descuentos de todas las líneas.
* **Validaciones confirmadas:**
  * el descuento **no puede ser negativo**;
  * el descuento **no puede superar el precio unitario** del producto.

Efectos:

* **Sobre el subtotal:** el descuento reduce el precio neto, por lo tanto reduce el bruto y el
  subtotal.
* **Sobre el IVA:** como el IVA se calcula sobre el valor ya descontado, un descuento **reduce
  también el IVA**.
* **Sobre la utilidad:** al bajar el subtotal (manteniendo el costo), el descuento **reduce la
  utilidad bruta**.

Fórmula:

```txt
descuento_total_linea = descuento_unitario x cantidad
```

---

## 10. Totales de venta

Campos de la venta (cabecera):

* `subtotal`
* `descuento_total`
* `impuesto_total`
* `total`
* `total_pagado`
* `cambio_entregado`
* `total_costo`
* `utilidad_bruta`

Fórmulas confirmadas (suma de líneas):

```txt
subtotal_venta = Σ subtotal_linea
impuesto_total = Σ impuesto_linea
descuento_total = Σ (descuento_unitario x cantidad)
total = subtotal_venta + impuesto_total
total_costo = Σ costo_total_linea
utilidad_bruta = Σ utilidad_bruta_linea
```

Sobre `cambio_entregado`:

```txt
Pendiente de confirmar fórmula exacta a nivel de cabecera para pagos mixtos/efectivo.
```

> En efectivo, el cambio es el dinero devuelto cuando el cliente paga de más; la fórmula a
> nivel de cabecera para pagos mixtos no se documenta aquí porque no está confirmada.
> **No se inventa.**

---

## 11. Redondeo y moneda

Confirmado en `ventas.service.js`:

* Prismia trabaja los **importes monetarios en pesos enteros** (sin decimales).
* **`redondearDinero`** → redondea al **entero más cercano** (0,5 hacia arriba). Se aplica a
  brutos, subtotales, IVA y costos.
* **`redondearCantidad`** → permite **cantidades hasta 3 decimales** (venta fraccionada).
* **`normalizarEntero`** → normaliza valores monetarios y porcentajes **a entero antes de
  guardar**.
* Los cálculos monetarios **se guardan sin decimales**.

Ejemplo (cantidad con decimales, dinero entero):

```txt
Cantidad = 1,250
Precio = 10.000
Bruto = 12.500
```

> Las cantidades pueden tener decimales (p. ej. 1,250 kg), pero el dinero resultante se maneja
> y guarda en pesos enteros.

---

## 12. Costos

Conceptos:

* **`precio_costo`** — costo base/manual del producto (lo que se escribe en el formulario).
* **`ultimo_costo`** — último costo final registrado en una compra.
* **`costo_promedio`** — costo ponderado, actualizado automáticamente con las compras.
* **`precio_costo_referencia`** — el costo que **realmente** usa la venta para calcular costo y
  utilidad.

Orden de prioridad confirmado para el costo de la venta:

```txt
precio_costo_referencia = costo_promedio || ultimo_costo || precio_costo
```

Significado:

* Si hay **costo promedio** (> 0), se usa ese.
* Si no, se usa el **último costo**.
* Si tampoco, se usa el **precio de costo** base del producto.

> Por eso es importante registrar bien las compras: el costo promedio es el que normalmente
> manda en la utilidad de la venta.

---

## 13. Utilidad bruta y margen

Utilidad:

```txt
utilidad_bruta_linea = subtotal_linea - costo_total_linea
utilidad_bruta_venta = Σ utilidad_bruta_linea
```

Aclaración:

```txt
La utilidad se calcula SIN IVA.
```

> El IVA no es ingreso propio del negocio, sino un impuesto que se traslada; por eso la
> utilidad se mide contra el subtotal (sin IVA), no contra el total.

Margen bruto (confirmado en **reportes**, `reportes.service.js`):

```txt
margen_bruto_porcentaje = (utilidad_bruta_neta / total_neto) x 100
```

* Se calcula con **2 decimales**.
* Se calcula sobre ventas en estado **`pagada`**.
* **Confirmado:** el margen se calcula en **reportes**; **no necesariamente se guarda en la
  venta** (la venta guarda `total_costo` y `utilidad_bruta`, pero el % de margen se deriva en
  reportes).

---

## 14. Pagos de venta

* **Pago en efectivo** — dinero físico; afecta el efectivo de la caja.
* **Pago electrónico** — transferencia, tarjeta u otros medios.
* **Pago mixto** — una venta pagada con **varios medios** a la vez.
* **Medios de pago** — catálogo `medios_pago`.
* **Total pagado** (`total_pagado`) — suma de lo recibido.
* **Cambio entregado** (`cambio_entregado`) — devuelto en efectivo cuando paga de más.
* **Relación con caja** — cada pago genera/contribuye a un **movimiento de caja** del turno.
* **Tabla `pagos_venta`** — guarda los pagos de cada venta (con su medio y estado).

Pendiente:

```txt
La fórmula exacta de cambio_entregado en cabecera para pagos mixtos queda pendiente de confirmar.
```

---

## 15. Caja y turnos

* **Turno de caja:** periodo de operación entre la **apertura** y el **cierre** de la caja.
* **Apertura:** crea el turno con una **base inicial** (`monto_inicial`).
* **Ingresos:** entradas de dinero (ventas en efectivo + ingresos manuales).
* **Egresos:** salidas de dinero (egresos manuales).
* **Gastos:** se registran desde caja y se reflejan en los movimientos de efectivo del turno.
* **Ventas asociadas:** las ventas del turno alimentan los totales de caja.
* **Pagos por medio:** el turno acumula `total_efectivo`, `total_transferencia`,
  `total_tarjeta`, `total_otros`.
* **Cierre:** calcula el **monto esperado**, se compara con el **monto contado** y se registra
  la **diferencia**.

Fórmula confirmada del cierre (sobre **EFECTIVO**, `caja.service.js`):

```txt
monto_esperado = monto_inicial + total_efectivo + total_ingresos_manuales - total_egresos_manuales
diferencia = monto_contado - monto_esperado
```

Alcance / aclaraciones:

* El **monto esperado** es del **efectivo** de la caja (no de transferencias/tarjeta, que se
  controlan aparte por medio).
* `total_efectivo` corresponde a las **ventas en efectivo** del turno; los **gastos** y demás
  salidas de efectivo se reflejan dentro de los **egresos / movimientos de efectivo**.
* El desglose exacto de cómo cada gasto entra en `total_egresos_manuales` vs. otros
  contadores es operativo del módulo de caja; el **detalle fino por medio**:
  **Pendiente de confirmar** si se requiere a nivel de fórmula contable.

---

## 16. Compras

* **Compra a proveedor:** registro de mercancía comprada (cabecera `compras`).
* **Detalle de compra:** cada línea/producto comprado (`compras_detalle`).
* **Costo unitario:** costo base de la línea.
* **Descuento de compra:** si existe, se aplica sobre la línea
  (`descuento_porcentaje` / `descuento_linea`).
* **IVA de compra (si aplica):** se considera para el costo final
  (`iva_linea`, `iva_unitario`).
* **Costo unitario final** (`costo_unitario_final`): costo neto + IVA según configuración; es
  el costo que actualiza el producto.
* **Compra de contado / a crédito:** la compra puede quedar pagada o con saldo pendiente.
* **Cuentas por pagar:** saldos pendientes derivados de las compras.
* **Pagos a proveedores:** abonos/pagos sobre la compra (`pagos_compras_proveedores`).

> No se documentan funcionalidades avanzadas de cuentas por pagar (pendiente de producto).

---

## 17. Costo promedio en compras

Fórmula confirmada (`compras.repository.js`), para producto con control de inventario y
`stock_nuevo > 0`:

```txt
valor_inventario_anterior = stock_anterior x costo_promedio_anterior
valor_compra = cantidad x costo_unitario_final

costo_promedio_nuevo =
(valor_inventario_anterior + valor_compra) / stock_nuevo
```

donde `costo_promedio_anterior = costo_promedio || ultimo_costo || precio_costo`.

Casos especiales:

```txt
Si el producto NO controla inventario o stock_nuevo <= 0:
costo_promedio_nuevo = costo_unitario_final
```

Y siempre, en cada compra:

```txt
ultimo_costo = costo_unitario_final
```

> El costo promedio es un **promedio ponderado**: mezcla el valor del inventario que ya tenías
> con el valor de lo que acabas de comprar, dividido entre el stock total resultante.
> El resultado se redondea a peso entero.

---

## 18. Inventario

* **Stock:** cantidad disponible del producto.
* **Producto con control de inventario:** Prismia descuenta/aumenta su stock.
* **Producto sin control de inventario:** se vende sin afectar stock (servicios, etc.).
* **Movimientos de inventario** (`movimientos_inventario`): registran cada cambio de stock.
* **Entradas por compra:** la compra **suma** stock.
* **Salidas por venta:** la venta **resta** stock.
* **Reintegro por anulación:** al anular una venta, el stock vendido **se reintegra**.
* **Ajustes manuales:** correcciones de stock desde inventario.
* **Conteos físicos:** comparan el stock del sistema con el conteo real y registran
  diferencias.
* **Historial:** traza de todos los movimientos.
* **Reportes de inventario:** stock actual, valoración y reportes operativos.

---

## 19. Anulación de ventas

Confirmado (`anularVentaCompleta`, transacción atómica). Al anular una venta:

* la **venta pasa a `anulada`** (con `anulado_en`, `anulado_por`, `motivo_anulacion`);
* se **registra en `anulaciones_venta`** (totales, montos reversados, motivo, usuario);
* se **genera una nota crédito interna** (ver sección 20);
* se **revierte el inventario** (se reintegra el stock vendido);
* se **revierte la caja** (movimiento de caja de anulación + ajuste del turno);
* se **anulan los pagos** en `pagos_venta` (estado `anulado`);
* se **ajusta el turno de caja** (resta ventas y totales por medio, ajusta monto esperado);
* queda **trazabilidad** de usuario, fecha y motivo;
* queda **registro en `auditoria`**.

Aclaración:

```txt
La anulación es una operación delicada y debe hacerse con motivo claro.
```

> Una anulación afecta caja, inventario, pagos y reportes a la vez. Debe usarse con criterio y
> siempre con un motivo registrado.

---

## 20. Notas crédito internas

* **Qué son:** documentos **internos** que dejan constancia del reverso de una venta.
* **Cuándo se generan:** hoy, **automáticamente al anular una venta**.
* **Relación con anulación:** cada nota crédito interna queda enlazada a la venta y a su
  anulación (`id_anulacion_venta`).
* **Tablas:** `notas_credito` y `detalle_notas_credito`.
* **Origen:** `origen = 'anulacion_venta'`.
* **Tipo / estado:** `tipo_nota = 'total'`, `estado = 'emitida'`.
* **Carácter:** `documento_fiscal_estado = 'interno'`.
* **Uso:** se pueden **consultar, ver detalle e imprimir**.

Aclaración:

```txt
No son nota crédito electrónica DIAN.
```

---

## 21. Reportes

Desde la lógica contable, los reportes de Prismia se apoyan en:

* **ventas pagadas** (estado `pagada`);
* **ventas anuladas** (estado `anulada`);
* **ventas netas** (pagadas, descontando lo anulado);
* **IVA** (`impuesto_total`);
* **descuentos** (`descuento_total`);
* **costo** (`total_costo`);
* **utilidad** (`utilidad_bruta`);
* **margen** (`margen_bruto_porcentaje`, calculado en reportes);
* **pagos por medio** (efectivo/transferencia/tarjeta/otros);
* **caja** (turnos y movimientos);
* **inventario** (stock, valoración, reportes operativos).

Métricas a confirmar en el detalle exacto de cada reporte:

* **Productos más vendidos:** existe lógica de detalle de ventas por producto, pero el reporte
  exacto presentado al usuario — **Pendiente de confirmar** el alcance/forma.
* Cualquier otra métrica no listada arriba — **Pendiente de confirmar**.

---

## 22. Auditoría contable

Comando: `npm run db:audit:contable` (`src/database/audit-contable.js`).

**Validaciones confirmadas** (las que ejecuta hoy la auditoría):

1. **Ventas cuadran contra detalle:** subtotal, descuento, IVA, total, costo y utilidad.
2. **Líneas de venta** cumplen la fórmula `subtotal + IVA = total`.
3. **Descuentos unitarios** no superan el precio unitario.
4. **Ventas pagadas** cuadran contra los **pagos registrados**.
5. **Pagos de ventas pagadas** cuadran contra los **movimientos de caja** tipo venta.
6. **No existen productos con stock negativo.**
7. **Compras cuadran contra su detalle:** subtotal, IVA y total.
8. **Compras** tienen saldo coherente con el total pagado.
9. **Notas crédito internas por anulación** cuadran contra la venta anulada.
10. **Turnos de caja** tienen totales almacenados coherentes con sus movimientos.

Aclaración:

```txt
La auditoría contable es de LECTURA, pero sensible: no debe ejecutarse sin saber qué se busca.
```

> Aunque no modifica datos, revisa cuadres delicados del negocio. Conviene ejecutarla con
> criterio (idealmente acompañada de soporte/contador) y entendiendo cada chequeo.

---

## 23. Ejemplos completos

> Números redondos en pesos colombianos. Recordar que el dinero se maneja en **pesos enteros**.

### 23.1 Venta sin IVA

```txt
Producto: cuaderno (no maneja IVA)
Precio unitario: 5.000
Cantidad: 2

bruto_linea = 5.000 x 2 = 10.000
subtotal = 10.000
IVA = 0
total = 10.000
```

### 23.2 Venta con IVA incluido

```txt
Producto: gaseosa (maneja IVA 19%, precio incluye IVA)
Precio visible: 11.900
Cantidad: 1

bruto_linea = 11.900
subtotal = 11.900 / 1,19 = 10.000
IVA = 11.900 - 10.000 = 1.900
total = 11.900
```

### 23.3 Venta con IVA no incluido

```txt
Producto: servicio (maneja IVA 19%, precio NO incluye IVA)
Precio base: 10.000
Cantidad: 1

bruto_linea = 10.000
subtotal = 10.000
IVA = 10.000 x 19% = 1.900
total = 11.900
```

### 23.4 Venta con descuento

```txt
Producto: camiseta (maneja IVA 19%, precio NO incluye IVA)
Precio unitario: 20.000
Descuento unitario: 5.000
Cantidad: 1

precio_unitario_neto = 20.000 - 5.000 = 15.000
bruto_linea = 15.000
subtotal = 15.000
IVA = 15.000 x 19% = 2.850
total = 17.850
descuento_total_linea = 5.000 x 1 = 5.000
```

### 23.5 Venta con costo y utilidad

```txt
Producto: camiseta (sin IVA para simplificar)
Precio unitario: 20.000
Cantidad: 1
precio_costo_referencia (costo_promedio) = 12.000

subtotal = 20.000
costo_total_linea = 12.000 x 1 = 12.000
utilidad_bruta_linea = 20.000 - 12.000 = 8.000
```

> Si el producto tuviera IVA, la utilidad seguiría siendo `subtotal - costo` (sin IVA).

### 23.6 Compra que actualiza costo promedio

```txt
Estado anterior del producto:
stock_anterior = 10
costo_promedio_anterior = 12.000

Compra:
cantidad = 10
costo_unitario_final = 14.000

valor_inventario_anterior = 10 x 12.000 = 120.000
valor_compra = 10 x 14.000 = 140.000
stock_nuevo = 10 + 10 = 20

costo_promedio_nuevo = (120.000 + 140.000) / 20 = 13.000
ultimo_costo = 14.000
```

> El costo promedio sube de 12.000 a 13.000 (promedio ponderado); el último costo queda en
> 14.000.

### 23.7 Anulación de venta y nota crédito interna

```txt
Venta #123: total 17.850, pagada en efectivo, 1 camiseta.

Al anular:
- Venta #123 → estado 'anulada' (con usuario, fecha y motivo)
- Registro en anulaciones_venta
- Nota crédito interna emitida (origen: anulacion_venta, interno)
- Inventario: +1 camiseta (reintegro de stock)
- Caja: movimiento de anulación y ajuste del turno (resta la venta)
- pagos_venta del #123 → estado 'anulado'
- Registro en auditoria
```

### 23.8 Cierre de caja básico

```txt
Apertura:
monto_inicial = 100.000

Durante el turno (efectivo):
total_efectivo (ventas en efectivo) = 250.000
total_ingresos_manuales = 0
total_egresos_manuales (incluye gastos en efectivo) = 50.000

monto_esperado = 100.000 + 250.000 + 0 - 50.000 = 300.000

Al contar la caja:
monto_contado = 298.000
diferencia = 298.000 - 300.000 = -2.000  (faltante de 2.000)
```

> El monto esperado es de **efectivo**. Las transferencias y tarjetas se controlan por su
> propio total y no entran en el efectivo esperado del cajón.

---

## 24. Limitaciones y advertencias contables

* Prismia **no es facturación electrónica DIAN**.
* Las **notas crédito son internas** (no fiscales).
* La **utilidad depende de que los costos estén bien registrados**: si el costo del producto
  está mal, la utilidad estará mal.
* **Compras mal registradas afectan el costo promedio** (y por tanto la utilidad de ventas
  futuras).
* La **caja depende de abrir y cerrar turnos correctamente**: sin turno o con cierres
  descuidados, los números no cuadran.
* **Anular ventas afecta caja, inventario y reportes** a la vez: usar con motivo claro.
* Los **backups no reemplazan una auditoría contable**: son respaldo operativo de datos.
* **Revisar con el contador** el tratamiento del **IVA en compras** según el **régimen** del
  negocio (responsable o no de IVA, descontable o no, etc.).

---

## 25. Glosario contable

| Término | Definición breve |
|---|---|
| **Subtotal** | Valor de la venta/línea sin IVA. |
| **IVA** | Impuesto sobre las ventas (trasladado; no es ingreso del negocio). |
| **Total** | Subtotal + IVA (lo que paga el cliente). |
| **Descuento** | Rebaja por unidad/línea aplicada antes del IVA. |
| **Costo** | Lo que le cuesta al negocio el producto vendido. |
| **Costo promedio** | Costo ponderado del producto, actualizado por las compras. |
| **Último costo** | Último costo final registrado en una compra. |
| **Utilidad bruta** | Subtotal (sin IVA) − costo. |
| **Margen bruto** | Utilidad bruta como % de la venta neta. |
| **Caja** | Dinero y movimientos del punto de venta. |
| **Turno** | Periodo de operación de caja (apertura → cierre). |
| **Movimiento de inventario** | Cada entrada/salida que cambia el stock. |
| **Nota crédito interna** | Documento interno (no fiscal) generado al anular una venta. |
| **Anulación** | Reverso completo de una venta (caja, inventario, pagos). |
| **Venta neta** | Ventas pagadas descontando lo anulado. |
| **Venta anulada** | Venta reversada (estado `anulada`). |

---

## 26. Estado del documento

* **Documento:** Guía contable y lógica del negocio.
* **Versión inicial:** `0.1`.
* **Basado en:**

```txt
docs/manuales/00_MAPA_DOCUMENTAL_PRISMIA.md
docs/manuales/03_GUIA_TECNICA_INTERNA_JOSE.md
```

* **Fecha de creación:** 2026-06-24.
* **Esta guía no reemplaza la asesoría contable profesional** ni la obligación fiscal del
  negocio.
* **La fórmula de `cambio_entregado` en pagos mixtos sigue Pendiente de confirmar** (no se
  resolvió en esta tanda; no se inventó).
* Las secciones marcadas como **Pendiente de confirmar** deben resolverse con inspección
  detallada antes de cerrar la versión definitiva.

---

*Fin de la Guía contable y lógica del negocio de Prismia POS Local (versión `0.1`).*
