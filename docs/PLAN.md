# Plan de trabajo — Prismia POS

Orden: de lo más importante a lo más sencillo. Marcar `[x]` al terminar.

## Diagnóstico de diseño (medido el 2026-11-22)

Recorriendo 23 pantallas y midiendo estilos reales:

- 15 variantes de botón, 24 de tarjeta, 11 de título.
- 88 clases distintas que hacen de "tarjeta" (`dash-kpi`, `reportes-kpi-card`,
  `caja-operativo-total-box`, `compras-payable-card`, `count-summary-card`…).
- Causa raíz: cada módulo creó sus propios componentes y su propio CSS
  (≈11.000 líneas en `public/css/modules/`). No hay componentes compartidos.

**Regla desde ahora:** ninguna vista define tarjetas, botones, KPIs, tablas,
filtros ni estados propios. Todo sale de la librería (`sistema.css` +
`views/partials/ui/`). El CSS de módulo solo puede tener lo que de verdad es
único de esa pantalla, y debería tender a cero.

## Fase 1 — Dinero exacto ✅
- [x] Totales de caja derivados de movimientos, fechas locales, stock negativo, IVA en costo.
- [x] Aritmética entera exacta compartida servidor/navegador (`dinero-exacto.js`).
- [ ] Unificar la lectura de números del usuario (`normalizarNumero`/`normalizarEntero`
      tienen 4 y 6 variantes): definir UNA regla (punto de miles, coma decimal) y
      revisar cada pantalla que recibe montos o cantidades.

## Fase 2 — Librería de componentes (base de todo lo demás)
- [x] Componentes CSS: encabezado, filtros, campo, KPI, grilla, tarjeta, métricas,
      tabla, estado (badge), vacío, nota.
- [ ] Componentes que faltan: formulario en secciones, paginación, modal, barra de
      acciones de tabla (se crean al migrar el primer módulo que los use).
- [x] Parciales EJS en `views/partials/ui/` para que las vistas "hereden" el
      diseño: `encabezado`, `kpi`, `estado`, `vacio`, `paginacion`.
- [ ] Reglas de botones: 1 primario por pantalla (arriba a la derecha), los
      demás secundarios; mismo alto (40 px, 32 px en tablas); acciones
      destructivas en rojo suave.

## Fase 3 — Migrar módulo por módulo (por uso diario)
Para cada uno: inspeccionar tarjetas/botones/tablas, pasar a componentes,
borrar su CSS propio, revisar en 1440 / 1024 / 390 px sin scroll horizontal.

- [x] Reportes (referencia: views/reportes/index.ejs, sin CSS propio)
- [ ] Caja (índice, movimiento, gasto, cerrar, detalle de turno)
- [ ] Dashboard
- [ ] Inventario (índice, ajuste, historial, conteos, reportes)
- [ ] Productos y categorías
- [ ] Historial y detalle de ventas
- [ ] Clientes
- [ ] Compras y cuentas por pagar
- [ ] Cotizaciones y remisiones
- [ ] Notas crédito
- [ ] Proveedores, usuarios, configuración
- [ ] Login, setup y backups
- [ ] Impresiones (ticket, arqueo, cotización, remisión, nota crédito)

## Fase 4 — POS fácil de manejar
- [ ] Botones de pago rápido: "Exacto", $10.000, $20.000, $50.000, $100.000.
- [ ] Cambio grande y visible al digitar lo recibido.
- [ ] Atajos de teclado (F2 buscar, F9 cobrar, Esc cancelar) con ayuda visible.
- [ ] Modo táctil con catálogo completo por categorías (hoy solo 6 accesos rápidos).
- [ ] Lector de código de barras: Enter agrega directo al carrito.
- [ ] Barra superior más simple (perfil de negocio dentro de configuración).

## Fase 5 — Calidad de código
- [ ] Unificar cotizaciones y remisiones (~80 % duplicado).
- [ ] Actualizar `xlsx` a 0.20.3 (requiere que el usuario lo instale).
- [ ] Modo oscuro (cuando todo use tokens).
- [ ] Content-Security-Policy (quitar scripts en línea).
