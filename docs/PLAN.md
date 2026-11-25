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

## Errores visuales reportados por el usuario

Se atienden antes que la siguiente fase. Fecha del reporte entre paréntesis.

- [x] (2026-11-22) El sidebar vuelve arriba al cambiar de módulo: la pantalla "salta".
      Debe conservar su scroll y solo cambiar el contenido.
- [x] (2026-11-22) Colapsar/expandir el sidebar es brusco y el botón no se entiende.
      Referencia: barra lateral de ChatGPT (botón de panel arriba, animación fluida,
      ayuda al pasar el mouse).
- [x] (2026-11-22) Usuarios: el estado activo/inactivo y los botones se ven desordenados.
- [x] (2026-11-22) Caja: las tarjetas "Turno activo" y "Resumen del efectivo" tienen
      tamaños distintos.

- [x] (2026-11-22, 2.º reporte) La pantalla sigue saltando al cambiar de módulo:
      el título del módulo y el bloque "Administrador / Salir" cambian de tamaño o
      posición según el módulo; algunos módulos saltan entre sí.
      Causas medidas y corregidas: (1) la barra de scroll aparecía/desaparecía
      según el largo de la página → `scrollbar-gutter: stable`; (2) el POS tenía
      otro margen (10 px más arriba) → mismo margen en todos; (3) en pantallas
      grandes los módulos se centraban con ancho máximo y el POS no (~100 px de
      salto lateral) → ancho completo en todos; (4) la transición movía el
      contenido 4 px → solo fundido de 90 ms. Verificado: las 16 pantallas
      principales tienen título, usuario y contenido en la misma posición exacta
      a 1366 y a 1920 px.
- [x] (2026-11-22, 2.º reporte) Algunos módulos cargan lento y se nota.
      Causa: cada archivo estático (CSS, JS, imágenes) pasaba por la sesión y
      escribía en SQLite. Ahora los estáticos se sirven antes de la sesión y la
      sesión se renueva como máximo una vez por minuto. Medido en Electron: las
      pantallas quedan listas en 14–23 ms y cargan completas en 16–34 ms.
- [x] (2026-11-22, 2.º reporte) Demasiado texto: título, subtítulo y más subtítulos
      dentro del mismo módulo. La vista debe ser limpia y minimalista.
      Regla nueva: UN solo título por pantalla (el de la barra superior). Se
      quitaron etiquetas encima de títulos, descripciones de encabezado, 27
      subtítulos decorativos y todas las MAYÚSCULAS forzadas. Se conservan los
      estados vacíos, las advertencias de acciones irreversibles y las
      explicaciones de dinero (cierre de caja).
      Pendiente al migrar cada módulo: textos de ayuda de formularios (Cerrar
      caja, Productos) y la cabecera de Cotización/Remisión/Compra, que repite
      el número del documento tres veces.

## Idea del usuario: "corazón del dinero" (anotada, no implementada aún)

Un núcleo de cálculo de dinero aparte, muy limpio y perfecto en las cuentas, al
estilo de los sistemas bancarios (que usan COBOL por su aritmética decimal de
punto fijo). Propuesta técnica para cuando se aborde:
- Un solo módulo (`src/nucleo-dinero/`) con TODAS las cuentas: líneas, IVA,
  descuentos, totales, cambio, pagos mixtos, efectivo esperado, costo promedio.
- Tipos explícitos: pesos (enteros), cantidades (milésimas enteras), porcentajes
  (centésimas enteras). Cero números decimales de JavaScript.
- Funciones puras, una política de redondeo documentada, pruebas exhaustivas
  (incluidas pruebas contra BigInt) y el mismo código en servidor y navegador.
- No hace falta otro lenguaje: lo que hace confiable a COBOL es el punto fijo
  decimal, y eso se logra con enteros/BigInt. Base ya hecha: `dinero-exacto.js`.

## Fase 1 — Dinero exacto ✅
- [x] Totales de caja derivados de movimientos, fechas locales, stock negativo, IVA en costo.
- [x] Aritmética entera exacta compartida servidor/navegador (`dinero-exacto.js`).
- [ ] Unificar la lectura de números del usuario (`normalizarNumero`/`normalizarEntero`
      tienen 4 y 6 variantes): definir UNA regla (punto de miles, coma decimal) y
      revisar cada pantalla que recibe montos o cantidades.

## Fase 2 — Librería de componentes (base de todo lo demás)
- [x] Componentes CSS: encabezado, filtros, campo, KPI, grilla, tarjeta, métricas,
      tabla, estado (badge), vacío, nota.
- [x] Formulario en secciones, opciones tipo tarjeta, acciones de fila, estado con punto.
- [ ] Componentes que faltan: paginación y modal (se crean al migrar el primer módulo que los use).
- [x] Parciales EJS en `views/partials/ui/`: `encabezado`, `kpi`, `estado`, `vacio`
      (falta `paginacion`).
- [ ] Reglas de botones: 1 primario por pantalla (arriba a la derecha), los
      demás secundarios; mismo alto (40 px, 32 px en tablas); acciones
      destructivas en rojo suave.
      Hecho: el botón rojo ya no se redefine en ventas.css (medía 36 px).
      Falta: Cotización/Compra nueva usan botones de 36 px (ventas.css).
- [x] Barra de página (`partials/ui/encabezado`): ya no repite el título; muestra
      estado + dato breve a la izquierda y acciones a la derecha. Si no hay
      nada que mostrar, no se dibuja.

## Fase 3 — Migrar módulo por módulo (por uso diario)
Para cada uno: inspeccionar tarjetas/botones/tablas, pasar a componentes,
borrar su CSS propio, revisar en 1440 / 1024 / 390 px sin scroll horizontal.

- [x] Reportes (referencia: views/reportes/index.ejs, sin CSS propio)
- [ ] Caja: [x] índice · [ ] abrir, movimiento, gasto, cerrar, detalle de turno
- [ ] Dashboard: [x] título "Inicio", KPIs de la librería, sin rótulos, sin recortes
      en ventanas bajas · [ ] tarjetas internas a componentes y borrar dashboard.css
- [ ] Inventario (índice, ajuste, historial, conteos, reportes)
- [ ] Productos y categorías
- [ ] Historial y detalle de ventas
- [ ] Clientes
- [ ] Compras y cuentas por pagar
- [ ] Cotizaciones y remisiones
- [ ] Notas crédito
- [x] Usuarios (índice y formulario, sin CSS propio)
- [ ] Proveedores, configuración
- [ ] Login, setup y backups
- [ ] Impresiones (ticket, arqueo, cotización, remisión, nota crédito)

## Fase 4 — POS fácil de manejar (diseño de pen.dev en `designe/`)
Parte 1 — modo clásico (2026-11-23):
- [x] Ticket como tira de papel térmico; cada línea como cuenta ("25 m × $ 3.900").
- [x] Buscador por palabras sueltas y sin tildes ("cable 12 blanco"); código exacto primero.
- [x] Cantidad antes del código: "25*" o "25x " muestra la ficha "25 ×".
- [x] Lector de código de barras: Enter agrega el exacto; escribir fuera del buscador va al buscador.
- [x] Producto por medida o peso: el foco va directo a la cantidad.
- [x] "−" en 1 se vuelve papelera; la línea quitada queda 5 s con Deshacer (Ctrl+Z).
- [x] Stock: aviso amarillo si el producto permite vender sin stock; si no, se bloquea
      (respeta la opción del producto, igual que el servidor).
- [x] Cobro en la columna derecha (el ticket no se mueve): medios con Alt+1…9,
      billetes rápidos, pago mixto, "Falta"/"Cambio" en grande, pie fijo con Registrar.
- [x] Venta registrada: cambio en grande, Imprimir ticket (Ctrl+P); se oculta al escanear.
- [x] Caja cerrada: aviso con "Abrir caja".
- [x] Atajos: F2 buscar · F4 cliente · F8 cantidad · F9 cobrar/registrar · Supr · Esc · Alt+1…6.
- [x] Ventas pendientes reales (antes decía "se conectará después").
- [x] La venta en curso sobrevive si el cajero va a otro módulo y vuelve.
- [x] Frecuentes editables sin recargar la página (antes se perdía la venta en curso).
- [x] Modo enfoque: oculta el menú (Esc dos veces para salir).
Parte 2 — táctil y pantallas pequeñas:
- [ ] Táctil: categorías + catálogo con fotos, teclado numérico "¿Cuántos metros?",
      barra inferior con total y Cobrar, cobro a pantalla completa con teclado.
- [ ] Tablet 1024 y celular 390 según el diseño (ticket como hoja inferior).
- [ ] Fuentes IBM Plex (hay que descargarlas e incluirlas en la app: pedir permiso).
- [ ] Balanza (espacio previsto en el diseño de 1920).
- [ ] Adelgazar `pos.css`: hoy solo lo usan cotización, remisión y compra.

## Sistema visual del POS en toda la app (2026-11-24)
- [x] Letras IBM Plex Sans (texto) e IBM Plex Mono (cifras y códigos), locales en
      `public/fonts` (licencia OFL), en todas las pantallas y en las impresiones.
- [x] Paleta del POS como tokens globales (`sistema.css`); el POS usa esos tokens.
- [x] Cifras en Mono: indicadores (KPI), métricas y columnas de dinero.
- [x] Avisos fijos (`.alert`) con ícono y texto oscuro; aviso flotante `ui-aviso`
      (tarjeta blanca con ícono) en el POS.
- [x] Caja cerrada sin candado rojo; confirmaciones sin el "!" rojo.
- [x] Ticket de venta rediseñado (papel térmico, cada producto como cuenta, IVA por
      tarifa, pagos con referencia); cotización y remisión impresas con el mismo estilo.
- [ ] Arqueo de caja, nota crédito y compra impresas: ya tienen la letra nueva, falta
      su diseño.
- [ ] Usar `ui-aviso` también en los demás módulos (hoy muestran el aviso fijo).
- [x] (2026-11-24) Colores propios de los módulos: 616 colores de la paleta vieja
      (grises pizarra, azul #244f8f, verdes/rojos/amarillos sueltos) pasados a los
      tokens del POS en `main.css` y en el CSS de 14 módulos. `main.css` usa la misma
      paleta (para login e instalación, que no cargan `sistema.css`).
- [x] Login nuevo (`auth/login.ejs` + `modules/login.css`): panel de tinta con un
      ticket térmico de ejemplo, ver/ocultar contraseña, aviso de mayúsculas, un solo
      envío. Instalación inicial con el mismo panel oscuro.
- [x] Inicio: "Efectivo esperado" sin degradado y cifras en Mono.
- [x] Frecuentes del POS: nombre en 2 líneas (no se corta lo que distingue a un
      producto), foto sin recortar, iniciales en el color del perfil, "Sin stock".
      En táctil la foto depende del perfil: apaisada (general), 4:3 (comidas),
      vertical (boutique).
- [x] Acciones de fila (Ver, Imprimir, Ver detalle) como botón pequeño, no píldora.
- [x] Quitadas notas de desarrollo ("API funcional…", "Regla operativa…").
- [x] Cotizaciones: la tabla tenía una celda de más (columnas corridas).
- [x] (2026-11-24, 2.ª ronda) Menú lateral en tinta (#1e2129), como el POS y el
      login: activo con fondo translúcido y marca azul aclarada; títulos de grupo
      sin mayúsculas; menú deslizable del celular igual.
- [x] Papel del ticket en toda la app. Regla: la tarjeta que contiene una tabla
      (listados, documentos, detalles) es papel crema con franja de tinta de 6 px,
      y la tabla va directo sobre el papel. Filtros, indicadores y formularios
      siguen en blanco. 35 tarjetas en 33 pantallas.
- [x] Login, lado derecho: papel del ticket con el borde dentado, nombre del
      negocio, fecha y hora en Mono, y "Entrar" en tinta.
- [x] Login con impresora térmica animada: el ticket sale de la ranura (de abajo
      hacia arriba), se arranca y sale el siguiente: ferretería (metros),
      minimercado (kilos) y boutique (tallas). En ventanas bajas se reduce con
      `zoom` en vez de ocultarse (antes desaparecía por debajo de 640 px de alto).
      Con "reducir movimiento" queda quieto; con la pestaña oculta no anima.
- [x] (2026-11-24, 4.ª ronda) Botones: la acción principal (`btn-primary`) va en
      tinta en toda la app; filtros y botones repetidos en cada fila ("Ticket",
      "Pagar") pasan a secundarios (14 en 13 vistas). Regla: tinta = principal,
      blanco = secundaria, rojo suave = destructiva, verde solo para Cobrar.
      Barrido final: 0 botones azules en 35 pantallas.
- [x] Destacados en tinta: "Efectivo esperado" (Caja y cierre), valorización de
      inventario. Números de documento y montos en Mono negro (no azul). Estado
      "Convertida" en verde (era morado); "Interna" sin índigo.
- [x] Logo con amarillo pastel (`--color-marca-amarillo`): pieza grande amarilla
      sobre tinta; sobre fondo claro el logo va en un cuadro de tinta.
- [x] Inicio rediseñado (`dashboard/index.ejs` + `dashboard.css`, de 664 a ~600
      líneas limpias): "Hoy" con la cifra en Mono, ventas por hora (columnas de
      tinta, la hora en curso en verde, el pico con su valor, detalle al pasar el
      mouse o con teclado), cifras de apoyo con margen del día; Caja en tinta;
      medios de pago con barras de un color y su porcentaje; más vendidos; últimas
      ventas sobre papel; "Atención" solo si hay stock bajo o anulaciones. Usa los
      mismos datos del servidor (no recalcula dinero). Hora de apertura de caja en
      hora local (venía en UTC).
- [ ] Llevar las acciones de cada módulo a la barra superior, como el POS
      (hoy ocupan una fila propia). Requiere tocar ~25 vistas: hacerlo módulo a módulo.

## Unión con GitHub (2026-11-24)
- [x] La rama de la auditoría se unió con 66 commits de GitHub (junio-agosto:
      licencia local, descuentos por línea, login reforzado, manuales).
- [x] Descuentos por línea llevados al POS nuevo (clic en el precio o F6), al
      ticket (precio neto + "Descuentos aplicados") y a Reportes.
- [x] Migración versionada 006 = migraciones manuales 038-040 (licencia_local);
      ensure-db ya no bloquea bases existentes sin esa tabla.
- [x] Stock: se respeta "Permite vender sin stock" de cada producto (GitHub lo
      ignoraba y bloqueaba siempre); mensaje claro de GitHub para el resto.
- [x] "Nieves Systems" -> TINAI (se conserva el appId del instalador).
- [x] README con capturas del diseño nuevo tomadas del demo (npm run demo:reset).
- [x] Propinas (bares y restaurantes): ver la sección siguiente.

## Propinas por mesero (2026-11-25, rama `propinas-meseros`)
Reglas acordadas con el usuario:
- Solo en el perfil "Comidas y bares" del POS. En General y Boutique no aparece nada.
- Voluntaria. Se sugiere un % configurable (10 % por defecto), calculado sobre el
  valor antes de impuestos y redondeado hacia abajo. El cajero la acepta, la cambia o la deja en 0.
- No es venta: no lleva IVA, no suma a ventas ni a reportes de ventas.
- Cada propina queda a nombre del mesero que atendió; nunca se reparte entre todos.
  Sin mesero no se puede registrar una propina (el POS y el servidor lo bloquean).
- Ticket: "Mesero", "Propina voluntaria" y "Total pagado".
- Cierre, detalle y arqueo impreso: sección aparte "Propinas por mesero", con el
  total, la parte en efectivo y otros medios, y una tabla por mesero (ventas atendidas,
  vendido, propinas). Las propinas en efectivo están en el cajón: entran al efectivo esperado.

Hecho:
- [x] Migración 007: tabla `meseros`; `ventas.id_mesero` y `ventas.propina`;
      `pagos_venta.monto_propina`; `turnos_caja.total_propinas(_efectivo)`;
      `% sugerido` en configuración; movimientos `propina` y `anulacion_propina`.
- [x] Dinero: la propina se reparte entre los pagos de forma proporcional y
      exacta, sin perder pesos. Anular la venta también revierte la propina. Caja,
      dashboard y arqueo cuentan la propina con la misma fuente (movimientos).
- [x] Pantalla "Meseros y propinas" (/meseros, solo administrador): agregar,
      activar o desactivar meseros y fijar el %. Hay acceso desde Configuración.
- [x] POS: chip "Mesero" (F3) junto al cliente; bloque "Propina voluntaria"
      (Sin propina / % sugerido / Otro valor) y fila "A cobrar". "Recibido" sigue
      la propina. Las ventas en espera y la venta en curso recuerdan el mesero.
- [x] Aviso de venta sin stock más limpio: etiqueta ámbar "Solo hay N · quedará −M"
      (se sigue vendiendo si el producto lo permite).
- [x] Pruebas: tests/propinas.test.js (9) + prueba de humo con venta con propina.
- [ ] Reporte de propinas por mesero entre fechas (hoy se ve por turno de caja).
      El usuario lo quiere ("sería bueno"): para pagar a cada mesero por semana o quincena.

## IVA: el precio de venta es el precio final (2026-11-25, rama `iva-revision`)
Problema encontrado en la revisión:
- El producto podía guardarse como "precio + IVA" y el POS le sumaba el 19 % encima.
  El cliente pagaba más que el precio publicado (Ley 1480 de 2011, art. 26: el precio
  al consumidor se informa con todos los impuestos incluidos).
- El precio sugerido de Compras (costo + IVA + ganancia, igual que en Siigo) ya trae
  el IVA: en un producto "precio + IVA" el IVA se cobraba dos veces.
- El formulario tenía 3 controles para una sola idea (2 casillas y un % libre).

Arreglo (como Siigo: el precio no cambia, el IVA se separa en el ticket):
- [x] Migración 008: los productos "precio + IVA" pasan a precio final sumándoles su IVA
      con la misma aritmética del POS. Por unidad se cobra igual (misma base, mismo IVA)
      y cada cambio queda en auditoría.
- [x] Formulario: un solo selector "IVA del producto" (Sin IVA / 5 % / 19 %) con el desglose
      en vivo ("Base $ X + IVA $ Y = $ precio"). Un producto antiguo con otra tarifa la conserva.
- [x] Producto nuevo: 19 % si el negocio es responsable de IVA, "Sin IVA" si no.
- [x] Aviso en el formulario si el negocio está marcado como no responsable de IVA.
- [x] Venta sin stock: la decide cada producto ("Permitir venta sin stock", explicada en el
      formulario); el POS avisa con la etiqueta ámbar y, si la bloquea, dice cómo activarla.
- [x] Pruebas: tests/iva-precio-final.test.js (4).

Pendiente (decisión del usuario):
- [ ] Si el negocio NO es responsable de IVA, ¿bloquear el IVA en productos y ventas?
      Hoy solo se avisa. En la base de pruebas el negocio figura como no responsable y
      7 productos cobran IVA.
- [ ] Restaurantes y bares: en general no cobran IVA sino impuesto al consumo (INC 8 %).
      Confirmar con un contador antes de usar el perfil "Comidas y bares" con impuestos.
- [ ] Factura electrónica / POS electrónico DIAN: el ticket es un comprobante interno; para
      que valga ante la DIAN hace falta un proveedor tecnológico (proyecto aparte).

## Fase 5 — Calidad de código
- [ ] Unificar cotizaciones y remisiones (~80 % duplicado).
- [ ] Actualizar `xlsx` a 0.20.3 (requiere que el usuario lo instale).
- [ ] Modo oscuro (cuando todo use tokens).
- [ ] Content-Security-Policy (quitar scripts en línea).
