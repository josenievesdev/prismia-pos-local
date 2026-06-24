# Guía técnica interna de Prismia POS Local

> Documentación interna para desarrollo, soporte, instalación y mantenimiento.
>
> Versión inicial: `0.1` · Fecha de creación: 2026-06-24.
> Basada en `docs/manuales/00_MAPA_DOCUMENTAL_PRISMIA.md` (mapa documental, versión
> `0.1 ajustada`) y en `README.md`.
>
> Cuando un dato no se pudo confirmar desde el código, el mapa documental o el README,
> se marca como **Pendiente de confirmar**. No se documentan funcionalidades inventadas.

---

## 1. Propósito de esta guía

Esta guía está dirigida a **José / equipo técnico** de Prismia POS Local. Sirve como
documentación interna de **desarrollo, soporte, mantenimiento, instalación y revisión
técnica**, y permite:

* entender la estructura del proyecto;
* ubicar módulos;
* revisar rutas;
* entender la base de datos;
* ejecutar comandos útiles;
* hacer soporte;
* preparar instalaciones;
* revisar licenciamiento;
* manejar backups;
* consultar pendientes técnicos.

**Esta guía NO es:**

* el **manual de uso para clientes** (operador/cajero), que se redacta aparte;
* la **guía contable y lógica del negocio** (contador/dueño), que también va aparte.

Para la lógica contable detallada (IVA, costo, utilidad, margen) esta guía remite a las
secciones técnicas de ventas, caja y compras, pero el "por qué" contable se desarrolla en la
guía contable.

---

## 2. Resumen técnico del sistema

| Dato | Valor |
|---|---|
| Nombre del sistema | **Prismia POS Local** |
| Desarrollado por | Nieves Systems / TINAI |
| Tipo de sistema | **POS local para Windows** (escritorio, sin servidores externos) |
| Stack | **Node.js, Express, EJS, SQLite, Electron** |
| Base de datos | **SQLite** vía **better-sqlite3** (un solo archivo local) |
| Sesiones | `express-session` con almacén en SQLite (`sqlite-session-store`) |
| Seguridad / logging | `helmet`, `morgan` |
| Subida de archivos | `multer` (imágenes de productos, ZIP de restauración) |
| Excel | `xlsx` |
| Backups ZIP | `archiver` / `adm-zip` |
| Hash de contraseñas | `bcryptjs` |
| Empaquetado | **Electron + electron-builder** (instalador **NSIS** para Windows) |
| Arquitectura | servidor local Express abierto desde Electron |
| Versión visible | **`1.0.0`** (`package.json` y `src/config/empresa.js`) |
| App ID | **`com.nievessystems.prismia-pos-local`** |
| Versión de Electron | `electron@37.10.3` (fija, por compatibilidad con `better-sqlite3`) |
| Estado | **V1 piloto funcional**, cierre pre-piloto |

---

## 3. Ruta local del proyecto

**Ruta del repo/proyecto (entorno de trabajo de José):**

```txt
C:\Users\jose\Desktop\laptop\prismia-pos-local
```

Se deben distinguir **tres tipos de ruta**:

1. **Ruta del repositorio / proyecto** — donde vive el código fuente, vistas, scripts y esta
   documentación. Es el directorio de desarrollo (el de arriba).
2. **Ruta runtime en instalación real** — la app instalada por NSIS en el equipo del cliente
   (binarios de la app empaquetada).
3. **Ruta de datos en producción (AppData)** — donde la app guarda los datos del negocio:

```txt
C:\Users\USUARIO\AppData\Roaming\Prismia POS Local
```

Dentro de esa carpeta de datos (confirmado en `README.md` → "Ruta de datos en producción"):

```txt
database/   → base SQLite del negocio
config/     → configuración runtime (incluye secretos.local.json)
backups/    → backups generados
uploads/    → imágenes y archivos subidos
```

**Importante:** en producción los **datos reales no viven dentro del repo**. El repositorio
es solo código; los datos del negocio viven en AppData. Si `PRISMIA_DATA_DIR` queda vacío en
producción, Prismia usa automáticamente una carpeta segura del usuario en AppData.

---

## 4. Estructura general de carpetas

| Carpeta | Contiene / para qué sirve | Sensible | Cuidado |
|---|---|---|---|
| `src/` | Código de la aplicación: servidor Express, módulos, vistas, base de datos, config. | No | Núcleo del sistema. |
| `src/config/` | Configuración: entorno (`env.js`), rutas runtime, secretos, sesión SQLite, empresa, licencia comercial y clave pública. | Parcial | Contiene lógica de secretos y licencia; no exponer valores. |
| `src/database/` | Esquema (`schema.sql`), migraciones, inicialización, validación y auditorías. Incluye `data/` (sensible). | Parcial | No correr migraciones ni reparaciones sin backup. |
| `src/middlewares/` | Middlewares: autenticación, roles, locals, licencia, manejo de errores. | No | Afecta seguridad de rutas. |
| `src/modules/` | Módulos funcionales (un subdirectorio por dominio). | No | Mantener patrón modular. |
| `src/views/` | Vistas EJS agrupadas por módulo + layouts y parciales. | No | No poner SQL ni reglas de negocio aquí. |
| `src/public/` | Activos estáticos: `css/`, `js/`, `uploads/`, `vendor/`. | Parcial | `uploads/` puede tener datos reales en runtime. |
| `electron/` | Punto de entrada de Electron (`main.js`): arranca el servidor y abre la ventana. | No | Define puerto local y reinicio. |
| `scripts/` | Utilitarios: diagnóstico runtime, verificación pre-Electron, demo. | No | Algunos de demo sobrescriben datos. |
| `tools/` | Herramientas de licenciamiento (generación de claves y códigos). Incluye `licencias/private/` (sensible). | Sí | No generar claves ni tocar la clave privada. |
| `docs/` | Documentación y auditorías (incluye `manuales/`). | No | Donde vive esta guía. |
| `build/` | Íconos del instalador y la app (`icon.ico`, `icon.png`). | No | Mantener versionados los íconos. |
| `dist/` | Salida del empaquetado / instalador (no versionada). | No | No subir a Git. |
| `storage/` | **Datos runtime / backups en algunos entornos.** | **Sí** | **No se modifica.** |
| `certs/` | **Certificados HTTPS locales.** | **Sí** | **No se modifica.** |

**Carpetas y archivos sensibles (no se modifican ni se exponen secretos):**

```txt
.env
storage/
certs/
src/database/data/
tools/licencias/private/
```

---

## 5. Arquitectura general

Cómo funciona Prismia:

* **Electron** inicia la aplicación de escritorio (ventana nativa en Windows).
* Electron **arranca el servidor Express local** (lo carga desde `src/server`) y luego abre
  la ventana apuntando a la URL local.
* **Express** sirve las **vistas EJS** renderizadas en el servidor.
* **SQLite** (vía `better-sqlite3`) guarda los datos **localmente**, en un solo archivo.
* Los **módulos** están divididos por dominio (ventas, caja, inventario, etc.).
* Las **vistas** están en `src/views`; los **archivos estáticos** en `src/public`.
* La app se usa como **sistema local de escritorio** (no requiere internet para operar, salvo
  acciones comerciales como el WhatsApp de renovación de licencia).

Diagrama textual:

```txt
Usuario
  ↓
Electron (ventana de escritorio)
  ↓
Servidor Express local (http://localhost:3210)
  ↓
Rutas (routes) → Controllers → Services → Repositories
  ↓
SQLite local (better-sqlite3)
```

Vistas y estáticos:

```txt
Controllers → render EJS (src/views) → HTML
src/public (css / js / uploads / vendor) → servido como estático
```

---

## 6. Arranque de la aplicación

Archivos involucrados:

* **`src/server.js`** — arranca el servidor HTTP normal (modo desarrollo / Node) escuchando
  en el puerto configurado.
* **`src/server.https.js`** — variante con HTTPS local (usa certificados de `certs/`).
* **`src/app.js`** — construye la app Express: middlewares, montaje de routers por módulo y
  rutas técnicas globales.
* **`electron/main.js`** — en la app empaquetada, configura el entorno, **inicia el backend**
  (`require('../src/server')`), espera a que el servidor responda y abre la ventana.

Rutas técnicas globales (en `app.js`):

* `GET /` → **redirige a `/dashboard`**.
* `GET /salud` → estado del sistema (JSON con app, versión, entorno).
* `GET /__restauracion-finalizada` → ruta interna de reinicio tras restauración
  (solo local + administrador).

**Puerto y host local:**

* Puerto usado por Electron: **`3210`** (`PRISMIA_ELECTRON_PORT || 3210` en `electron/main.js`).
* URL local: `http://localhost:3210`.
* En modo servidor puro se usa `APP_PORT` (variable de entorno).

**Modo desarrollo vs. app empaquetada:**

* **Desarrollo:** `npm run dev` levanta Express con **nodemon** (recarga en caliente). El
  reinicio tras restauración se hace escribiendo `src/restart-dev-trigger.json` para que
  nodemon reinicie.
* **App empaquetada (Electron):** `electron/main.js` arranca el backend dentro del proceso
  de Electron, abre la ventana y, tras una restauración, **relanza el proceso de Electron**
  (evento `prismia:reinicio-solicitado` → `relanzarAplicacionPorRestauracion`).

---

## 7. Electron

* **Archivo principal:** `electron/main.js`.
* **Puerto local:** **`3210`** (confirmado: `PRISMIA_ELECTRON_PORT || 3210`).
* **Variable de entorno:** `PRISMIA_ELECTRON_PORT` (confirmada en `electron/main.js`).
* **Creación de ventana:** Electron espera a que el servidor local responda
  (`esperarServidorDisponible`) y luego abre la ventana principal apuntando a
  `http://localhost:3210`.
* **Relanzamiento posterior a restauración:** al recibir el evento
  `prismia:reinicio-solicitado`, ejecuta `relanzarAplicacionPorRestauracion` para reiniciar
  la app con la base ya restaurada.
* **Integración con reinicio de app:** el reinicio tras restauración está coordinado entre
  `backups.controller.js` (marca `restauracionPendiente`), `src/app.js` y `electron/main.js`.
* **Atajo de soporte:** `electron/main.js` define un atajo global para soporte de backups
  (`CommandOrControl+Alt+Shift+B`).
* **Estado actual del manejo de doble instancia:** **no implementado.** El proyecto **no**
  usa `app.requestSingleInstanceLock()` ni el evento `second-instance`, y **no** captura el
  error `EADDRINUSE` (búsqueda sin resultados en todo el repositorio). Ver 7.1.

### 7.1 Incidente conocido: puerto ocupado EADDRINUSE

Durante una instalación en el equipo de un cliente, al abrir Prismia apareció una ventana de
Electron con el error:

```txt
A JavaScript error occurred in the main process
Error: listen EADDRINUSE: address already in use 127.0.0.1:3210
```

Se solucionó **cerrando/reiniciando el proceso (o el equipo)** y Prismia quedó funcionando.

**Causa probable:** el puerto local **`3210`** ya estaba **ocupado** cuando Prismia intentó
escuchar en él. Suele pasar si Prismia ya estaba abierto, si quedó un proceso colgado, si el
usuario hizo doble clic varias veces sobre el ícono, o si otro proceso usa el mismo puerto.
**No** indica corrupción de base de datos ni daño de instalación; es un problema de
**arranque / doble instancia / puerto ocupado**.

**Severidad:**

```txt
Severidad técnica: media
Severidad comercial: alta
Riesgo de datos: bajo
Prioridad de parche: alta antes de más instalaciones piloto
```

**Pendiente de parche (no se modifica código en esta tanda):**

```txt
app.requestSingleInstanceLock()
manejo de second-instance
captura de EADDRINUSE
mensaje amigable al usuario
log local
enfocar ventana existente
```

**Mitigación temporal de soporte** (mientras no exista el parche; comando del `README.md`
para liberar el puerto en Windows):

```powershell
Get-NetTCPConnection -LocalPort 3210 -ErrorAction SilentlyContinue |
ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force
}
```

> Esta tanda **solo documenta** el incidente; no modifica código.

---

## 8. Configuración y entorno

Archivos de configuración (en `src/config/`, salvo `.env.example` en la raíz):

| Archivo | Función |
|---|---|
| `.env.example` | Plantilla de variables de entorno. El `.env` real **no se versiona**. |
| `src/config/env.js` | Carga y normaliza la configuración de entorno (app, puerto, BD, backups, HTTPS). |
| `src/config/runtime-paths.js` | Resuelve rutas runtime (datos, uploads, backups) según repo o AppData. |
| `src/config/runtime-secrets.js` | Gestiona secretos runtime (genera/usa `config/secretos.local.json`). |
| `src/config/sqlite-session-store.js` | Almacén de sesiones HTTP en SQLite para `express-session`. |
| `src/config/db.js` | Apertura de la conexión `better-sqlite3`. |
| `src/config/empresa.js` | Datos de empresa / versión visible (`1.0.0`). |
| `src/config/licencia-comercial.js` | Construye el mensaje/URL de renovación (WhatsApp) y datos comerciales. |
| `src/config/licencia-public-key.js` | Clave **pública** para validar la firma del código de activación. |
| `src/config/app-events.js` | Bus de eventos interno (p. ej. `prismia:reinicio-solicitado`). |

**Variables de entorno importantes** (documentadas en `README.md`; **no exponer valores
reales**):

```txt
APP_NAME, APP_PORT, NODE_ENV
DB_CLIENT, DB_NAME, DB_PATH
PRISMIA_DATA_DIR
SESSION_SECRET, SUPPORT_BACKUP_KEY
BACKUP_BASE_DIR, BACKUP_EXTERNAL_PATH
HTTPS_PORT, PRISMIA_HTTPS_CERT_DIR, PRISMIA_HTTPS_KEY, PRISMIA_HTTPS_CERT
```

Notas confirmadas:

* **Secretos runtime:** si `SESSION_SECRET` o `SUPPORT_BACKUP_KEY` están vacíos en `.env`,
  Prismia **genera valores únicos por instalación** y los guarda en
  `config/secretos.local.json` (dentro de AppData en producción).
* **Clave de soporte de backups:** `SUPPORT_BACKUP_KEY` controla el desbloqueo del **modo
  soporte** de backups.
* **Rutas runtime:** si `PRISMIA_DATA_DIR` queda vacío en producción, se usa una carpeta
  segura del usuario en **AppData**.
* **Configuración de empresa:** `empresa.js` expone la versión visible y datos base.
* **Licencia comercial / clave pública:** `licencia-comercial.js` arma el mensaje de
  renovación; `licencia-public-key.js` solo contiene la clave **pública** (la **privada**
  vive en `tools/licencias/private/`, sensible).

> **No exponer ni copiar valores secretos reales** en documentación ni en ZIPs.

---

## 9. Middlewares

Ubicación: `src/middlewares/`. Archivos confirmados:

| Archivo | Responsabilidad |
|---|---|
| `auth.middleware.js` | **Autenticación** de sesión (`requiereAutenticacion`): exige usuario logueado. |
| `role.middleware.js` | **Roles** (`requiereRol(...)`): restringe rutas por rol. |
| `locals.middleware.js` | **Locals**: inyecta variables comunes a las vistas (usuario, negocio, etc.). |
| `licencia.middleware.js` | **Licencia operativa** (`requiereLicenciaOperativa`): bloquea rutas si la licencia no está vigente. |
| `error.middleware.js` | **Manejo de errores** y página **404** (vista `errors/404.ejs`). |

**Roles confirmados en el código:** `administrador`, `cajero`, `inventario`.

Restricciones por rol (confirmadas en los `*.routes.js`):

| Rol(es) | Módulos/rutas que protegen |
|---|---|
| `administrador` | usuarios, configuracion, compras, proveedores, reportes, backups, activación de licencia. |
| `administrador`, `cajero` | ventas (con algunas acciones solo `administrador`), caja, clientes, cotizaciones, remisiones, notas crédito, catalogos. |
| `administrador`, `inventario` | productos, categorias-productos, inventario. |

* **Seguridad / logging:** `helmet` y `morgan` se aplican a nivel de app (`src/app.js`).
* En **ventas**, el router base permite `administrador` y `cajero`, pero **varias acciones de
  escritura exigen rol `administrador`** adicional. El mapeo exacto acción por acción no está
  detallado aquí — **Pendiente de confirmar** el detalle fino si se necesita.

---

## 10. Patrón modular

Flujo de una petición:

```txt
routes → controller → service → repository → database
```

| Capa | Responsabilidad | Qué debe vivir ahí | Qué evitar |
|---|---|---|---|
| **routes** | Define URLs y middlewares. | Mapeo URL→controller, middlewares (auth, rol, multer). | Lógica de negocio, SQL. |
| **controller** | Recibe el request y responde. | Leer `req`, llamar al service, render/redirect. | SQL directo, reglas de negocio pesadas. |
| **service** | Reglas de negocio. | Validaciones, cálculos (IVA, costo, utilidad), orquestación. | SQL crudo, manejo de `req`/`res`. |
| **repository** | SQL y acceso a datos. | Consultas `better-sqlite3`, transacciones. | Reglas de negocio, lógica de presentación. |
| **views (EJS)** | Interfaz. | HTML, presentación, formato visual. | SQL, reglas de negocio. |

Resumen rápido:

```txt
routes:     define URLs y middlewares
controller: recibe request y responde
service:    reglas de negocio
repository: SQL y acceso a datos
views:      interfaz EJS
```

Regla del proyecto (de `README.md`): no mezclar SQL en vistas, ni reglas de negocio en EJS,
ni lógica pesada en controllers; trabajar **módulo por módulo** y sin refactors innecesarios.

---

## 11. Módulos funcionales

Basado en el mapa documental (secciones 3, 4, 5, 8). No se inventan funcionalidades; lo no
confirmado se marca como **Pendiente de confirmar**.

### 11.1 `auth`

* **Propósito:** login / logout y protección de sesión.
* **Ruta base:** `/auth`.
* **Archivos:** `auth.routes.js`, `auth.service.js`, `auth.repository.js`.
* **Vistas:** `auth/login.ejs`.
* **Tablas:** `usuarios`, `usuario_roles` (y `roles`).
* **Flujos:** inicio de sesión (autentica y crea sesión).
* **Observaciones:** sesiones persistidas en SQLite (`sqlite-session-store`); contraseñas con
  `bcryptjs`. Rutas: `GET /login`, `POST /logout`.
* **Pendientes:** ninguno detectado.

### 11.2 `setup`

* **Propósito:** configuración inicial del primer administrador.
* **Ruta base:** `/setup`.
* **Archivos:** `setup.routes.js`, `setup.service.js`, `setup.controller.js`, `setup.repository.js`.
* **Vistas:** `setup/index.ejs`.
* **Tablas:** `usuarios`, `roles`, `usuario_roles`, `configuracion_negocio`.
* **Flujos:** primer uso (crea primer admin y arranca el sistema).
* **Observaciones:** primer arranque del sistema. Rutas: `GET /`, `POST /`.
* **Pendientes:** ninguno detectado.

### 11.3 `dashboard`

* **Propósito:** vista general / panel de inicio.
* **Ruta base:** `/dashboard`.
* **Archivos:** `dashboard.routes.js`, `dashboard.service.js`, `dashboard.controller.js`, `dashboard.repository.js`.
* **Vistas:** `dashboard/index.ejs`.
* **Tablas:** lectura agregada (ventas, caja, etc.) — **Pendiente de confirmar** detalle.
* **Flujos:** panel con accesos y estado operativo.
* **Observaciones:** `GET /` (destino de la redirección de `/`).
* **Pendientes:** ninguno detectado.

### 11.4 `configuracion`

* **Propósito:** datos del negocio, moneda, IVA por defecto, mensaje de recibo.
* **Ruta base:** `/configuracion` — requiere rol **administrador**.
* **Archivos:** `configuracion.*` (routes/controller/service/repository).
* **Vistas:** `configuracion/index.ejs`.
* **Tablas:** `configuracion_negocio`.
* **Flujos:** editar datos, moneda, IVA y recibo. Guarda valores por defecto:
  `maneja_iva`, `iva_incluido_en_precio`, `porcentaje_iva_defecto`.
* **Observaciones:** `GET /`, `POST /`.
* **Pendientes:** ninguno detectado.

### 11.5 `usuarios`

* **Propósito:** administración de usuarios (crear/editar/activar/desactivar).
* **Ruta base:** `/usuarios` — requiere rol **administrador**.
* **Archivos:** `usuarios.*`.
* **Vistas:** `usuarios/index.ejs`, `formulario.ejs`.
* **Tablas:** `usuarios`, `roles`, `usuario_roles`.
* **Flujos:** alta/edición de usuarios y roles.
* **Rutas:** `GET /`, `GET /nuevo`, `POST /nuevo`, `GET /:id/editar`, `POST /:id/editar`,
  `POST /:id/activar`, `POST /:id/desactivar`.
* **Pendientes:** ninguno detectado.

### 11.6 `clientes`

* **Propósito:** gestión de clientes y datos de facturación.
* **Ruta base:** `/clientes` — requiere rol **administrador o cajero**.
* **Archivos:** `clientes.*` + `public/js/clientes.js`.
* **Vistas:** `clientes/index.ejs`, `form.ejs`.
* **Tablas:** `clientes`, `catalogo_departamentos`, `catalogo_municipios`.
* **Flujos:** alta/edición de clientes; alta rápida desde POS (`POST /rapido`).
* **Rutas:** `GET /`, `GET /nuevo`, `POST /nuevo`, `POST /rapido`, `GET /:id/editar`,
  `POST /:id/editar`, `POST /:id/estado`.
* **Pendientes:** ninguno detectado.

### 11.7 `productos`

* **Propósito:** productos, precios, costos, IVA, stock, imagen.
* **Ruta base:** `/productos` — requiere rol **administrador o inventario**.
* **Archivos:** `productos.controller.js`, `productos.service.js`, `productos.repository.js`,
  `productos.routes.js` (los cuatro confirmados en tanda 1.1).
* **Vistas:** `productos/index.ejs`, `formulario.ejs`.
* **Tablas:** `productos`, `categorias_productos`, `unidades_medida`.
* **Flujos:** crear/editar con precio, costo, IVA, stock e imagen; activar/desactivar.
* **Rutas:** `GET /`, `GET /nuevo`, `POST /nuevo`, `GET /:id/editar`, `POST /:id/editar`,
  `POST /:id/activar`, `POST /:id/desactivar`.
* **Observaciones técnicas:** la imagen se sube con **`multer`**
  (`uploadImagenProducto.single('imagen_producto')`) como middleware antes del controller;
  se guarda en disco en `runtime-paths.obtenerCarpetaUploadsProductos()` (servida bajo
  `/uploads/productos/`), tipos **JPG/PNG/WEBP**, máximo **2 MB**. Soporta quitar imagen
  (`quitar_imagen_producto`) y borra de forma segura la imagen anterior.
* **Pendientes:** ninguno detectado (los antiguos pendientes quedaron resueltos en tanda 1.1).

### 11.8 `categorias-productos`

* **Propósito:** categorías de productos.
* **Ruta base:** `/categorias-productos` — requiere rol **administrador o inventario**.
* **Archivos:** `categorias.*`.
* **Vistas:** `categorias-productos/index.ejs`, `formulario.ejs`.
* **Tablas:** `categorias_productos`.
* **Flujos:** alta/edición/activación de categorías.
* **Rutas:** `GET /`, `GET /nueva`, `POST /nueva`, `GET /:id/editar`, `POST /:id/editar`,
  `POST /:id/activar`, `POST /:id/desactivar`.
* **Pendientes:** ninguno detectado.

### 11.9 `catalogos`

* **Propósito:** catálogos de apoyo (departamentos / municipios DIVIPOLA Colombia).
* **Ruta base:** `/catalogos` — requiere rol **administrador o cajero**.
* **Archivos:** `catalogos.*`.
* **Vistas:** API, sin vista propia.
* **Tablas:** `catalogo_departamentos`, `catalogo_municipios`.
* **Flujos:** búsqueda para autocompletar en formularios (clientes/proveedores).
* **Rutas:** `GET /departamentos/buscar`, `GET /municipios/buscar`, `GET /municipios/:codigo`.
* **Pendientes:** ninguno detectado.

### 11.10 `inventario`

* **Propósito:** stock, ajustes, historial, conteos físicos y reportes.
* **Ruta base:** `/inventario` — requiere rol **administrador o inventario**.
* **Archivos:** `inventario.controller.js`, `inventario.service.js`, `inventario.routes.js`
  (repository presente en el módulo).
* **Vistas:** `inventario/index.ejs`, `ajuste.ejs`, `historial.ejs`, `reportes.ejs`, `conteos/`.
* **Tablas:** `movimientos_inventario`, `conteos_inventario`, `detalle_conteos_inventario`,
  `productos`.
* **Flujos:** ajustes manuales, historial, conteos físicos (con diferencias) y reportes;
  exportación a Excel.
* **Rutas:** `GET /`, `GET /reportes`, `GET /reportes/exportar`, `GET /historial`,
  `GET /conteos`, `GET|POST /conteos/nuevo`, `GET /conteos/:id`, `GET /conteos/:id/diferencias`,
  `POST /conteos/:id/guardar`, `POST /conteos/:id/aplicar`, `GET|POST /:id/ajuste`.
* **Pendientes:** ninguno detectado.

### 11.11 `ventas`

* **Propósito:** POS / ventas, carrito, pagos, ticket, historial, POS móvil.
* **Ruta base:** `/ventas` — requiere rol **administrador o cajero** (algunas acciones solo
  administrador).
* **Archivos:** `ventas.service.js`, `ventas.repository.js`, `ventas.controller.js`,
  `ventas.routes.js` + `public/js/ventas.js`, `ventas-movil.js`, `ventas-anulacion.js`.
* **Vistas:** `ventas/index.ejs`, `movil.ejs`, `historial.ejs`, `detalle.ejs`, `ticket.ejs`.
* **Tablas:** `ventas`, `detalle_ventas`, `pagos_venta`, `movimientos_inventario`,
  `movimientos_caja`, `medios_pago`; en anulación también `anulaciones_venta`, `notas_credito`,
  `detalle_notas_credito`, `turnos_caja`, `auditoria`.
* **Flujos:** venta POS, descuentos, pagos mixtos, ticket, historial, **anulación** (genera
  nota crédito interna). Ver detalle en **sección 17**.
* **Rutas:** `GET /`, `POST /`, `GET /movil`, `GET /historial`, `GET /productos/buscar`,
  `GET /clientes/buscar`, `GET /productos/:id`, `GET /:id/ticket`, `GET /:id`.
* **Pendientes:** `cambio_entregado` a nivel de cabecera (fórmula exacta) — **Pendiente de
  confirmar**.

### 11.12 `caja`

* **Propósito:** apertura, movimientos, gastos, cierre y turnos de caja.
* **Ruta base:** `/caja` — requiere rol **administrador o cajero**.
* **Archivos:** `caja.service.js`, `caja.repository.js`, `caja.controller.js`, `caja.routes.js`.
* **Vistas:** `caja/index.ejs`, `abrir.ejs`, `cerrar.ejs`, `gasto.ejs`, `movimiento.ejs`,
  `turno-detalle.ejs`, `turno-imprimir.ejs`.
* **Tablas:** `turnos_caja`, `movimientos_caja`, `pagos_venta`; gastos en `gastos` /
  `categorias_gasto`.
* **Flujos:** apertura con base, movimientos/gastos manuales, cierre con diferencias. Ver
  **sección 18**.
* **Rutas:** `GET /`, `GET|POST /abrir`, `GET|POST /movimiento`, `GET|POST /gasto`,
  `GET|POST /cerrar`, `GET /turnos/:id`, `GET /turnos/:id/imprimir`, `GET /turnos/:id/excel`.
* **Observaciones:** los **gastos** se gestionan dentro de caja (`/caja/gasto`), no como
  módulo aparte.
* **Pendientes:** ninguno detectado.

### 11.13 `compras`

* **Propósito:** compras a proveedores, detalle, cuentas por pagar y pagos.
* **Ruta base:** `/compras` — requiere rol **administrador**.
* **Archivos:** `compras.repository.js`, `compras.routes.js`, `compras.controller.js`,
  `compras.service.js` (los cuatro confirmados) + `public/js/compras-formulario.js`,
  `compras-detalle.js`.
* **Vistas:** `compras/index.ejs`, `formulario.ejs`, `detalle.ejs`, `imprimir.ejs`,
  `cuentas-por-pagar.ejs`, `pago-proveedor.ejs`, `pagos-proveedores.ejs`.
* **Tablas:** `compras`, `compras_detalle`, `pagos_compras_proveedores`,
  `movimientos_inventario`, `productos`.
* **Flujos:** registro de compra (actualiza `ultimo_costo` y `costo_promedio`), cuentas por
  pagar y pagos a proveedores. Ver **sección 19**.
* **Rutas:** `GET /`, `POST /`, `GET /nueva`, `GET /formulario`, `GET /api/productos/buscar`,
  `POST /api/validar`, `GET /cuentas-por-pagar`, `GET /pagos-proveedores`,
  `GET /:id`, `GET /:id/imprimir`, `GET /:id/pagos/nuevo`, `POST /:id/pagos`,
  `POST /:id/pagos/:idPago/anular`.
* **Pendientes:** cuentas por pagar avanzadas (pendiente de producto, no bloqueante).

### 11.14 `proveedores`

* **Propósito:** gestión de proveedores.
* **Ruta base:** `/proveedores` — requiere rol **administrador**.
* **Archivos:** `proveedores.*`.
* **Vistas:** `proveedores/index.ejs`, `formulario.ejs`.
* **Tablas:** `proveedores`.
* **Flujos:** alta/edición de proveedores.
* **Rutas:** `GET /`, `GET /nuevo`, `POST /nuevo`, `GET /:id/editar`, `POST /:id/editar`,
  `POST /:id/activar`, `POST /:id/desactivar`.
* **Pendientes:** ninguno detectado.

### 11.15 `cotizaciones`

* **Propósito:** cotizaciones y conversión a venta.
* **Ruta base:** `/cotizaciones` — requiere rol **administrador o cajero**.
* **Archivos:** `cotizaciones.*` + `public/js/cotizaciones.js`.
* **Vistas:** `cotizaciones/index.ejs`, `form.ejs`, `detalle.ejs`, `imprimir.ejs`.
* **Tablas:** `cotizaciones`, `detalle_cotizaciones`, `numeraciones_documentos`.
* **Flujos:** crear/consultar, imprimir y **convertir a venta**.
* **Rutas:** `GET /`, `POST /`, `GET /nueva`, `GET /api`, `GET /api/siguiente`,
  `GET /api/clientes/buscar`, `GET /api/productos/buscar`, `GET /api/productos/:id`,
  `GET /api/:id`, `GET /:id`, `GET /:id/imprimir`, `GET /:id/convertir/preparar`,
  `POST /:id/convertir`.
* **Pendientes:** ninguno detectado.

### 11.16 `remisiones`

* **Propósito:** remisiones / despacho y conversión a venta.
* **Ruta base:** `/remisiones` — requiere rol **administrador o cajero**.
* **Archivos:** `remisiones.*` + `public/js/remisiones.js`.
* **Vistas:** `remisiones/index.ejs`, `form.ejs`, `detalle.ejs`, `imprimir.ejs`.
* **Tablas:** `remisiones`, `detalle_remisiones`, `numeraciones_documentos`.
* **Flujos:** misma estructura que cotizaciones (crear/consultar/imprimir/convertir a venta).
* **Rutas:** equivalentes a cotizaciones (`GET /`, `POST /`, `GET /nueva`, `GET /api*`,
  `GET /:id`, `GET /:id/imprimir`, `GET /:id/convertir/preparar`, `POST /:id/convertir`).
* **Pendientes:** ninguno detectado.

### 11.17 `notasCredito`

* **Propósito:** notas crédito **internas** (no fiscales).
* **Ruta base:** `/notas-credito` — requiere rol **administrador o cajero**.
* **Archivos:** `notasCredito.*` (repository/service/controller/routes).
* **Vistas:** `notasCredito/index.ejs`, `detalle.ejs`, `imprimir.ejs`.
* **Tablas:** `notas_credito`, `detalle_notas_credito`, `numeraciones_documentos`.
* **Flujos:** hoy se **generan automáticamente al anular una venta** (origen
  `anulacion_venta`); el módulo permite **consultar, ver detalle e imprimir**.
* **Rutas:** `GET /`, `GET /api`, `GET /api/siguiente`, `GET /api/resumen`, `GET /api/:id`,
  `GET /:id`, `GET /:id/imprimir`.
* **Observaciones:** son `documento_fiscal_estado = 'interno'`. Su impacto contable es el de
  la anulación que las origina.
* **Pendientes:** ninguno detectado.

### 11.18 `reportes`

* **Propósito:** reportes operativos y de ventas.
* **Ruta base:** `/reportes` — requiere rol **administrador**.
* **Archivos:** `reportes.controller.js`, `reportes.routes.js` (service/repository presentes).
* **Vistas:** `reportes/index.ejs`.
* **Tablas:** `ventas`, `detalle_ventas`, `movimientos_*`.
* **Flujos:** reportes de ventas; calcula **utilidad y margen bruto** sobre ventas `pagada`
  (`margen_bruto_porcentaje = utilidad_bruta_neta / total_neto × 100`).
* **Rutas:** `GET /`.
* **Pendientes:** ninguno detectado.

### 11.19 `backups`

* **Propósito:** backups y modo soporte (restauración controlada).
* **Ruta base:** `/backups` — requiere rol **administrador**; las acciones de soporte exigen
  **modo soporte desbloqueado** (`requiereSoporteBackups`).
* **Archivos:** `backups.service.js`, `backups.controller.js`, `backups.routes.js`.
* **Vistas:** `backups/index.ejs`, `soporte.ejs`.
* **Tablas:** opera sobre archivos (ZIP) y la base completa; limpia `sesiones_http` tras
  restaurar.
* **Flujos:** crear/descargar backup, abrir carpeta, **restaurar** (con backup de emergencia
  y reinicio). Ver **sección 20**.
* **Rutas:** `GET /`, `GET /soporte`, `POST /soporte/desbloquear`, `POST /soporte/cerrar`,
  `POST /soporte/crear`, `POST /soporte/abrir-carpeta`, `POST /soporte/restaurar`,
  `GET /soporte/descargar/:archivo`.
* **Pendientes:** ninguno detectado.

### 11.20 `licencia-local`

* **Propósito:** estado, activación, huella y firma de licencia local.
* **Ruta base:** `/licencia`.
* **Archivos:** `licenciaLocal.service.js`, `licenciaLocal.repository.js`,
  `licenciaLocal.controller.js`, `licenciaLocal.routes.js`, `huellaEquipo.service.js`,
  `licenciaFirma.service.js`.
* **Vistas:** `licencia/index.ejs`, `activar.ejs`, `vencida.ejs`.
* **Tablas:** `licencia_local` (migraciones 038–040).
* **Flujos:** estados (prueba/activa/gracia/vencida...), activación por código, huella, firma.
  Ver **sección 21**.
* **Rutas:** `GET /`, `GET /activar`, `POST /activar` (solo administrador).
* **Observaciones:** clave **privada** en `tools/licencias/private/` (no se toca).
* **Pendientes:** licenciamiento remoto/panel (pendiente de producto, no bloqueante).

---

## 12. Rutas principales

Montaje de routers en `src/app.js` (cada módulo bajo su prefijo):

```txt
/setup                 → setup
/auth                  → auth (login/logout)
/licencia              → licencia-local
/dashboard             → dashboard
/configuracion         → configuracion
/usuarios              → usuarios
/clientes              → clientes
/productos             → productos
/categorias-productos  → categorias
/catalogos             → catalogos
/inventario            → inventario
/ventas                → ventas
/caja                  → caja
/compras               → compras
/proveedores           → proveedores
/cotizaciones          → cotizaciones
/remisiones            → remisiones
/notas-credito         → notasCredito
/reportes              → reportes
/backups               → backups
```

Rutas técnicas globales:

```txt
GET /                          → redirige a /dashboard
GET /salud                     → estado del sistema (JSON: app, versión, entorno)
GET /__restauracion-finalizada → reinicio interno tras restauración (solo local + admin)
```

> El detalle de rutas por módulo (verbo + ruta) está en la **sección 5 del mapa documental**
> y resumido en cada módulo de la sección 11 de esta guía. No se listan rutas no confirmadas.

---

## 13. Base de datos

* **Esquema:** `src/database/schema.sql`.
* **Migraciones:** `src/database/migrations/` (numeradas `001` … `040`).
* **Inicialización:** `src/database/init-db.js`, `src/database/ensure-db.js`.
* **Validación:** `src/database/validate-db.js` (solo lectura).
* **Auditoría:** `src/database/audit-contable.js`, `audit-licencia.js`.
* **Herramientas:** `src/database/tools/auditar-estructura-bd.js`,
  `generar-schema-consolidado.js`.
* **Datos / semillas:** `src/database/data/` (sensible), `seed/`, `seeders/`, `reports/`.

**Tablas principales agrupadas por área** (confirmadas en `schema.sql`):

| Área | Tablas | Función |
|---|---|---|
| Seguridad y usuarios | `roles`, `usuarios`, `usuario_roles` | Usuarios, roles y su relación. |
| Configuración del negocio | `configuracion_negocio` | Datos del negocio, moneda, IVA por defecto, recibo. |
| Licenciamiento | `licencia_local` | Estado, prueba, gracia, activación de la licencia local. |
| Catálogos | `catalogo_departamentos`, `catalogo_municipios` | Ubicaciones Colombia (DIVIPOLA). |
| Productos e inventario | `productos`, `categorias_productos`, `unidades_medida`, `movimientos_inventario`, `conteos_inventario`, `detalle_conteos_inventario` | Catálogo de productos, stock, movimientos y conteos. |
| Clientes y proveedores | `clientes`, `proveedores` | Terceros del negocio. |
| Medios de pago y numeración | `medios_pago`, `numeraciones_documentos` | Formas de pago y consecutivos de documentos. |
| Ventas | `ventas`, `detalle_ventas`, `pagos_venta`, `comprobantes`, `anulaciones_venta`, `devoluciones_venta`, `detalle_devoluciones_venta` | Ventas, detalle, pagos, comprobantes, anulaciones y devoluciones. |
| Caja | `turnos_caja`, `movimientos_caja` | Turnos y movimientos de caja. |
| Gastos | `categorias_gasto`, `gastos` | Gastos (gestionados desde caja). |
| Compras | `compras`, `compras_detalle`, `pagos_compras_proveedores` | Compras, detalle y pagos a proveedores. |
| Documentos internos | `cotizaciones`, `detalle_cotizaciones`, `remisiones`, `detalle_remisiones`, `notas_credito`, `detalle_notas_credito` | Documentos comerciales internos. |
| Auditoría | `auditoria` | Traza de acciones sensibles. |

> Nota: el detalle de ventas es `detalle_ventas` y el de compras `compras_detalle`. Existe
> también la tabla de sesiones HTTP (`sesiones_http`, usada por el almacén de sesiones).

---

## 14. Migraciones

* **Ubicación:**

```txt
src/database/migrations/
```

* **Convención de numeración:** prefijo numérico de tres dígitos + descripción, p. ej.
  `037_normalizar_iva_venta_porcentaje.js`, `038_crear_licencia_local.js`.
* **Estado:** el mapa detectó migraciones hasta **`040`** (la última confirmada es
  `040_ampliar_datos_licencia_activada.js`).
* **Riesgo de ejecutar migraciones:** **alto.** Algunas **modifican estructura y datos** de la
  base. Los comandos `npm run db:migrate:NNN` están marcados como **delicados**.
* **Regla:** **no deben correrse en el equipo de un cliente sin un backup previo**, y
  **no se ejecutan en esta tanda documental**. Hoy las migraciones **no son automáticas al
  iniciar** (es un pendiente de producto).

---

## 15. Scripts y comandos útiles

Basado en `package.json` y el mapa documental.

| Comando | Qué hace | Cuándo usarlo | Riesgo |
|---|---|---|---|
| `npm run dev` | Reconstruye `better-sqlite3` y levanta el servidor con nodemon. | Desarrollo diario. | Bajo |
| `npm run dev:https` | Igual que `dev` pero con HTTPS local. | Probar HTTPS local. | Bajo |
| `npm run start` | Reconstruye nativo y arranca el servidor (modo normal). | Ejecutar sin nodemon. | Bajo |
| `npm run start:https` | Arranque con HTTPS. | Ejecutar HTTPS sin nodemon. | Bajo |
| `npm run electron` | Reconstruye nativo para Electron y abre la app. | Probar la app de escritorio. | Bajo |
| `npm run electron:rebuild` | Solo reconstruye nativos para Electron. | Tras cambiar Node/Electron. | Bajo |
| `npm run native:node` | `npm rebuild better-sqlite3` (binario para Node). | Tras reinstalar Node. | Bajo |
| `npm run native:electron` | `electron-rebuild` de `better-sqlite3`. | Tras reinstalar Electron. | Bajo |
| `npm run pack:dir` | Verifica pre-Electron y genera versión desempaquetada (`--dir`). | Probar empaquetado. | Bajo |
| `npm run dist:win` | Verifica pre-Electron y genera instalador NSIS. | Generar instalador. | Bajo |
| `npm run check:pre-electron` | Valida BD + ausencia de secretos/SQLite/backups/certs versionados. | Antes de empaquetar/instalar. | **Solo lectura** |
| `npm run check:runtime` | Diagnóstico de rutas y entorno runtime. | Diagnóstico de instalación. | **Solo lectura** |
| `npm run db:validate` | Valida la base de datos. | Verificar integridad estructural. | **Solo lectura** |
| `npm run db:audit:contable` | Auditoría contable (cuadres). | Revisar cuadres de ventas. | **(delicado)** lectura sensible |
| `npm run db:repair:turnos` | **Repara turnos de caja.** | Solo con backup y caso real. | **(delicado) MODIFICA DATOS** |
| `npm run licencia:keys` | Genera claves de licencia. | Solo en flujo de licenciamiento. | **(delicado)** |
| `npm run licencia:code` | Genera código de activación. | Solo en flujo de licenciamiento. | **(delicado)** |
| `npm run licencia:audit` | Auditoría de licencia. | Revisar estado de licencia. | **(delicado)** lectura |
| `npm run db:migrate:001 … :040` | Ejecutan migraciones específicas. | Solo con backup, nunca en cliente sin respaldo. | **(delicado) MODIFICA BASE** |
| `npm run demo:reset` | Resetea datos de demo. | Solo en entorno demo. | **(delicado) SOBRESCRIBE DATOS** |
| `npm run demo:electron` | Abre Electron con datos demo aislados. | Demostraciones. | Bajo |

**Marcados como delicados (no ejecutar en esta tanda):**

```txt
db:repair:turnos
licencia:keys
licencia:code
db:migrate:*
demo:reset
restauración de backups
```

Scripts utilitarios fuera de `package.json`: `scripts/verificar-pre-electron.js`,
`scripts/diagnostico-runtime.js`, `src/database/tools/auditar-estructura-bd.js`,
`src/database/tools/generar-schema-consolidado.js`.

---

## 16. Flujos técnicos principales

Para cada flujo: módulos, rutas, services/repositories, tablas tocadas y puntos de riesgo.

### 16.1 Primer uso / setup
* **Módulos:** setup, auth. **Rutas:** `GET|POST /setup`.
* **Capas:** `setup.service.js`, `setup.repository.js`.
* **Tablas:** `usuarios`, `roles`, `usuario_roles`, `configuracion_negocio`.
* **Riesgo:** solo en primer arranque; crea el primer administrador.

### 16.2 Login
* **Módulos:** auth. **Rutas:** `GET /auth/login`, `POST /logout`.
* **Capas:** `auth.service.js`, `auth.repository.js`.
* **Tablas:** `usuarios`, `usuario_roles`; sesión en `sesiones_http`.
* **Riesgo:** manejo de contraseñas (`bcryptjs`) y sesión.

### 16.3 Gestión de usuarios
* **Módulos:** usuarios (rol administrador). **Rutas:** `/usuarios/*`.
* **Tablas:** `usuarios`, `roles`, `usuario_roles`.
* **Riesgo:** desactivar el único admin dejaría el sistema sin acceso — **Pendiente de
  confirmar** si hay protección.

### 16.4 Configuración del negocio
* **Módulos:** configuracion (rol administrador). **Rutas:** `GET|POST /configuracion`.
* **Tablas:** `configuracion_negocio`.
* **Riesgo:** cambiar IVA por defecto / moneda afecta cálculos futuros.

### 16.5 Productos e imágenes
* **Módulos:** productos (rol administrador/inventario). **Rutas:** `/productos/*`.
* **Capas:** `productos.service.js`, `productos.repository.js`; `multer` en `routes`.
* **Tablas:** `productos`, `categorias_productos`, `unidades_medida`.
* **Riesgo:** la imagen se guarda en disco (uploads); validar tipo/tamaño (JPG/PNG/WEBP, 2 MB).

### 16.6 Inventario
* **Módulos:** inventario. **Rutas:** `/inventario/*`.
* **Capas:** `inventario.service.js`, `inventario.repository.js`.
* **Tablas:** `movimientos_inventario`, `conteos_inventario`, `detalle_conteos_inventario`,
  `productos`.
* **Riesgo:** aplicar un conteo o ajuste modifica stock; revisar diferencias antes de aplicar.

### 16.7 Venta POS
* **Módulos:** ventas, caja, inventario. **Rutas:** `GET /ventas`, `POST /ventas`.
* **Capas:** `ventas.service.js` (`calcularLineaVenta`, `calcularResumenRegistroVenta`),
  `ventas.repository.js`.
* **Tablas:** `ventas`, `detalle_ventas`, `pagos_venta`, `movimientos_inventario`,
  `movimientos_caja`, `medios_pago`.
* **Riesgo:** requiere turno de caja abierto; descuenta stock y mueve caja. Ver **sección 17**.

### 16.8 Caja y turnos
* **Módulos:** caja. **Rutas:** `/caja/*`.
* **Capas:** `caja.service.js`, `caja.repository.js`.
* **Tablas:** `turnos_caja`, `movimientos_caja`, `pagos_venta`, `gastos`.
* **Riesgo:** cierre calcula diferencias; reparación de turnos es delicada. Ver **sección 18**.

### 16.9 Compras
* **Módulos:** compras, proveedores, inventario. **Rutas:** `/compras/*`.
* **Capas:** `compras.service.js`, `compras.repository.js`.
* **Tablas:** `compras`, `compras_detalle`, `pagos_compras_proveedores`,
  `movimientos_inventario`, `productos`.
* **Riesgo:** actualiza `ultimo_costo` y `costo_promedio` del producto. Ver **sección 19**.

### 16.10 Cotizaciones
* **Módulos:** cotizaciones. **Rutas:** `/cotizaciones/*`.
* **Tablas:** `cotizaciones`, `detalle_cotizaciones`, `numeraciones_documentos`.
* **Riesgo:** la conversión a venta crea una venta real (toca stock/caja).

### 16.11 Remisiones
* **Módulos:** remisiones. **Rutas:** `/remisiones/*`.
* **Tablas:** `remisiones`, `detalle_remisiones`, `numeraciones_documentos`.
* **Riesgo:** igual que cotizaciones al convertir a venta.

### 16.12 Notas crédito internas
* **Módulos:** notasCredito (consulta) + ventas (generación al anular).
* **Rutas:** `/notas-credito/*` (consulta/impresión).
* **Tablas:** `notas_credito`, `detalle_notas_credito`, `numeraciones_documentos`.
* **Riesgo:** son internas (no fiscales); su origen es la anulación de venta.

### 16.13 Reportes
* **Módulos:** reportes (rol administrador). **Rutas:** `GET /reportes`.
* **Capas:** `reportes.service.js`, `reportes.repository.js`.
* **Tablas:** `ventas`, `detalle_ventas`, `movimientos_*`.
* **Riesgo:** solo lectura; calcula utilidad y margen sobre ventas `pagada`.

### 16.14 Backups
* **Módulos:** backups (rol administrador + modo soporte). **Rutas:** `POST /backups/soporte/crear`,
  `GET /backups/soporte/descargar/:archivo`.
* **Capas:** `backups.service.js`, `backups.controller.js`.
* **Tablas:** archivos (ZIP), no tabla.
* **Riesgo:** bajo al crear; el ZIP contiene datos del negocio (tratarlo como sensible).

### 16.15 Restauración
* **Módulos:** backups. **Rutas:** `POST /backups/soporte/restaurar`.
* **Capas:** `backups.service.js` (`restaurarBackupDesdeArchivo`), `app.js`/`electron/main.js`
  (reinicio).
* **Tablas:** base completa + archivos; limpia `sesiones_http`.
* **Riesgo:** **alto** — sobrescribe la base activa. Ver **sección 20**.

### 16.16 Licencia local
* **Módulos:** licencia-local. **Rutas:** `GET /licencia`, `GET|POST /licencia/activar`.
* **Capas:** `licenciaLocal.service.js`, `huellaEquipo.service.js`, `licenciaFirma.service.js`.
* **Tablas:** `licencia_local`.
* **Riesgo:** no generar claves ni alterar la licencia. Ver **sección 21**.

---

## 17. Flujo técnico de ventas

Base: `ventas.service.js` y `ventas.repository.js` (confirmado en mapa, sección 9).

1. **Búsqueda de producto:** `GET /ventas/productos/buscar` y `GET /ventas/productos/:id`
   (también `GET /ventas/clientes/buscar`).
2. **Preparación del producto para venta** (`prepararProductoParaVenta`): normaliza stock,
   banderas y costos. **Costo de referencia** por prioridad:
   ```txt
   precio_costo_referencia = costo_promedio || ultimo_costo || precio_costo
   ```
3. **Cálculo de línea** (`calcularLineaVenta`):
   * `precio_unitario_neto = precio_unitario − descuento_unitario` (descuento ≥ 0 y ≤ precio).
   * `bruto_linea = redondear(precio_unitario_neto × cantidad)`.
4. **IVA** (si `maneja_iva = 1` y `porcentaje_iva > 0`):
   * **Precio incluye IVA:** `subtotal = redondear(bruto / (1 + tasa))`,
     `impuesto = bruto − subtotal`, `total_linea = bruto`.
   * **Precio NO incluye IVA:** `subtotal = bruto`, `impuesto = redondear(subtotal × tasa)`,
     `total_linea = subtotal + impuesto`.
   * **Sin IVA / `porcentaje_iva = 0`:** `subtotal = bruto`, `impuesto = 0`,
     `total_linea = bruto` (lo que vale 0 es el IVA, **no** el subtotal).
5. **Descuento:** unitario por línea; el `descuento_total` de la venta = `Σ (descuento_unitario × cantidad)`.
6. **Costo de línea:** `costo_total = redondear(precio_costo_referencia × cantidad)`.
7. **Utilidad:** `utilidad_bruta_linea = subtotal_linea − costo_total_linea` (sobre subtotal
   sin IVA). La venta guarda `total_costo` (Σ costos) y `utilidad_bruta` (Σ utilidades).
8. **Pagos:** uno o varios medios (`pagos_venta`, `medios_pago`); soporta pago mixto;
   `cambio_entregado` para efectivo (fórmula exacta de cabecera: **Pendiente de confirmar**).
9. **Movimiento de inventario:** descuenta stock con `movimientos_inventario`.
10. **Movimiento de caja:** registra el ingreso en `movimientos_caja` del turno abierto.
11. **Ticket:** `GET /ventas/:id/ticket` (vista `ticket.ejs`).
12. **Historial:** `GET /ventas/historial`, detalle en `GET /ventas/:id`.
13. **Anulación** (`anularVentaCompleta`, transacción atómica): venta → `estado = 'anulada'`
    (con `anulado_en`, `anulado_por`, `motivo_anulacion`), registro en `anulaciones_venta`,
    **revierte inventario** (`movimientos_inventario` tipo `anulacion_venta`), **revierte caja**
    (`movimientos_caja` tipo `anulacion` + ajuste de `turnos_caja`), `pagos_venta` → `anulado`,
    y traza en `auditoria`.
14. **Nota crédito interna:** la anulación **genera** una nota en `notas_credito` +
    `detalle_notas_credito` (`origen = 'anulacion_venta'`, `tipo_nota = 'total'`,
    `estado = 'emitida'`, `documento_fiscal_estado = 'interno'`).

**Puntos de riesgo:** requiere turno de caja abierto; la venta toca stock y caja a la vez;
la anulación es una transacción que revierte varios módulos — debe mantenerse atómica.

---

## 18. Flujo técnico de caja

Base: `caja.service.js`, `caja.repository.js`. Tablas: `turnos_caja`, `movimientos_caja`,
`pagos_venta`, `gastos`.

* **Apertura:** `GET|POST /caja/abrir` — crea turno con **base inicial**.
* **Movimientos manuales:** `GET|POST /caja/movimiento` — ingresos/egresos manuales.
* **Gastos:** `GET|POST /caja/gasto` — gasto con categoría (`gastos`, `categorias_gasto`).
* **Ventas asociadas:** las ventas del turno alimentan `movimientos_caja`.
* **Pagos por medios:** el turno acumula `total_efectivo`, `total_transferencia`,
  `total_tarjeta`, `total_otros`.
* **Cierre:** `GET|POST /caja/cerrar` — calcula totales y diferencias.
* **Monto esperado / contado / diferencia:** el cierre compara el **monto esperado**
  (base + ventas + ingresos − egresos) con el **monto contado** y registra la **diferencia**.
* **Impresión/exportación:** `GET /caja/turnos/:id/imprimir`, `GET /caja/turnos/:id/excel`,
  detalle en `GET /caja/turnos/:id`.
* **Reparación de turnos:** `npm run db:repair:turnos` (`reparar-turnos-caja.js`) **modifica
  datos** — **(delicado)**: usar solo con backup y en caso real.

**Puntos de riesgo:** un cierre mal hecho o una venta sin turno abierto descuadra la caja;
la reparación de turnos debe documentarse caso a caso.

---

## 19. Flujo técnico de compras e inventario

Base: `compras.service.js`, `compras.repository.js`. Tablas: `compras`, `compras_detalle`,
`pagos_compras_proveedores`, `movimientos_inventario`, `productos`.

1. **Registro de compra:** `POST /compras` con proveedor, detalle y vencimiento.
2. **Detalle de compra:** cada línea guarda cantidad, costo y traza de costos.
3. **Costo unitario:** costo base de la línea.
4. **IVA de compra (si aplica):** se considera para el costo final (`iva_linea`,
   `iva_unitario`).
5. **Costo unitario final** (`costo_unitario_final`): costo neto + IVA según configuración.
6. **Actualización de `ultimo_costo`:** el producto toma `ultimo_costo = costo_unitario_final`.
7. **Actualización de `costo_promedio`** (promedio ponderado), para producto con control de
   inventario y `stock_nuevo > 0`:
   ```txt
   valor_inventario_anterior = stock_anterior × costo_promedio_anterior
   valor_compra              = cantidad × costo_unitario_final
   costo_promedio_nuevo      = redondear((valor_inventario_anterior + valor_compra) / stock_nuevo)
   ```
   Si no controla inventario o `stock_nuevo ≤ 0`: `costo_promedio_nuevo = costo_unitario_final`.
   El detalle guarda la traza (`ultimo_costo_anterior`, `costo_promedio_anterior`,
   `costo_promedio_nuevo`).
8. **Movimiento de inventario:** la compra **suma stock** vía `movimientos_inventario`.
9. **Cuentas por pagar:** saldos pendientes derivados de la compra (estado de pago).
10. **Pagos a proveedores:** `POST /compras/:id/pagos` (y anulación de pago
    `POST /compras/:id/pagos/:idPago/anular`), registrados en `pagos_compras_proveedores`.

**Puntos de riesgo:** una compra cambia el costo del producto (afecta utilidad de ventas
futuras). Las cuentas por pagar avanzadas son un pendiente de producto.

---

## 20. Backups y restauración

Base: `backups.routes.js`, `backups.controller.js`, `backups.service.js`, `src/app.js`,
`electron/main.js`. Vistas `backups/index.ejs` y `soporte.ejs`.

* **Modo soporte:** acceso protegido; requiere rol **administrador** + **modo soporte
  desbloqueado** (`requiereSoporteBackups`).
* **Clave de soporte:** `SUPPORT_BACKUP_KEY` (auto-generada por instalación si está vacía).
  `POST /backups/soporte/desbloquear`, `POST /backups/soporte/cerrar`.
* **Crear backup:** `POST /backups/soporte/crear` (genera ZIP de datos del negocio).
* **Descargar backup:** `GET /backups/soporte/descargar/:archivo`.
* **Abrir carpeta:** `POST /backups/soporte/abrir-carpeta`.
* **Endpoint de restauración:**

```txt
POST /backups/soporte/restaurar
```

* **`multer`:** recibe el ZIP por el campo **`archivo_backup`** (límite **1 GB**).
* **`confirmar_restauracion=1`:** obligatorio; si falta el archivo o la confirmación, **rechaza
  y borra el ZIP temporal**.
* **Validación ZIP:** `validarYExtraerBackup` valida y extrae el ZIP.
* **Manifest:** `validarManifestBackup` valida el manifiesto del backup.
* **Validación SQLite:** `validarBaseSQLite` valida la base restaurada.
* **Backup de emergencia:** `crearBackupEmergenciaRestauracion` (carpeta `backups/emergencia`,
  prefijo `prismia-backup-emergencia-restauracion`). Si falla, **se aborta** la restauración.
* **Limpieza de sesiones:** `limpiarSesionesHttpRestauradas` → `DELETE FROM sesiones_http`.
* **Reinicio en Electron:** marca `restauracionPendiente` y relanza el proceso
  (`prismia:reinicio-solicitado` → `relanzarAplicacionPorRestauracion`).
* **Reinicio en desarrollo:** escribe `src/restart-dev-trigger.json` para que **nodemon**
  reinicie.
* **Ruta interna:** `GET /__restauracion-finalizada` (solo local + administrador).

**Riesgos:** la restauración **sobrescribe la base activa**; por eso exige confirmación, crea
backup de emergencia y reinicia de forma controlada.

**Checklist antes de restaurar:**

```txt
[ ] Confirmar que el ZIP corresponde al negocio correcto.
[ ] Verificar que existe espacio en disco.
[ ] Tener a mano la ubicación del backup de emergencia (backups/emergencia).
[ ] Marcar confirmar_restauracion = 1 conscientemente.
[ ] Avisar al usuario que la app se reiniciará.
[ ] Tras reiniciar, validar login y datos clave (ventas/caja recientes).
[ ] No restaurar en esta tanda documental (solo se documenta).
```

---

## 21. Licenciamiento local

Base: módulo `licencia-local`. Lógica en `licenciaLocal.service.js`, `huellaEquipo.service.js`,
`licenciaFirma.service.js`; config en `licencia-comercial.js` y `licencia-public-key.js`.
Tabla `licencia_local` (migraciones 038–040).

* **Estados** (`ESTADOS_OPERATIVOS`): `prueba`, `activa`, `gracia`, `vencida`, además de
  `sin_registro`, `reloj_manipulado`, `bloqueada`.
* **Días de prueba:** `dias_prueba` (por defecto **30** según el código:
  `Number(licencia.dias_prueba || 30)`).
* **Días de gracia:** `dias_gracia` configurable (periodo posterior al vencimiento para
  renovar).
* **Activación:** `GET /licencia/activar` (formulario) y `POST /licencia/activar` (solo
  administrador) procesan el **código de activación**.
* **Código de activación:** se valida con firma + clave pública.
* **Huella del equipo:** `huellaEquipo.service.js` genera el identificador del equipo; se
  incluye en el mensaje de renovación.
* **Firma:** `licenciaFirma.service.js` + `licencia-public-key.js` validan la firma del código.
* **Clave pública:** `src/config/licencia-public-key.js`.
* **Clave privada (sensible):** `tools/licencias/private/` — **no se toca ni se comparte**.
* **WhatsApp de renovación:** `licencia-comercial.js` arma una URL `https://wa.me/<numero>`
  con datos del negocio y la huella (número de activación confirmado en el mapa:
  `573215394234`).
* **Middleware de licencia:** `requiereLicenciaOperativa` bloquea las rutas operativas cuando
  la licencia no es válida.
* **Pantalla vencida:** `views/licencia/vencida.ejs`.
* **Protección anti-manipulación de reloj:** estado `reloj_manipulado` con tolerancia
  (`toleranciaHoras = 6`).
* **Auditoría de licencia:** `npm run licencia:audit` (`audit-licencia.js`).

> **No generar claves reales ni modificar la licencia** en esta tanda.

---

## 22. Seguridad y archivos sensibles

Archivos y carpetas sensibles (no compartir, no versionar, no modificar sin cuidado):

| Elemento | Por qué es sensible |
|---|---|
| `.env` | Variables y posibles secretos de entorno. |
| `storage/` | Datos runtime / backups en algunos entornos. |
| `certs/` | Certificados HTTPS locales. |
| `src/database/data/` | Base de datos local de desarrollo. |
| `tools/licencias/private/` | **Clave privada** de licenciamiento. |
| Backups (`.zip`) | Contienen datos completos del negocio. |
| Bases SQLite (`.sqlite`, `.sqlite-wal`, `.sqlite-shm`) | Datos reales del negocio. |
| Claves privadas | Comprometen la firma de licencias. |
| Certificados | Comprometen el HTTPS local. |
| `config/secretos.local.json` | Secretos runtime por instalación. |

**Reglas (de `README.md`):**

* **No compartir el ZIP completo del proyecto** sin limpiar archivos sensibles.
* Para cliente piloto se entrega **solo el instalador** (`Prismia POS Local Setup 1.0.0.exe`),
  nunca el repositorio, `.env`, base de desarrollo, backups de prueba, certificados ni
  secretos runtime.
* Git debe ignorar: `node_modules/`, `.env`, `dist/`, `storage/runtime/`, `storage/backups/`,
  `src/database/data/`, `certs/`, archivos SQLite, temporales, certificados y secretos.
* No usar `git add .`; usar `git add` con archivos específicos.

---

## 23. Empaquetado e instalación

* **Empaquetador:** `electron-builder` (instalador **NSIS** para Windows).
* **Generar versión desempaquetada:** `npm run pack:dir` → `dist/win-unpacked/Prismia POS Local.exe`.
* **Generar instalador:** `npm run dist:win` → `dist/Prismia POS Local Setup 1.0.0.exe`.
* **Validación pre-Electron:** `npm run check:pre-electron` (BD válida + sin secretos/SQLite/
  backups/certs versionados).
* **Íconos:** `build/icon.ico`, `build/icon.png` (mantener versionados aunque `build/` esté
  parcialmente ignorada; usar `git add -f` si Git los ignora).
* **AppData:** la instalación crea su propio entorno de datos en
  `C:\Users\USUARIO\AppData\Roaming\Prismia POS Local`.
* **Conservación de datos tras desinstalar:** **confirmado en `README.md`** — desinstalar
  elimina la app **pero no borra los datos del negocio** (quedan en AppData). Solo se borra
  manualmente si el cliente pide limpieza total o soporte hace reinstalación desde cero.
* **Electron fijo:** `electron@37.10.3` (compatibilidad con `better-sqlite3`).
* **Problema conocido winCodeSign:** si `electron-builder` falla con errores de enlaces
  simbólicos, abrir la terminal como administrador, limpiar caché y reintentar:
  ```powershell
  Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\nsis" -ErrorAction SilentlyContinue
  npm run pack:dir
  npm run dist:win
  ```

**Checklist básico antes de generar instalador:**

```txt
[ ] git status limpio (sin cambios sucios sin querer).
[ ] npm run check:pre-electron en verde.
[ ] Sin secretos / SQLite / backups / certs versionados.
[ ] Íconos build/icon.ico y build/icon.png presentes.
[ ] Versión visible correcta (1.0.0).
[ ] Probar dist/win-unpacked antes de distribuir el Setup.
```

---

## 24. Auditoría y validación

| Script | Tipo |
|---|---|
| `npm run db:validate` (`validate-db.js`) | **Solo lectura** — valida estructura/semillas. |
| `npm run check:pre-electron` (`verificar-pre-electron.js`) | **Solo lectura** — valida BD + ausencia de sensibles versionados. |
| `npm run check:runtime` (`diagnostico-runtime.js`) | **Solo lectura** — diagnóstico de rutas/entorno. |
| `src/database/tools/auditar-estructura-bd.js` | **Solo lectura** — auditoría de estructura. |
| `npm run db:audit:contable` (`audit-contable.js`) | **Delicado (lectura sensible)** — revisa cuadres de ventas. |
| `npm run licencia:audit` (`audit-licencia.js`) | **Delicado (lectura sensible)** — auditoría de licencia. |
| `npm run db:repair:turnos` (`reparar-turnos-caja.js`) | **Delicado — MODIFICA DATOS.** |

Resumen:

```txt
Solo lectura:        db:validate, check:pre-electron, check:runtime, auditar-estructura-bd
Delicados / modifican datos: db:repair:turnos, db:migrate:*, demo:reset
Delicados (lectura sensible): db:audit:contable, licencia:audit
```

---

## 25. Checklist antes de instalar a cliente

> Solo documentación. **No ejecutar comandos en esta tanda.**

```txt
[ ] Revisar git status (sin cambios sucios).
[ ] Confirmar que no hay cambios sin commitear que no correspondan.
[ ] Correr validaciones SEGURAS (solo lectura): check:pre-electron, db:validate, check:runtime.
[ ] Revisar .env.example (variables al día; sin secretos reales en el repo).
[ ] Revisar que NO se empaqueten claves privadas (tools/licencias/private/).
[ ] Revisar que NO se empaque la base de datos de desarrollo (src/database/data/).
[ ] Revisar estado de licencia (sin generar claves reales).
[ ] Probar login.
[ ] Probar productos (crear/editar, imagen).
[ ] Probar una venta (POS) y su ticket.
[ ] Probar apertura y cierre de caja.
[ ] Probar crear un backup.
[ ] Probar el instalador (dist:win) en equipo de prueba.
[ ] Verificar AppData (datos en C:\Users\USUARIO\AppData\Roaming\Prismia POS Local).
[ ] Verificar que NO haya doble instancia abierta antes de iniciar.
[ ] Documentar el riesgo EADDRINUSE (puerto 3210) hasta que exista parche.
```

---

## 26. Pendientes técnicos

Confirmados en el mapa documental y/o `README.md`:

* **Manejo de doble instancia en Electron** (`requestSingleInstanceLock`).
* **Captura de `EADDRINUSE`** al iniciar el servidor.
* **Mensaje amigable** de "puerto ocupado" (en vez del error crudo de JavaScript) y enfocar la
  ventana existente.
* **Facturación electrónica DIAN.**
* **Sistema de licencias avanzado / panel remoto.**
* **Actualizador automático.**
* **Firma comercial del instalador.**
* **Migraciones automáticas al iniciar.**
* **Cuentas por pagar avanzadas.**
* **Pulido visual avanzado.**
* Otros del `README.md` no bloqueantes: PWA, app móvil separada, dashboard móvil,
  notificaciones de compras próximas a vencer, auditoría avanzada de soporte, certificados
  HTTPS automáticos para móviles.
* **Contable:** `cambio_entregado` a nivel de cabecera — **Pendiente de confirmar** la fórmula
  exacta en pagos mixtos/efectivo.

---

## 27. Glosario técnico

| Término | Definición breve |
|---|---|
| **Electron** | Framework para apps de escritorio con tecnologías web; aquí abre la ventana y arranca el backend. |
| **Express** | Framework web de Node.js; sirve rutas y vistas del servidor local. |
| **EJS** | Motor de plantillas; genera el HTML de las vistas en el servidor. |
| **SQLite** | Base de datos en un solo archivo local, sin servidor externo. |
| **better-sqlite3** | Librería nativa para usar SQLite desde Node de forma síncrona. |
| **repository** | Capa de acceso a datos: SQL y transacciones. |
| **service** | Capa de reglas de negocio: validaciones y cálculos. |
| **controller** | Capa que recibe el request y produce la respuesta (render/redirect). |
| **middleware** | Función intermedia en Express (auth, roles, licencia, errores). |
| **runtime** | Lo que ocurre/usa la app en ejecución real (rutas, datos, secretos). |
| **AppData** | Carpeta del usuario en Windows donde viven los datos del negocio en producción. |
| **backup** | Copia ZIP de los datos del negocio. |
| **migración** | Script que cambia estructura/datos de la base de forma versionada. |
| **licencia local** | Mecanismo de licenciamiento que vive en el equipo (tabla `licencia_local`). |
| **huella de equipo** | Identificador único del equipo usado para activar/renovar la licencia. |
| **costo promedio** | Costo del producto calculado como promedio ponderado al comprar. |
| **auditoría contable** | Revisión (solo lectura) que verifica que las ventas cuadren contra su detalle. |

---

## 28. Estado del documento

* **Documento:** Guía técnica interna de Prismia POS Local.
* **Versión inicial:** `0.1`.
* **Basado en:**

```txt
docs/manuales/00_MAPA_DOCUMENTAL_PRISMIA.md
```

  (mapa documental, versión `0.1 ajustada`) y `README.md`.
* **Fecha de creación:** 2026-06-24.
* **Alcance:** esta guía **no reemplaza** el `README.md` ni las auditorías técnicas; las
  **organiza** para soporte y mantenimiento. Las secciones marcadas como **Pendiente de
  confirmar** deben resolverse con inspección detallada antes de cerrar la versión definitiva.
* **Regla de la tanda:** solo documentación dentro de `docs/manuales/`; no se modificó código,
  base de datos, migraciones, `.env`, `storage/`, `certs/` ni claves.

---

*Fin de la Guía técnica interna de Prismia POS Local (versión `0.1`).*
