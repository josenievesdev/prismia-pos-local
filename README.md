# Prismia POS Local

POS local para pequeños comercios: ventas, caja, inventario, compras, cotizaciones, remisiones, notas crédito, clientes, proveedores, reportes y backups. Funciona sin internet, con base de datos SQLite, y se distribuye como aplicación de escritorio con Electron.

Desarrollado por **Nieves Systems**.

---

## Stack

- **Node.js 24** + **Express 4** + **EJS** (renderizado en servidor; JavaScript de cliente sin framework)
- **SQLite** con `better-sqlite3` (síncrono, transaccional)
- **Electron 37** para la app de escritorio (`electron/main.js`)
- Pruebas con `node:test` (sin dependencias extra)

## Puesta en marcha

```bash
npm install
npm run dev          # servidor de desarrollo con recarga (http://127.0.0.1:3000)
npm test             # pruebas automáticas
npm run electron     # app de escritorio
npm run dist:win     # instalador de Windows (dist/)
```

- `better-sqlite3` es un módulo nativo: `npm run dev` y `npm test` lo compilan para Node y `npm run electron` para Electron. Si ves `NODE_MODULE_VERSION` en un error, se compiló para el otro entorno; vuelve a correr el script que necesitas.
- npm 12 bloquea los scripts de instalación de dependencias que no estén aprobados. Las que el proyecto necesita ya están en `allowScripts` de `package.json`.
- La primera vez que se abre una base nueva, Prismia redirige a `/setup` para crear el administrador.

## Estructura

```
electron/            arranque de la app de escritorio
src/
  app.js             configuración de Express (seguridad, sesión, rutas)
  server.js          servidor HTTP (escucha en 127.0.0.1 por defecto)
  config/            entorno, rutas de datos, secretos, sesión SQLite
  database/
    schema.sql       esquema base (versión 0)
    migrator.js      ejecutor de migraciones (PRAGMA user_version)
    migraciones/     migraciones versionadas (se aplican solas)
    migrations/      scripts legacy 001–037 (histórico, ya incluidos en schema.sql)
    seed/            datos semilla (catálogo DIVIPOLA)
  middlewares/       autenticación, roles, verificación de origen (CSRF)
  modules/<módulo>/  routes → controller → service → repository
  utils/             fechas, helpers comunes, limitador de intentos, sesión
  public/
    css/main.css     base de componentes
    css/sistema.css  sistema de diseño 2026 (tokens, shell, componentes)
    css/modules/     estilos por módulo (pos.css = punto de venta)
    js/              JavaScript de cliente por pantalla + shell.js
  views/             plantillas EJS
tests/               pruebas automáticas (cada archivo usa una base temporal)
```

Regla de capas: **SQL solo en repositorios, reglas de negocio en servicios, request/response en controladores, nada de lógica en las vistas.**

## Base de datos y migraciones

- `schema.sql` es la versión 0. Los cambios de esquema y las reparaciones de datos van como **migraciones versionadas** en `src/database/migraciones/`.
- Al arrancar (`asegurarBaseDatos`), Prismia aplica las migraciones pendientes. Antes de migrar una base con datos crea una copia en `<backups>/pre-migracion/`. Cada migración corre en una transacción junto con el cambio de `user_version`: o se aplica completa o no se aplica.
- Una base de una versión más nueva que la app se rechaza para no dañarla.

Para agregar una migración:

1. Crea `src/database/migraciones/NNN_descripcion.js` con `{ version: NNN, nombre, up(db) }` (y `desactivarForeignKeys: true` si reconstruye tablas; usa `reconstruirTabla` de `utilidades.js`).
2. Agrégala al final de `migraciones/index.js`.
3. Nunca modifiques una migración ya publicada: crea una nueva.

| Versión | Qué hace |
|--------:|----------|
| 1 | Repara los totales guardados de los turnos de caja |
| 2 | Corrige fechas de venta desfasadas por zona horaria |
| 3 | Permite stock negativo (venta sin stock) |
| 4 | Índices de rendimiento (detalle de ventas, historial de inventario) |
| 5 | Carga el catálogo DIVIPOLA en instalaciones nuevas |

## Reglas del dinero

Estas reglas tienen pruebas automáticas; si cambias algo de esto, corre `npm test`.

- **Precios:** el servidor siempre toma el precio de la base de datos; el navegador solo envía productos y cantidades.
- **Transacciones:** cada venta, anulación, movimiento, gasto y cierre corre en una transacción `IMMEDIATE`.
- **Totales de caja:** se **derivan** de `movimientos_caja` (`modules/caja/caja.totales.js`) y se guardan en `turnos_caja` dentro de la misma transacción. No sumes deltas a mano.
- **Efectivo esperado** = base inicial + ventas en efectivo − reversos + ingresos − egresos (solo efectivo).
- **Fechas:** las fechas de negocio (`fecha_venta`, "hoy", vencimientos) son de **hora local** y las asigna el servidor (`utils/fechas.js`). Las columnas con `DEFAULT CURRENT_TIMESTAMP` quedan en **UTC**: para mostrarlas usa `fechaLocal()` en las vistas y para filtrarlas, `datetime(col, 'localtime')`. Nunca uses `toISOString()` para obtener "hoy".
- **Stock:** solo puede quedar negativo si el producto permite venta sin stock o no controla inventario.
- **Costo de compras:** si el negocio es **responsable de IVA** (Configuración), el IVA de la compra no se suma al costo del inventario; si no lo es, sí.

## Pruebas

```bash
npm test            # recompila better-sqlite3 para Node y corre todo
npm run test:rapido # solo corre las pruebas
```

En Windows, cierra el servidor de desarrollo o la app antes de `npm test`: mientras están abiertos bloquean el módulo nativo y la recompilación falla con `EPERM`. Si el módulo ya está compilado para Node, usa `npm run test:rapido`.

| Archivo | Cubre |
|---------|-------|
| `tests/dinero.test.js` | ventas, cambio, pagos mixtos, IVA, decimales, stock, anulación, caja, cierre, invariantes |
| `tests/migraciones.test.js` | migración de una base legacy con los bugs históricos |
| `tests/seguridad.test.js` | login, sesión, CSRF, rutas, subida de imágenes |
| `tests/reportes-fechas.test.js` | fronteras de fecha en dashboard, reportes e historial |
| `tests/instalacion.test.js` | instalación limpia |
| `tests/fechas.test.js` | utilidades de fecha |

Cada archivo crea su propia base en la carpeta temporal del sistema; las pruebas nunca tocan la base real.

## Seguridad

- El servidor HTTP escucha solo en `127.0.0.1` (`APP_HOST` para cambiarlo). El POS móvil con cámara usa el servidor HTTPS (`npm run dev:https`), pensado para la red local.
- Login con límite de intentos y regeneración de sesión; clave de soporte de backups con límite de intentos.
- Protección CSRF por verificación de `Origin`/`Referer` (`middlewares/origen.middleware.js`); por eso `Referrer-Policy` es `same-origin`.
- El HTML dinámico del cliente se escapa con `escaparHtml`.
- En producción, `SESSION_SECRET` y `SUPPORT_BACKUP_KEY` se generan por instalación si no vienen del entorno.

## Diseño

- `sistema.css` define los tokens (colores, tipografía, radios, sombras) y el shell: menú completo, riel de íconos (POS y pantallas < 1280 px) o panel deslizable en celular (< 768 px).
- `modules/pos.css` es el punto de venta: dos paneles (catálogo y ticket), modo clásico y táctil, perfiles General / Comidas / Boutique. En escritorio y tablet horizontal ocupa la ventana exacta, con "Cobrar" siempre visible.

## Datos en producción

En la app instalada los datos viven en `%APPDATA%\Prismia POS Local\` (o en `PRISMIA_DATA_DIR`):

```
data/prismia_pos_local.sqlite   base de datos
backups/                        backups y respaldos pre-migración
uploads/                        imágenes de productos
config/secretos.local.json      secretos generados por instalación
```

## Pendientes conocidos

- Actualizar `xlsx` a la versión oficial corregida (0.20.3), que trae parches de seguridad:
  `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
- Unificar `normalizarNumero` y `normalizarEntero`: hay variantes con reglas distintas por módulo; revisar caso por caso.
- `cotizaciones` y `remisiones` comparten cerca del 80 % del código; conviene extraer un módulo común.
- Llevar al sistema de diseño el CSS propio de cada módulo (historial y detalle de ventas siguen usando `ventas.css`) y agregar modo oscuro.
- Activar Content-Security-Policy cuando las vistas dejen de usar scripts en línea.
