# Mapa documental de Prismia POS Local

> Documento base de la documentación de Prismia POS Local.
> Esta primera versión es **solo documentación**: no modifica código, base de datos,
> migraciones, `.env`, `storage/`, backups ni certificados.
>
> Cuando un dato no se pudo confirmar directamente desde el código se marca como
> **Pendiente de confirmar**.
>
> Fecha de elaboración: 2026-06-22 · Ajuste (tanda 1.1): 2026-06-24 · Versión: `0.1 ajustada`
> (ver sección 16 "Estado de revisión del mapa").

---

## 1. Resumen del sistema

**Prismia POS Local** es un sistema de punto de venta (POS) **local para Windows**,
desarrollado por **Nieves Systems / TINAI**, pensado para pequeños y medianos negocios.

Permite operar **ventas, caja, inventario, compras, clientes, proveedores,
documentos comerciales (cotizaciones, remisiones, notas crédito), reportes y backups**
desde una aplicación instalada en el equipo del negocio, **sin depender de servidores
externos** ni de instalaciones complejas de bases de datos.

Stack técnico confirmado en `package.json` y `README.md`:

* **Node.js** + **Express** (servidor web local).
* **EJS** + **express-ejs-layouts** (vistas renderizadas en servidor).
* **SQLite** vía **better-sqlite3** (base de datos local en un solo archivo).
* **express-session** con almacén de sesiones en SQLite (`sqlite-session-store`).
* **helmet**, **morgan** (seguridad y logging).
* **multer** (subida de archivos / imágenes), **xlsx** (Excel), **archiver** / **adm-zip** (backups ZIP).
* **bcryptjs** (hash de contraseñas).
* **Electron** + **electron-builder** (empaquetado como app de escritorio e instalador NSIS para Windows).

Estado actual (según `README.md`): **V1 piloto funcional**, en fase de cierre pre-piloto,
con los bloques principales ya validados.

Versión visible: `1.0.0` (`package.json` y `src/config/empresa.js`).
Identificador de aplicación: `com.nievessystems.prismia-pos-local`.

---

## 2. Estructura general del proyecto

| Carpeta | Propósito |
|---|---|
| `src/` | Código de la aplicación (servidor Express, módulos, vistas, base de datos, config). |
| `src/config/` | Configuración: entorno (`env.js`), rutas runtime, secretos, sesión SQLite, empresa, licencia comercial. |
| `src/database/` | Esquema (`schema.sql`), migraciones, inicialización, validación y auditorías de la base. |
| `src/middlewares/` | Middlewares: autenticación, roles, locals, licencia, manejo de errores. |
| `src/modules/` | Módulos funcionales del sistema (un subdirectorio por módulo). |
| `src/views/` | Vistas EJS agrupadas por módulo. |
| `src/public/` | Activos estáticos: `css/`, `js/`, `uploads/`, `vendor/`. |
| `electron/` | Punto de entrada de Electron (`main.js`) que arranca el servidor y abre la ventana. |
| `scripts/` | Scripts utilitarios: diagnóstico runtime, verificación pre-Electron, demo. |
| `tools/` | Herramientas de licenciamiento (generación de claves y códigos de activación). |
| `docs/` | Documentación y auditorías del proyecto (incluye esta carpeta `manuales/`). |
| `build/` | Íconos del instalador y la app (`icon.ico`, `icon.png`). |
| `dist/` | Salida del empaquetado / instalador (no versionada). |
| `storage/` | **Sensible.** Datos runtime / backups en algunos entornos. No se modifica. |
| `certs/` | **Sensible.** Certificados HTTPS locales. No se modifica. |

Carpetas y archivos **sensibles** (se mencionan solo para el mapa técnico; **no se modifican
ni se exponen secretos**):

```txt
.env
storage/
certs/
src/database/data/
tools/licencias/private/
```

> Nota: en instalación real, los datos del negocio (base de datos, config, backups, uploads)
> viven en `C:\Users\USUARIO\AppData\Roaming\Prismia POS Local`, no dentro del repositorio
> (ver `README.md` → "Ruta de datos en producción").

---

## 3. Módulos existentes

Detectados en `src/modules/`. Cada módulo sigue el patrón `repository` (SQL/datos),
`service` (reglas de negocio), `controller` (request/response) y `routes` (rutas Express),
aunque no todos tienen los cuatro archivos.

| Módulo | Propósito | Archivos principales | Ruta base | Vistas | Estado |
|---|---|---|---|---|---|
| `auth` | Login / logout y protección de sesión. | `auth.routes.js`, `auth.service.js`, `auth.repository.js` | `/auth` | `auth/login.ejs` | Confirmado |
| `setup` | Configuración inicial del primer administrador. | `setup.routes.js`, `setup.service.js`, `setup.controller.js`, `setup.repository.js` | `/setup` | `setup/index.ejs` | Confirmado |
| `dashboard` | Vista general / panel de inicio. | `dashboard.routes.js`, `dashboard.service.js`, `dashboard.controller.js`, `dashboard.repository.js` | `/dashboard` | `dashboard/index.ejs` | Confirmado |
| `configuracion` | Datos del negocio, moneda, IVA, mensaje de recibo. | `configuracion.*` (routes/controller/service/repository) | `/configuracion` | `configuracion/index.ejs` | Confirmado |
| `usuarios` | Administración de usuarios (crear/editar/activar/desactivar). | `usuarios.*` | `/usuarios` | `usuarios/index.ejs`, `formulario.ejs` | Confirmado |
| `clientes` | Gestión de clientes y datos de facturación. | `clientes.*` + `public/js/clientes.js` | `/clientes` | `clientes/index.ejs`, `form.ejs` | Confirmado |
| `productos` | Productos, precios, costos, IVA, stock, imagen. | `productos.controller.js`, `productos.service.js`, `productos.repository.js`, `productos.routes.js` | `/productos` | `productos/index.ejs`, `formulario.ejs` | Confirmado |
| `categorias-productos` | Categorías de productos. | `categorias.*` | `/categorias-productos` | `categorias-productos/index.ejs`, `formulario.ejs` | Confirmado |
| `catalogos` | Catálogos de apoyo (departamentos / municipios DIVIPOLA). | `catalogos.*` | `/catalogos` | (API, sin vista propia) | Confirmado |
| `inventario` | Stock, ajustes, historial, conteos físicos, reportes. | `inventario.controller.js`, `inventario.service.js`, `inventario.routes.js` | `/inventario` | `inventario/index.ejs`, `ajuste.ejs`, `historial.ejs`, `reportes.ejs`, `conteos/` | Confirmado |
| `ventas` | POS / ventas, carrito, pagos, ticket, historial, POS móvil. | `ventas.service.js`, `ventas.repository.js`, `ventas.controller.js`, `ventas.routes.js` + `public/js/ventas-movil.js`, `ventas-anulacion.js` | `/ventas` | `ventas/index.ejs`, `movil.ejs`, `historial.ejs`, `detalle.ejs`, `ticket.ejs` | Confirmado |
| `caja` | Apertura, movimientos, gastos, cierre y turnos de caja. | `caja.service.js`, `caja.repository.js`, `caja.controller.js`, `caja.routes.js` | `/caja` | `caja/index.ejs`, `abrir.ejs`, `cerrar.ejs`, `gasto.ejs`, `movimiento.ejs`, `turno-detalle.ejs`, `turno-imprimir.ejs` | Confirmado |
| `compras` | Compras a proveedores, detalle, cuentas por pagar y pagos. | `compras.repository.js`, `compras.routes.js` + `public/js/compras-formulario.js`, `compras-detalle.js` | `/compras` | `compras/index.ejs`, `formulario.ejs`, `detalle.ejs`, `imprimir.ejs`, `cuentas-por-pagar.ejs`, `pago-proveedor.ejs`, `pagos-proveedores.ejs` | Confirmado |
| `proveedores` | Gestión de proveedores. | `proveedores.*` | `/proveedores` | `proveedores/index.ejs`, `formulario.ejs` | Confirmado |
| `cotizaciones` | Cotizaciones y conversión a venta. | `cotizaciones.*` + `public/js/cotizaciones.js` | `/cotizaciones` | `cotizaciones/index.ejs`, `form.ejs`, `detalle.ejs`, `imprimir.ejs` | Confirmado |
| `remisiones` | Remisiones / despacho y conversión a venta. | `remisiones.*` + `public/js/remisiones.js` | `/remisiones` | `remisiones/index.ejs`, `form.ejs`, `detalle.ejs`, `imprimir.ejs` | Confirmado |
| `notasCredito` | Notas crédito internas. | `notasCredito.*` (repository/service/controller/routes) | `/notas-credito` | `notasCredito/index.ejs`, `detalle.ejs`, `imprimir.ejs` | Confirmado |
| `reportes` | Reportes operativos y de ventas. | `reportes.controller.js`, `reportes.routes.js` | `/reportes` | `reportes/index.ejs` | Confirmado |
| `backups` | Backups y modo soporte (restauración controlada). | `backups.service.js`, `backups.controller.js`, `backups.routes.js` | `/backups` | `backups/index.ejs`, `soporte.ejs` | Confirmado |
| `licencia-local` | Estado, activación, huella y firma de licencia local. | `licenciaLocal.service.js`, `licenciaLocal.repository.js`, `licenciaLocal.controller.js`, `licenciaLocal.routes.js`, `huellaEquipo.service.js`, `licenciaFirma.service.js` | `/licencia` | `licencia/index.ejs`, `activar.ejs`, `vencida.ejs` | Confirmado |

Notas:

* Los módulos solicitados como `gastos` no son un módulo independiente: los **gastos** se gestionan
  dentro de **caja** (`/caja/gasto`) y existen tablas `gastos` y `categorias_gasto`.
* `categorias` corresponde al módulo `categorias-productos`.
* **Confirmado (tanda 1.1):** `productos` y `compras` **sí** tienen los cuatro archivos
  (`controller`, `service`, `repository`, `routes`). La nota previa que los marcaba como
  incompletos queda corregida.

---

## 4. Pantallas y vistas EJS

Ubicación: `src/views/`. Layouts globales en `layouts/app.ejs` y `layouts/main.ejs`;
parciales comunes en `partials/header.ejs` y `partials/sidebar.ejs`.

| Módulo | Vista | Qué permite hacer (inferido) |
|---|---|---|
| auth | `login.ejs` | Iniciar sesión. |
| setup | `index.ejs` | Crear el primer administrador y arrancar el sistema. |
| dashboard | `index.ejs` | Panel de inicio con accesos y estado operativo. |
| configuracion | `index.ejs` | Editar datos del negocio, moneda, IVA y mensaje de recibo. |
| usuarios | `index.ejs`, `formulario.ejs` | Listar usuarios y crear/editar usuario. |
| clientes | `index.ejs`, `form.ejs` | Listar y crear/editar clientes (incl. datos de facturación). |
| productos | `index.ejs`, `formulario.ejs` | Listar y crear/editar productos (precio, costo, IVA, stock, imagen). |
| categorias-productos | `index.ejs`, `formulario.ejs` | Listar y crear/editar categorías. |
| inventario | `index.ejs`, `ajuste.ejs`, `historial.ejs`, `reportes.ejs`, `conteos/` | Ver stock, ajustar, ver historial, reportes y conteos físicos. |
| ventas | `index.ejs`, `movil.ejs`, `historial.ejs`, `detalle.ejs`, `ticket.ejs` | POS de escritorio, POS móvil, historial, detalle de venta y ticket imprimible. |
| caja | `index.ejs`, `abrir.ejs`, `cerrar.ejs`, `gasto.ejs`, `movimiento.ejs`, `turno-detalle.ejs`, `turno-imprimir.ejs` | Abrir caja, registrar movimientos/gastos, cerrar caja y ver/imprimir turnos. |
| compras | `index.ejs`, `formulario.ejs`, `detalle.ejs`, `imprimir.ejs`, `cuentas-por-pagar.ejs`, `pago-proveedor.ejs`, `pagos-proveedores.ejs` | Registrar compras, ver detalle/imprimir, gestionar cuentas por pagar y pagos a proveedores. |
| proveedores | `index.ejs`, `formulario.ejs` | Listar y crear/editar proveedores. |
| cotizaciones | `index.ejs`, `form.ejs`, `detalle.ejs`, `imprimir.ejs` | Crear/consultar cotizaciones, ver detalle, imprimir y convertir a venta. |
| remisiones | `index.ejs`, `form.ejs`, `detalle.ejs`, `imprimir.ejs` | Crear/consultar remisiones, ver detalle, imprimir y convertir a venta. |
| notasCredito | `index.ejs`, `detalle.ejs`, `imprimir.ejs` | Consultar notas crédito, ver detalle e imprimir. |
| reportes | `index.ejs` | Ver reportes operativos / de ventas. |
| backups | `index.ejs`, `soporte.ejs` | Gestionar backups y operar el modo soporte/restauración. |
| licencia | `index.ejs`, `activar.ejs`, `vencida.ejs` | Ver estado de licencia, activar/renovar y pantalla de licencia vencida. |
| errors | `404.ejs` | Página de error 404. |

---

## 5. Rutas principales

Montaje de routers en `src/app.js`. Cada módulo se monta bajo su prefijo:

```txt
/setup          → setup
/auth           → auth (login/logout)
/licencia       → licencia-local
/dashboard      → dashboard
/configuracion  → configuracion
/categorias-productos → categorias
/productos      → productos
/inventario     → inventario
/caja           → caja
/ventas         → ventas
/clientes       → clientes
/cotizaciones   → cotizaciones
/remisiones     → remisiones
/notas-credito  → notasCredito
/reportes       → reportes
/catalogos      → catalogos
/backups        → backups
/usuarios       → usuarios
/proveedores    → proveedores
/compras        → compras
```

Rutas técnicas globales en `app.js`:

* `GET /` → redirige a `/dashboard`.
* `GET /salud` → estado del sistema (JSON con app, versión, entorno).
* `GET /__restauracion-finalizada` → ruta interna de reinicio tras restauración (solo local + admin).

Rutas detectadas por módulo (`router.<método>('<ruta>')`, relativas a su prefijo):

**setup** (`/setup`)
```txt
GET  /
POST /
```

**auth** (`/auth`)
```txt
GET  /login
POST /logout
```

**licencia-local** (`/licencia`)
```txt
GET  /
GET  /activar
POST /activar         (solo administrador)
```

**dashboard** (`/dashboard`)
```txt
GET  /
```

**configuracion** (`/configuracion`)  — requiere rol administrador
```txt
GET  /
POST /
```

**usuarios** (`/usuarios`)
```txt
GET  /
GET  /nuevo
POST /nuevo
GET  /:id/editar
POST /:id/editar
POST /:id/activar
POST /:id/desactivar
```

**clientes** (`/clientes`)
```txt
GET  /
GET  /nuevo
POST /nuevo
POST /rapido
GET  /:id/editar
POST /:id/editar
POST /:id/estado
```

**categorias-productos** (`/categorias-productos`)
```txt
GET  /
GET  /nueva
POST /nueva
GET  /:id/editar
POST /:id/editar
POST /:id/activar
POST /:id/desactivar
```

**productos** (`/productos`)  — requiere rol `administrador` o `inventario`
```txt
GET  /
GET  /nuevo
POST /nuevo            (sube imagen con multer: campo imagen_producto)
GET  /:id/editar
POST /:id/editar       (sube imagen con multer: campo imagen_producto)
POST /:id/activar
POST /:id/desactivar
```
> **Confirmado (tanda 1.1)** en `productos.routes.js`:
> * **Crear producto:** `POST /productos/nuevo` → `productosController.crearProducto`.
> * **Editar producto:** `POST /productos/:id/editar` → `productosController.actualizarProducto`.
> * **Activar producto:** `POST /productos/:id/activar`.
> * **Desactivar producto:** `POST /productos/:id/desactivar`.
> * **Subir imagen:** se maneja con **`multer`** (`uploadImagenProducto.single('imagen_producto')`)
>   como middleware *antes* del controller, por eso los POST de crear/editar no eran visibles
>   en un grep simple de `router.post('/...')`. La imagen se guarda en disco
>   (`multer.diskStorage`) dentro de `runtime-paths.obtenerCarpetaUploadsProductos()`
>   (servida bajo `/uploads/productos/`), con nombre seguro `producto-<timestamp>-<rand><ext>`,
>   tipos permitidos **JPG / PNG / WEBP** y límite de **2 MB**. El controller también soporta
>   quitar la imagen (`quitar_imagen_producto`) y elimina de forma segura el archivo anterior.

**catalogos** (`/catalogos`)
```txt
GET  /departamentos/buscar
GET  /municipios/buscar
GET  /municipios/:codigo
```

**inventario** (`/inventario`)
```txt
GET  /
GET  /reportes/exportar
GET  /reportes
GET  /historial
GET  /conteos
GET  /conteos/nuevo
POST /conteos/nuevo
GET  /conteos/:id/diferencias
GET  /conteos/:id
POST /conteos/:id/guardar
POST /conteos/:id/aplicar
GET  /:id/ajuste
POST /:id/ajuste
```

**ventas** (`/ventas`)
```txt
GET  /
POST /
GET  /movil
GET  /historial
GET  /productos/buscar
GET  /clientes/buscar
GET  /productos/:id
GET  /:id/ticket
GET  /:id
```

**caja** (`/caja`)
```txt
GET  /
GET  /abrir
POST /abrir
GET  /movimiento
POST /movimiento
GET  /gasto
POST /gasto
GET  /cerrar
POST /cerrar
GET  /turnos/:id/imprimir
GET  /turnos/:id/excel
GET  /turnos/:id
```

**compras** (`/compras`)
```txt
GET  /cuentas-por-pagar
GET  /pagos-proveedores
GET  /nueva
GET  /formulario
GET  /api/productos/buscar
POST /api/validar
POST /
GET  /
GET  /:id/pagos/nuevo
POST /:id/pagos
POST /:id/pagos/:idPago/anular
GET  /:id/imprimir
GET  /:id
```

**proveedores** (`/proveedores`)
```txt
GET  /
GET  /nuevo
POST /nuevo
GET  /:id/editar
POST /:id/editar
POST /:id/activar
POST /:id/desactivar
```

**cotizaciones** (`/cotizaciones`)
```txt
GET  /
GET  /api/siguiente
GET  /api/clientes/buscar
GET  /api/productos/buscar
GET  /api/productos/:id
GET  /api
GET  /api/:id
GET  /nueva
GET  /:id/convertir/preparar
POST /:id/convertir
GET  /:id/imprimir
GET  /:id
POST /
```

**remisiones** (`/remisiones`)  — misma estructura que cotizaciones
```txt
GET  /            GET /api/siguiente        GET /api/clientes/buscar
GET  /api/productos/buscar    GET /api/productos/:id
GET  /api         GET /api/:id              GET /nueva
GET  /:id/convertir/preparar  POST /:id/convertir
GET  /:id/imprimir            GET /:id      POST /
```

**notasCredito** (`/notas-credito`)
```txt
GET  /
GET  /api/siguiente
GET  /api/resumen
GET  /api
GET  /api/:id
GET  /:id/imprimir
GET  /:id
```

**reportes** (`/reportes`)
```txt
GET  /
```

**backups** (`/backups`)  — requiere rol `administrador`; las acciones de soporte exigen modo soporte desbloqueado
```txt
GET  /
GET  /soporte
POST /soporte/desbloquear
POST /soporte/cerrar
POST /soporte/crear
POST /soporte/abrir-carpeta
POST /soporte/restaurar          (multer: archivo_backup; requiere confirmar_restauracion=1)
GET  /soporte/descargar/:archivo
```
> **Confirmado (tanda 1.1):** el endpoint real de restauración es
> `POST /backups/soporte/restaurar` (`backups.routes.js` → `backupsController.restaurarBackup`),
> protegido por `requiereRol('administrador')` + `requiereSoporteBackups`, que recibe el ZIP
> por `multer` (campo `archivo_backup`, límite 1 GB).

---

## 6. Base de datos

Esquema en `src/database/schema.sql`; migraciones numeradas en `src/database/migrations/`
(`001` … `040`). Tablas confirmadas a partir de las definiciones `CREATE TABLE` del schema.

### Seguridad y usuarios
```txt
roles
usuarios
usuario_roles
```

### Configuración del negocio
```txt
configuracion_negocio
```

### Licenciamiento
```txt
licencia_local
```

### Catálogos / ubicaciones (Colombia · DIVIPOLA)
```txt
catalogo_departamentos
catalogo_municipios
```

### Productos e inventario
```txt
productos
categorias_productos
unidades_medida
movimientos_inventario
conteos_inventario
detalle_conteos_inventario
```

### Clientes y proveedores
```txt
clientes
proveedores
```

### Medios de pago y numeración
```txt
medios_pago
numeraciones_documentos
```

### Ventas
```txt
ventas
detalle_ventas
pagos_venta
comprobantes
anulaciones_venta
devoluciones_venta
detalle_devoluciones_venta
```

### Caja
```txt
turnos_caja
movimientos_caja
```

### Gastos
```txt
categorias_gasto
gastos
```

### Compras y proveedores
```txt
compras
compras_detalle
pagos_compras_proveedores
```

### Documentos internos
```txt
cotizaciones
detalle_cotizaciones
remisiones
detalle_remisiones
notas_credito
detalle_notas_credito
```

### Auditoría
```txt
auditoria
```

> Nombres reales confirmados en el schema. Diferencias frente a los ejemplos del encargo:
> el detalle de compras es `compras_detalle`, el detalle de ventas `detalle_ventas`,
> y existen tablas adicionales no listadas en el encargo
> (`devoluciones_venta`, `detalle_devoluciones_venta`, `comprobantes`,
> `anulaciones_venta`, `unidades_medida`, `medios_pago`, `numeraciones_documentos`,
> `gastos`, `categorias_gasto`).

---

## 7. Scripts disponibles

Comandos de `package.json` (sección `scripts`). Se marca **(delicado)** lo que puede
modificar datos, reparar información, generar claves o tocar licenciamiento.

| Script | Qué hace |
|---|---|
| `npm run dev` | Reconstruye `better-sqlite3` y levanta el servidor con nodemon (`src/server.js`). |
| `npm run dev:https` | Igual que `dev` pero usando HTTPS local (`src/server.https.js`). |
| `npm run start` | Reconstruye nativo y arranca el servidor en modo normal (`node src/server.js`). |
| `npm run start:https` | Arranque con HTTPS (`src/server.https.js`). |
| `npm run electron` | Reconstruye nativo para Electron y abre la app (`electron .`). |
| `npm run electron:rebuild` | Solo reconstruye nativos para Electron. |
| `npm run native:node` | `npm rebuild better-sqlite3` (binario nativo para Node). |
| `npm run native:electron` | `electron-rebuild` de `better-sqlite3` para Electron. |
| `npm run pack:dir` | Verifica pre-Electron y genera versión desempaquetada (`--dir`). |
| `npm run dist:win` | Verifica pre-Electron y genera instalador NSIS para Windows. |
| `npm run check:pre-electron` | Valida BD + verifica que no se versionen secretos/SQLite/backups/certs. |
| `npm run check:runtime` | Diagnóstico de rutas y entorno runtime (`scripts/diagnostico-runtime.js`). |
| `npm run db:validate` | Valida la base de datos (`src/database/validate-db.js`). Lectura/validación. |
| `npm run db:audit:contable` | **(delicado)** Auditoría contable (`audit-contable.js`). Lectura, pero sensible. |
| `npm run db:repair:turnos` | **(delicado)** Repara turnos de caja (`reparar-turnos-caja.js`). **Modifica datos.** |
| `npm run licencia:keys` | **(delicado)** Genera claves de licencia (`tools/licencias/generar-claves-licencia.js`). |
| `npm run licencia:code` | **(delicado)** Genera código de activación (`tools/licencias/generar-codigo-activacion.js`). |
| `npm run licencia:audit` | **(delicado)** Auditoría de licencia (`audit-licencia.js`). |
| `npm run db:migrate:001` … `:040` | **(delicado)** Ejecutan migraciones específicas que **modifican la estructura/datos** de la base. |
| `npm run demo:reset` | **(delicado)** Resetea datos de demo (`scripts/demo/reset-demo-landing.js`). **Sobrescribe datos.** |
| `npm run demo:electron` | Abre Electron apuntando a una carpeta de datos demo aislada. |

Otros scripts utilitarios (no en `package.json`):

* `scripts/verificar-pre-electron.js` — verificación previa al empaquetado.
* `scripts/diagnostico-runtime.js` — diagnóstico de rutas runtime.
* `src/database/tools/auditar-estructura-bd.js` — auditoría de estructura de BD (lectura).
* `src/database/tools/generar-schema-consolidado.js` — genera schema consolidado.

> **Regla de seguridad:** en esta tanda documental **no se ejecuta** ninguno de los scripts
> marcados como delicados ni ninguna migración.

---

## 8. Flujos funcionales principales

> Las tablas tocadas son inferidas del schema y los nombres de módulo; donde no es seguro
> se marca **Pendiente de confirmar**.

| Flujo | Qué hace | Módulos | Archivos principales | Tablas (inferidas) |
|---|---|---|---|---|
| Primer uso / setup | Crea primer admin y arranca el sistema. | setup, auth | `setup.service.js`, `setup.repository.js` | `usuarios`, `roles`, `usuario_roles`, `configuracion_negocio` |
| Inicio de sesión | Autentica usuario y crea sesión. | auth | `auth.service.js`, `auth.repository.js` | `usuarios`, `usuario_roles` |
| Configuración del negocio | Edita datos, moneda, IVA, recibo. | configuracion | `configuracion.*` | `configuracion_negocio` |
| Gestión de usuarios | Crear/editar/activar usuarios y roles. | usuarios | `usuarios.*` | `usuarios`, `roles`, `usuario_roles` |
| Creación de clientes | Alta/edición de clientes. | clientes | `clientes.*` | `clientes`, `catalogo_*` |
| Creación de productos | Alta/edición con precio, costo, IVA, stock. | productos, categorias | `productos.*`, `categorias.*` | `productos`, `categorias_productos`, `unidades_medida` |
| Gestión de inventario | Ajustes, historial, conteos físicos. | inventario | `inventario.service.js` | `movimientos_inventario`, `conteos_inventario`, `detalle_conteos_inventario`, `productos` |
| Apertura de caja | Abre turno con base inicial. | caja | `caja.service.js` | `turnos_caja`, `movimientos_caja` |
| Venta POS | Carrito, cálculo, pago, ticket. | ventas, caja, inventario | `ventas.service.js`, `ventas.repository.js` | `ventas`, `detalle_ventas`, `pagos_venta`, `movimientos_inventario`, `movimientos_caja` |
| Venta con descuentos | Descuento unitario por línea. | ventas | `ventas.service.js` (`calcularLineaVenta`) | `ventas`, `detalle_ventas` |
| Venta con pagos mixtos | Varios medios de pago por venta. | ventas, caja | `ventas.service.js`, `pagos_venta` | `pagos_venta`, `medios_pago`, `movimientos_caja` |
| Cierre de caja | Cierra turno y calcula diferencias. | caja | `caja.service.js` | `turnos_caja`, `movimientos_caja`, `pagos_venta` |
| Registro de compras | Compra con detalle, costos, vencimiento. | compras, proveedores, inventario | `compras.repository.js` | `compras`, `compras_detalle`, `movimientos_inventario` |
| Gestión de proveedores | Alta/edición de proveedores. | proveedores | `proveedores.*` | `proveedores` |
| Pago a proveedores / CxP | Abonos y cuentas por pagar. | compras | `compras.repository.js` | `pagos_compras_proveedores`, `compras` |
| Cotizaciones | Documento previo a venta, convertible. | cotizaciones | `cotizaciones.*` | `cotizaciones`, `detalle_cotizaciones`, `numeraciones_documentos` |
| Remisiones | Documento de despacho, convertible. | remisiones | `remisiones.*` | `remisiones`, `detalle_remisiones`, `numeraciones_documentos` |
| Notas crédito internas | Nota crédito interna (no fiscal); hoy se genera al anular una venta. Consulta/impresión. | notasCredito, ventas | `notasCredito.*`, `ventas.repository.js` | `notas_credito`, `detalle_notas_credito`, `numeraciones_documentos` |
| Anulación de ventas | Anula venta: marca `anulada`, registra anulación, genera nota crédito interna, revierte inventario y caja, anula pagos. | ventas | `ventas.repository.js` (`anularVentaCompleta`), `ventas-anulacion.js`, migraciones 026/027 | `anulaciones_venta`, `ventas`, `pagos_venta`, `notas_credito`, `detalle_notas_credito`, `movimientos_inventario`, `movimientos_caja`, `turnos_caja`, `auditoria` |
| Reportes | Reportes operativos/ventas. | reportes | `reportes.controller.js` | `ventas`, `detalle_ventas`, `movimientos_*` |
| Backups | Crea backup ZIP de datos. | backups | `backups.service.js` | (archivos, no tabla) |
| Restauración | `POST /backups/soporte/restaurar`: valida ZIP/manifest/SQLite, crea backup de emergencia, restaura y reinicia. | backups | `backups.controller.js`, `backups.service.js`, `app.js`/`electron/main.js` (reinicio) | (archivos + base completa) |
| Licencia local | Estado, activación y vencimiento. | licencia-local | `licenciaLocal.service.js` | `licencia_local` |

---

## 9. Flujos contables principales

Lógica confirmada en `src/modules/ventas/ventas.service.js`.

### Cálculo por línea de venta (`calcularLineaVenta`)

Variables por producto: `maneja_iva` (0/1), `porcentaje_iva` (entero, p. ej. 19, 5, 0),
`precio_incluye_iva` (0/1).

1. **Precio unitario neto** = `precio_unitario − descuento_unitario`
   (el descuento no puede ser negativo ni mayor que el precio unitario).
2. **Bruto de línea** = `redondear(precio_unitario_neto × cantidad)`.
3. Si el producto **maneja IVA** y `porcentaje_iva > 0` (tasa = `porcentaje_iva / 100`):
   * **Si el precio incluye IVA:**
     ```txt
     subtotal     = redondear(bruto_linea / (1 + tasa))
     impuesto      = bruto_linea − subtotal
     total_linea   = bruto_linea
     ```
   * **Si el precio NO incluye IVA:**
     ```txt
     subtotal     = bruto_linea
     impuesto      = redondear(subtotal × tasa)
     total_linea   = subtotal + impuesto
     ```
4. Si el producto **no maneja IVA** o `porcentaje_iva = 0`:
   ```txt
   subtotal_linea = bruto_linea
   impuesto_linea = 0
   total_linea    = bruto_linea
   ```
   > **Importante:** lo que vale **0 es el IVA (impuesto)**, **no el subtotal**.
   > El subtotal de la línea es igual al bruto (`precio_unitario_neto × cantidad`) y
   > el total de línea es igual al subtotal. No debe leerse como "subtotal = 0".
   > Confirmado en `calcularLineaVenta` (`ventas.service.js`): los valores parten de
   > `subtotal = brutoLinea; impuestoTotal = 0; totalLinea = brutoLinea` y solo se
   > recalculan cuando `maneja_iva = 1` **y** `porcentaje_iva > 0`.

### Totales de la venta

Campos de la venta (de `ventas.service.js`):
`subtotal`, `descuento_total`, `impuesto_total`, `total`, `total_pagado`,
`cambio_entregado`, `total_costo`.

Inferencia (suma de líneas):
```txt
subtotal_venta   = Σ subtotal_linea
impuesto_total   = Σ impuesto_linea
descuento_total  = Σ (descuento_unitario × cantidad)
total            = subtotal_venta + impuesto_total   (= Σ total_linea)
cambio_entregado = total_pagado − total              (en pagos en efectivo)
```
> La fórmula exacta de `descuento_total` y `cambio_entregado` a nivel de cabecera
> debe confirmarse en el repository/controller. **Pendiente de confirmar.**

### Redondeo y normalización monetaria

**Confirmado (tanda 1.1)** en `ventas.service.js`. Prismia trabaja el **dinero en pesos
enteros** (sin decimales); solo las **cantidades** admiten decimales (hasta 3):

* **`redondearDinero(valor)`** → `Math.round(normalizarNumero(valor))`.
  Redondea **a peso entero** (al entero más cercano, 0.5 hacia arriba). Es la función que
  se aplica a brutos, subtotales, IVA y costos de cada línea de venta.
* **`redondearCantidad(valor)`** → `Math.round(valor * 1000) / 1000`.
  Redondea las **cantidades a 3 decimales** (soporta venta fraccionada). Los productos que
  no permiten decimales se truncan a entero antes de vender.
* **`normalizarEntero(valor, defecto)`** → `Math.round(numero)` (con valor por defecto si no
  es finito). **Normaliza a entero** precios, costos, porcentajes de IVA y banderas (0/1)
  **antes de calcular y guardar**. `normalizarNumero` solo valida que sea numérico finito,
  sin redondear.

En resumen: **importes en pesos enteros con redondeo a entero**, **cantidades con hasta 3
decimales**, y **normalización a entero** de los valores monetarios antes de persistir.

### Lógica del IVA (resumen)

* **Producto que maneja IVA:** `maneja_iva = 1`.
* **Porcentaje de IVA:** entero (`19`, `5`, `0`). El README confirma la normalización:
  `19 = 19%`, `5 = 5%`, `0 = sin IVA`; **ya no** se usa `1900` (migración 037).
* **Precio que incluye IVA** (`precio_incluye_iva = 1`): el IVA se **separa hacia atrás**
  desde el precio (`subtotal = bruto / (1 + tasa)`).
* **Precio que NO incluye IVA** (`precio_incluye_iva = 0`): el IVA se **suma encima**
  del subtotal (`impuesto = subtotal × tasa`).
* La configuración global guarda valores por defecto: `maneja_iva`,
  `iva_incluido_en_precio`, `porcentaje_iva_defecto` (`configuracion_negocio`).

### Caja, turnos y costo

* **Caja / turnos:** `turnos_caja` + `movimientos_caja` registran base inicial,
  ingresos/egresos manuales y totales por medio de pago
  (`total_efectivo`, `total_transferencia`, `total_tarjeta`, `total_otros`).
* **Compras / inventario:** las compras alimentan `movimientos_inventario`.

### Costo, costo promedio, utilidad y margen

**Confirmado (tanda 1.1)** en `ventas.service.js`, `compras.repository.js`,
`reportes.service.js`/`reportes.repository.js` y `src/database/audit-contable.js`.

* **Qué costo toma la venta:** por cada línea, el costo unitario de referencia se toma en
  este **orden de prioridad** (en `prepararProductoParaVenta` y `calcularLineaVenta`):
  ```txt
  precio_costo_referencia = costo_promedio  ||  ultimo_costo  ||  precio_costo
  ```
  Es decir, primero el **costo promedio**; si es 0/nulo, el **último costo**; y si tampoco,
  el **precio de costo** base del producto.
* **Costo de la línea:** `costo_total = redondearDinero(precio_costo_referencia × cantidad)`.
* **Cómo se llena `total_costo`:** en la cabecera de la venta es la **suma de los
  `costo_total` de todas las líneas** (`calcularResumenRegistroVenta`). La venta también
  guarda `utilidad_bruta` a nivel de cabecera.
* **Utilidad bruta:** se calcula **por línea** como
  ```txt
  utilidad_bruta_linea = subtotal_linea − costo_total_linea
  ```
  (usa el **subtotal sin IVA**, no el total con IVA). La utilidad de la venta es la suma de
  las utilidades de línea. `audit-contable.js` verifica que la venta **cuadre** contra su
  detalle en subtotal, descuento, IVA, total, costo y utilidad.
* **Margen bruto:** se calcula en **reportes** (`reportes.service.js`), no se guarda en la
  venta:
  ```txt
  margen_bruto_porcentaje = (utilidad_bruta_neta / total_neto) × 100   (2 decimales)
  ```
  sobre ventas en estado `pagada` (`reportes.repository.js` suma `total_costo` y
  `utilidad_bruta` de las ventas pagadas).
* **Cómo se actualiza `costo_promedio` en compras:** **promedio ponderado** por compra
  (`compras.repository.js`). Para cada producto con control de inventario y `stock_nuevo > 0`:
  ```txt
  valor_inventario_anterior = stock_anterior × costo_promedio_anterior
  valor_compra              = cantidad × costo_unitario_final
  costo_promedio_nuevo      = redondear((valor_inventario_anterior + valor_compra) / stock_nuevo)
  ```
  donde `costo_promedio_anterior = costo_promedio || ultimo_costo || precio_costo`.
  Si el producto **no controla inventario** o `stock_nuevo ≤ 0`, entonces
  `costo_promedio_nuevo = costo_unitario_final`. El detalle de compra guarda la traza
  (`ultimo_costo_anterior`, `costo_promedio_anterior`, `costo_promedio_nuevo`).
* **`ultimo_costo` y `precio_costo`:** en cada compra, `ultimo_costo` del producto se
  actualiza al **`costo_unitario_final`** de la línea (costo neto + IVA según configuración).
  `precio_costo` es el costo base/manual del producto y actúa como **último respaldo** cuando
  no hay `costo_promedio` ni `ultimo_costo`.

### Anulación de ventas (impacto contable)

**Confirmado (tanda 1.1)** en `ventas.repository.js` (`anularVentaCompleta`, transacción
atómica). Al anular una venta:

* **Estado de la venta:** pasa a `estado = 'anulada'` y registra `anulado_en`,
  `anulado_por` y `motivo_anulacion` (solo si estaba `pagada` y sin anular previo).
* **Registro en `anulaciones_venta`:** se inserta el encabezado de la anulación con totales,
  montos reversados por medio de pago, motivo, observaciones y `anulada_por`.
* **Nota crédito interna:** **sí** se genera automáticamente una nota crédito interna en
  `notas_credito` + `detalle_notas_credito`, con `tipo_nota = 'total'`,
  `origen = 'anulacion_venta'`, `estado = 'emitida'`, `documento_fiscal_estado = 'interno'` y
  enlazada por `id_anulacion_venta`. Usa la numeración `nota_credito` de
  `numeraciones_documentos`.
* **Inventario:** se **revierte** (se reintegra el stock vendido) generando
  `movimientos_inventario` con `tipo_movimiento = 'anulacion_venta'` y la traza de stock.
* **Caja / pagos:** se reversa la caja con `movimientos_caja` (`tipo_movimiento = 'anulacion'`,
  `referencia_tipo = 'anulacion_venta'`) y se ajusta el turno (`turnos_caja`: resta
  `total_ventas`, totales por medio de pago y `monto_esperado`).
* **`pagos_venta`:** los pagos pasan a `estado = 'anulado'` con `anulado_en`, `anulado_por` y
  `motivo_anulacion`.
* **Trazabilidad:** queda usuario, fecha y motivo tanto en `ventas` como en
  `anulaciones_venta`, `pagos_venta` y en la tabla `auditoria` (`tipo 'anulacion_venta'`).

### Notas crédito internas

**Confirmado (tanda 1.1).** Las notas crédito de Prismia son **internas** (no fiscales:
`documento_fiscal_estado = 'interno'`). Hoy se originan principalmente como efecto de la
**anulación de venta** (ver arriba), quedando enlazadas a la venta y a la anulación. El
módulo `notasCredito` permite **consultar, ver detalle e imprimir** estas notas
(`notasCredito.repository.js` / `notasCredito.routes.js`); su impacto contable es el de la
anulación que las genera.

---

## 10. Backups y restauración

Módulo `backups` (`/backups`) y vistas `index.ejs` (backups) y `soporte.ejs` (modo soporte).

**Confirmado (tanda 1.1)** en `backups.routes.js`, `backups.controller.js`,
`backups.service.js`, `src/app.js` y `electron/main.js`.

* **Crear backup:** `POST /backups/soporte/crear` (genera ZIP de datos del negocio).
* **Modo soporte:** acceso protegido por clave de soporte (`SUPPORT_BACKUP_KEY`):
  `POST /backups/soporte/desbloquear`, `POST /backups/soporte/cerrar`. Todas las acciones
  de soporte requieren rol `administrador` + modo soporte desbloqueado (`requiereSoporteBackups`).
* **Abrir carpeta de backups:** `POST /backups/soporte/abrir-carpeta`.
* **Descargar backup:** `GET /backups/soporte/descargar/:archivo`.
* **Restaurar backup (endpoint real):** **`POST /backups/soporte/restaurar`**
  (`backupsController.restaurarBackup`). Recibe el ZIP por `multer` (campo `archivo_backup`,
  hasta 1 GB) y exige `confirmar_restauracion = 1`; si falta el archivo o la confirmación,
  rechaza y borra el ZIP temporal.
* **Validaciones antes de restaurar** (`restaurarBackupDesdeArchivo` →
  `validarYExtraerBackup`): valida y extrae el ZIP, valida el **manifest** del backup
  (`validarManifestBackup`) y valida la **base SQLite** restaurada (`validarBaseSQLite`).
* **Backup de emergencia:** antes de sobrescribir se crea un **backup de emergencia**
  (`crearBackupEmergenciaRestauracion`, carpeta `backups/emergencia`,
  prefijo `prismia-backup-emergencia-restauracion`). Si falla, **se aborta** la restauración.
* **Restauración:** reemplaza la base de datos y archivos asociados y luego **limpia las
  sesiones HTTP** restauradas (`limpiarSesionesHttpRestauradas` → `DELETE FROM sesiones_http`).
* **Reinicio posterior:** marca `req.app.locals.restauracionPendiente = true`, muestra la
  pantalla de "restauración completada" y **reinicia** la app: en Electron relanza el proceso
  (`prismia:reinicio-solicitado` → `relanzarAplicacionPorRestauracion`); en `dev` escribe
  `src/restart-dev-trigger.json` para que nodemon reinicie. Existe la ruta interna
  `GET /__restauracion-finalizada` (solo local + admin).
* **Carpetas usadas** (instalación real): `backups/`, `database/`, `config/`, `uploads/`
  dentro de `AppData\Roaming\Prismia POS Local`. En el repo, variables
  `BACKUP_BASE_DIR` / `BACKUP_EXTERNAL_PATH`.
* **Riesgos:** la restauración **sobrescribe la base activa**; por eso exige confirmación,
  crea backup de emergencia y hace reinicio controlado. **No ejecutar restauraciones en esta
  tanda documental.**

---

## 11. Licencia local

Módulo `licencia-local` (`/licencia`). Lógica en `licenciaLocal.service.js`,
`huellaEquipo.service.js`, `licenciaFirma.service.js`; config en
`src/config/licencia-comercial.js` y `src/config/licencia-public-key.js`.
Tabla `licencia_local` (migraciones 038–040).

* **Estados operativos** (`ESTADOS_OPERATIVOS`): `prueba`, `activa`, `gracia`, `vencida`,
  además de estados como `sin_registro`, `reloj_manipulado`, `bloqueada`.
* **Prueba inicial:** `dias_prueba` (por defecto **30** según el código:
  `Number(licencia.dias_prueba || 30)`).
* **Días de gracia:** `dias_gracia` configurable; periodo posterior al vencimiento para renovar.
* **Activación:** `GET /licencia/activar` (formulario) y `POST /licencia/activar`
  (solo administrador) procesan el **código de activación**.
* **Huella del equipo:** `huellaEquipo.service.js` genera el identificador del equipo
  (se incluye en el mensaje de renovación).
* **Firma:** `licenciaFirma.service.js` + clave pública (`licencia-public-key.js`) validan
  la firma del código de activación. La **clave privada** está en
  `tools/licencias/private/` (**sensible, no se toca**).
* **Pantalla de licencia vencida:** `views/licencia/vencida.ejs`; el middleware
  `requiereLicenciaOperativa` bloquea las rutas operativas cuando la licencia no es válida.
* **WhatsApp de renovación:** `licencia-comercial.js` construye un mensaje de pago/renovación
  con datos del negocio y la huella, y arma una URL `https://wa.me/<numero>` (número de
  activación: `573215394234`).
* **Protección anti-manipulación de reloj:** el servicio considera un estado
  `reloj_manipulado` con tolerancia (`toleranciaHoras = 6`).
* **Auditoría de licencia:** `npm run licencia:audit` (`audit-licencia.js`).

> **No generar claves reales ni modificar la licencia** en esta tanda.

---

## 12. Auditorías y validaciones

| Script / archivo | Tipo | Riesgo |
|---|---|---|
| `npm run db:validate` (`validate-db.js`) | Validación de estructura/semillas de la BD. | **Solo lectura.** |
| `npm run check:pre-electron` (`scripts/verificar-pre-electron.js`) | Valida BD + ausencia de secretos/SQLite/backups/certs versionados. | **Solo lectura.** |
| `npm run check:runtime` (`scripts/diagnostico-runtime.js`) | Diagnóstico de rutas/entorno runtime. | **Solo lectura.** |
| `npm run db:audit:contable` (`audit-contable.js`) | Auditoría contable. | Lectura (sensible: revisa cuadres). |
| `npm run licencia:audit` (`audit-licencia.js`) | Auditoría de licencia. | Lectura (sensible). |
| `src/database/tools/auditar-estructura-bd.js` | Auditoría de estructura. | Lectura. |
| `npm run db:repair:turnos` (`reparar-turnos-caja.js`) | Reparación de turnos de caja. | **Modifica datos.** |
| `npm run db:migrate:NNN` | Migraciones de esquema/datos. | **Modifican la base.** |
| `npm run demo:reset` (`reset-demo-landing.js`) | Reset de datos demo. | **Sobrescribe datos.** |

---

## 13. Pendientes detectados

### Resueltos en la tanda 1.1 (ya confirmados desde el código)

* **Distribución de capas en `productos` y `compras`:** ✅ confirmado, ambos tienen
  `controller`, `service`, `repository` y `routes`.
* **POST de creación/edición de productos:** ✅ confirmado (`POST /productos/nuevo` y
  `POST /productos/:id/editar` con `multer`).
* **Endpoint de restauración de backups:** ✅ confirmado (`POST /backups/soporte/restaurar`).
* **Costo, costo promedio, utilidad y margen:** ✅ confirmadas las fórmulas (ver sección 9).
* **Impacto contable de anulaciones y notas crédito:** ✅ confirmado (ver sección 9).
* **Criterio de redondeo:** ✅ confirmado (pesos enteros / cantidades a 3 decimales).

### Siguen pendientes

* **`cambio_entregado` a nivel de cabecera:** la fórmula de línea está confirmada, pero el
  cálculo exacto del cambio en pagos mixtos/efectivo conviene revisarlo en el repository.
  **Pendiente de confirmar.**
* **Bloqueo de instancia única en Electron (`requestSingleInstanceLock`):** no implementado;
  ver "Incidente conocido: puerto local ocupado EADDRINUSE" más abajo. **Pendiente de parche.**
* **Pendientes ya listados en `README.md`** (no bloqueantes para V1 piloto):
  facturación electrónica DIAN, sistema de licencias avanzado, actualizador automático,
  firma comercial del instalador, cuentas por pagar avanzadas, bloqueo de instancia única
  Electron, migraciones automáticas al iniciar, pulido visual avanzado, entre otros.

---

## Incidente conocido: puerto local ocupado EADDRINUSE

Durante una instalación en el equipo de un cliente, al abrir Prismia apareció una ventana de
Electron con el mensaje:

```txt
A JavaScript error occurred in the main process
Error: listen EADDRINUSE: address already in use 127.0.0.1:3210
```

El problema se solucionó **cerrando/reiniciando el proceso (o el equipo)** y Prismia quedó
funcionando correctamente.

### Explicación técnica

* **No** indica corrupción de la base de datos.
* **No** indica daño de la instalación.
* Significa que el **puerto local `3210`** (`PRISMIA_ELECTRON_PORT`, ver `electron/main.js`)
  ya estaba **ocupado** cuando Prismia intentó escuchar en él.
* Puede ocurrir si Prismia **ya estaba abierto**, si quedó un **proceso colgado**, si el
  usuario hizo **doble clic varias veces** sobre el ícono, o si **otro proceso** usa el mismo
  puerto.
* En resumen, es un problema de **arranque / doble instancia / puerto ocupado**, no de datos.

### Estado actual en el código

Confirmado en la tanda 1.1: el proyecto **no** implementa `app.requestSingleInstanceLock()`,
ni un manejador del error `EADDRINUSE`, ni el evento `second-instance` (búsqueda sin
resultados en todo el repositorio). El puerto se define en `electron/main.js`
(`PRISMIA_ELECTRON_PORT || 3210`).

### Pendiente técnico para parche posterior (no se modifica código en esta tanda)

* Implementar `app.requestSingleInstanceLock()` en Electron.
* Evitar la doble instancia.
* Capturar el error `EADDRINUSE` al iniciar el servidor.
* Mostrar un **mensaje amigable** al usuario en lugar del error crudo de JavaScript.
* **Enfocar la ventana existente** si Prismia ya está abierto.
* Registrar el evento en un **log local**.
* Evitar que Electron muestre el cuadro "A JavaScript error occurred in the main process".

### Severidad

```txt
Severidad técnica: media
Severidad comercial: alta
Riesgo de datos: bajo
Prioridad de parche: alta antes de más instalaciones piloto
```

---

## 14. Qué debe ir en cada guía

### 14.1 Manual de uso para clientes

Orientado al operador del negocio (cajero/admin), sin tecnicismos:

* Primer arranque y creación del administrador (`/setup`).
* Inicio de sesión.
* Configuración básica del negocio (datos, moneda, IVA, recibo).
* Crear categorías y productos.
* Cómo abrir caja, vender (POS), aplicar descuentos, pagos mixtos, imprimir ticket.
* Cómo cerrar caja y leer el cierre.
* Clientes, proveedores y compras básicas.
* Cotizaciones, remisiones y notas crédito (uso comercial).
* Reportes del día.
* Cómo hacer y guardar un backup; qué hacer si hay que restaurar (contactar soporte).
* Qué hacer cuando aparece la pantalla de licencia (activar/renovar por WhatsApp).

### 14.2 Guía contable y lógica del negocio

Orientada al contador / dueño que necesita entender los números:

* Cálculo de venta: subtotal, descuento, IVA, total, pagos, cambio.
* Lógica del IVA (incluido vs. no incluido, porcentajes 19/5/0).
* Caja y turnos: base, ingresos/egresos, totales por medio de pago, diferencias.
* Compras e inventario: costo, movimientos, costo promedio, utilidad.
* Documentos: cotizaciones, remisiones, notas crédito internas y su efecto.
* Anulación de ventas y su impacto.
* Reportes contables y cómo interpretarlos.

### 14.3 Guía técnica interna para José

Orientada al desarrollo/soporte:

* Arquitectura modular (repository/service/controller/routes/views).
* Estructura de carpetas y rutas runtime (AppData) vs. repo.
* Base de datos: schema, tablas, migraciones, validación y auditorías.
* Scripts de `package.json` (incluidos los delicados) y cuándo usarlos.
* Empaquetado Electron, instalador NSIS y solución de problemas (winCodeSign, puerto).
* Licenciamiento: huella, firma, claves, estados, modo soporte, backups/restauración.
* Variables de entorno y secretos runtime.
* Pendientes técnicos (sección 13).

---

## 15. Recomendación de orden de redacción

Orden sugerido:

```txt
1. Guía técnica interna para José
2. Guía contable y lógica del negocio
3. Manual de uso para clientes
```

Por qué:

1. **Guía técnica primero:** consolida la verdad del sistema (rutas, tablas, flujos,
   scripts). Sirve de fuente única y evita documentar funcionalidades que no existen.
2. **Guía contable después:** una vez clara la mecánica interna (IVA, caja, costos),
   se puede explicar el "por qué" de los números con precisión y resolver los
   **Pendientes de confirmar** contables.
3. **Manual de cliente al final:** se redacta sobre una base ya verificada, en lenguaje
   simple, con la seguridad de que cada paso descrito corresponde a algo real y probado.

---

## 16. Estado de revisión del mapa

* **Versión del mapa:** `0.1 ajustada`.
* **Fecha de ajuste:** 2026-06-24 (tanda 1.1 de ajuste documental).

### Puntos confirmados en esta tanda

1. **Cálculo de IVA en productos sin IVA:** cuando el producto no maneja IVA o
   `porcentaje_iva = 0`, `subtotal_linea = bruto_linea`, `impuesto_linea = 0`,
   `total_linea = bruto_linea`. Lo que vale 0 es el IVA, no el subtotal.
2. **Creación/edición de productos:** rutas reales `POST /productos/nuevo` y
   `POST /productos/:id/editar` (subida de imagen con `multer`), más activar/desactivar.
3. **Costo, costo promedio, utilidad y margen:** costo de venta
   `costo_promedio || ultimo_costo || precio_costo`; `total_costo` = suma de costos de línea;
   utilidad = subtotal − costo; margen en reportes; `costo_promedio` por promedio ponderado
   en compras; `ultimo_costo` se actualiza al costo final de la compra.
4. **Anulaciones y notas crédito internas:** la venta pasa a `anulada`, se registra en
   `anulaciones_venta`, **se genera nota crédito interna**, se revierte inventario y caja, se
   anulan los `pagos_venta` y queda trazabilidad (usuario, fecha, motivo).
5. **Restauración de backups:** endpoint real `POST /backups/soporte/restaurar`, con
   validación de ZIP/manifest/SQLite, backup de emergencia previo, limpieza de sesiones y
   reinicio controlado.
6. **Redondeo monetario:** dinero en **pesos enteros** (`redondearDinero`), cantidades a
   **3 decimales** (`redondearCantidad`), normalización a entero (`normalizarEntero`) antes
   de guardar.
7. **Incidente `EADDRINUSE` (puerto 3210):** documentado como riesgo técnico/comercial; el
   código aún no implementa instancia única ni manejo del error.

### Puntos que siguen pendientes

* `cambio_entregado` a nivel de cabecera (fórmula exacta en pagos mixtos/efectivo).
* Implementación de instancia única en Electron y manejo de `EADDRINUSE` (parche posterior).
* Pendientes de producto ya listados en `README.md` (DIAN, actualizador, firma del
  instalador, etc.), no bloqueantes para V1 piloto.

### Alcance del documento

* Este archivo **sigue siendo base documental**, **no** un manual final.
* El incidente **`EADDRINUSE`** queda **documentado como riesgo técnico/comercial** para
  parche posterior (prioridad alta antes de más instalaciones piloto).

---

*Fin del mapa documental ajustado (tanda 1.1). Las secciones marcadas como
**Pendiente de confirmar** deben resolverse con inspección detallada antes de cerrar las
guías definitivas.*
