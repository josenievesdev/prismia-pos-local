Prismia POS Local

Sistema de punto de venta de escritorio para pequeños y medianos negocios.

Prismia POS Local permite gestionar ventas, caja, inventario, compras, clientes, proveedores y documentos comerciales desde una aplicación local para Windows, sin depender de una conexión permanente a internet ni de un servidor externo de base de datos.

Estado actual: V1 funcional en cierre pre-piloto, preparada para pruebas reales controladas.

Vista del producto

Las capturas del producto se agregarán en esta sección.

<!--
Ejemplo de estructura recomendada:

<p align="center">
  <img src="docs/images/dashboard.png" width="48%" alt="Dashboard de Prismia POS">
  <img src="docs/images/pos.png" width="48%" alt="Punto de venta de Prismia POS">
</p>

<p align="center">
  <img src="docs/images/inventario.png" width="48%" alt="Inventario de Prismia POS">
  <img src="docs/images/caja.png" width="48%" alt="Caja de Prismia POS">
</p>
-->

¿Qué permite hacer?

Registrar ventas desde un POS pensado para uso táctil.

Abrir, operar y cerrar caja.

Gestionar productos, categorías, precios, impuestos y códigos internos.

Controlar inventario, stock mínimo, ajustes y conteos físicos.

Registrar compras y administrar proveedores.

Administrar clientes.

Crear cotizaciones, remisiones y notas crédito.

Consultar reportes operativos.

Importar y exportar información mediante Excel.

Generar tickets de venta.

Crear y restaurar backups de forma controlada.

Instalar la aplicación en Windows mediante un instalador NSIS.

Conservar los datos del negocio incluso después de desinstalar la aplicación.

Stack técnico

Área

Tecnologías

Backend

Node.js, Express

Frontend

EJS, JavaScript, CSS

Base de datos

SQLite, better-sqlite3

Desktop

Electron

Empaquetado

electron-builder, NSIS

Sesiones y archivos

express-session, multer

Importación / exportación

xlsx

Control de versiones

Git, GitHub

SQLite permite que Prismia funcione de manera local sin exigir al negocio una instalación adicional de MySQL, PostgreSQL u otro servidor de base de datos.

Sobre el proyecto

Prismia nació como un proyecto personal orientado a construir una solución de punto de venta que pudiera evolucionar hacia un producto distribuible para pequeños negocios.

El desarrollo no se limitó al flujo de ventas. También abarcó lógica de inventario y caja, persistencia local, backups y restauración, configuración inicial, empaquetado con Electron, instalación en Windows y conservación de los datos del negocio.

La prioridad de esta V1 es validar estabilidad, seguridad de los datos y funcionamiento de los procesos principales antes de ampliar el producto con nuevas funcionalidades.

Desarrollado por José Carlos Nieves Iguarán.

Estado actual

Prismia POS Local se encuentra en fase de cierre pre-piloto.

Los principales bloques funcionales ya fueron validados:

Instalación limpia desde instalador Windows.

Configuración inicial mediante /setup.

Creación del primer administrador.

Configuración del negocio.

Productos y categorías.

Inventario.

Compras.

Ventas / POS.

Caja.

Clientes.

Proveedores.

Cotizaciones.

Remisiones.

Notas crédito.

Reportes.

Backups.

Restauración controlada.

Ticket de venta.

POS táctil en Electron.

Ícono de aplicación e instalador.

Política de desinstalación conservando datos del negocio.

Arquitectura en pocas palabras

Prismia mantiene una separación modular de responsabilidades:

repository = SQL, acceso a datos y transacciones
service    = reglas de negocio, validaciones y cálculos
controller = request / response
routes     = rutas Express
views      = vistas EJS
CSS        = estilos globales o por módulo
JS público = interacción frontend

La documentación técnica completa se mantiene a continuación.

Documentación técnica

Arquitectura del proyecto

La arquitectura debe mantenerse modular.

Regla general:

repository = SQL, acceso a datos y transacciones
service    = reglas de negocio, validaciones y cálculos
controller = request / response
routes     = rutas Express
views      = vistas EJS
CSS        = global o por módulo
JS público = interacción frontend

No se debe mezclar:

SQL en vistas.

Reglas de negocio en EJS.

Lógica pesada en controllers.

Refactors innecesarios durante pruebas finales.

Cambios grandes sin validación módulo por módulo.

Estructura general

electron/
  main.js

src/
  config/
  database/
    data/
    migrations/
    schema.sql
    validate-db.js
  middlewares/
  modules/
    auth/
    backups/
    caja/
    categorias/
    clientes/
    compras/
    configuracion/
    cotizaciones/
    dashboard/
    inventario/
    notas-credito/
    productos/
    proveedores/
    remisiones/
    reportes/
    ventas/
  public/
    css/
    js/
    uploads/
  views/

build/
  icon.ico
  icon.png

dist/

Requisitos para desarrollo

Recomendado:

Windows 10 o Windows 11.

Node.js LTS.

Git.

PowerShell.

Antigravity, VS Code u otro editor.

Permisos de administrador para empaquetar si Electron Builder falla con enlaces simbólicos.

En este proyecto Electron está fijado en:

electron@37.10.3

Se mantiene fijo por compatibilidad con better-sqlite3.

Instalación de dependencias

Después de clonar el repositorio:

npm ci

Si se cambió de computador o se reinstaló Node, reconstruir dependencias nativas:

npm run native:node

Para Electron:

npm run native:electron

Scripts principales

npm run dev

Levanta Prismia en modo desarrollo con Express y Nodemon.

npm run dev:https

Levanta Prismia en modo desarrollo usando HTTPS local.

npm run electron

Ejecuta Prismia en Electron.

npm run check:pre-electron

Valida base de datos y revisa que no se estén versionando secretos, bases locales, backups o certificados sensibles.

npm run pack:dir

Genera versión desempaquetada en dist/win-unpacked.

npm run dist:win

Genera instalador NSIS para Windows.

Validación pre-Electron

Antes de empaquetar, ejecutar:

npm run check:pre-electron

Debe confirmar:

Base de datos válida.

Tablas críticas existentes.

Columnas críticas existentes.

Semillas mínimas existentes.

Sin secretos versionados.

Sin bases SQLite versionadas.

Sin backups versionados.

Sin certificados versionados.

Empaquetado

Para generar la versión instalable:

npm run pack:dir
npm run dist:win

El instalador se genera en:

dist/Prismia POS Local Setup 1.0.0.exe

La versión desempaquetada queda en:

dist/win-unpacked/Prismia POS Local.exe

Si Electron Builder falla en Windows con errores de enlaces simbólicos relacionados con winCodeSign, abrir la terminal o el editor como administrador, limpiar caché y volver a ejecutar:

Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\nsis" -ErrorAction SilentlyContinue

npm run pack:dir
npm run dist:win

Flujo de instalación para piloto

Al instalar Prismia por primera vez, el sistema debe llevar a la pantalla de configuración inicial:

/setup

Desde ahí se crea el primer administrador.

Flujo mínimo esperado:

Instalar Prismia.

Abrir la aplicación.

Crear primer administrador.

Iniciar sesión.

Configurar datos del negocio.

Crear categoría.

Crear producto.

Abrir caja.

Realizar venta.

Ver ticket.

Cerrar caja.

Crear backup.

Ruta de datos en producción

En instalación real, Prismia guarda los datos del negocio en:

C:\Users\USUARIO\AppData\Roaming\Prismia POS Local

En esa carpeta viven los datos runtime:

database/
config/
backups/
uploads/

El archivo de secretos runtime se genera automáticamente por instalación:

config/secretos.local.json

Si SESSION_SECRET o SUPPORT_BACKUP_KEY están vacíos en .env, Prismia genera valores únicos por instalación.

Política de desinstalación

Desinstalar Prismia POS Local elimina la aplicación, pero no borra los datos del negocio.

La información queda conservada en:

C:\Users\USUARIO\AppData\Roaming\Prismia POS Local

Esa carpeta solo debe borrarse manualmente si el cliente solicita una limpieza total o si soporte realiza una reinstalación controlada desde cero.

Backups y restauración

Prismia cuenta con sistema de backups y restauración controlada.

La restauración:

Valida el backup.

Crea backup de emergencia antes de restaurar.

Restaura base de datos.

Restaura archivos asociados.

Limpia sesiones restauradas.

Reinicia la aplicación cuando corresponde.

En desarrollo, puede usarse un archivo de reinicio técnico temporal. Ese archivo no debe versionarse.

Variables de entorno

El archivo base es:

.env.example

Para desarrollo se puede crear:

.env

El archivo .env real no debe subirse al repositorio.

Variables importantes:

APP_NAME
APP_PORT
NODE_ENV

DB_CLIENT
DB_NAME
DB_PATH

PRISMIA_DATA_DIR

SESSION_SECRET
SUPPORT_BACKUP_KEY

BACKUP_BASE_DIR
BACKUP_EXTERNAL_PATH

HTTPS_PORT
PRISMIA_HTTPS_CERT_DIR
PRISMIA_HTTPS_KEY
PRISMIA_HTTPS_CERT

En producción instalada, si PRISMIA_DATA_DIR queda vacío, Prismia usa una carpeta segura del usuario en AppData.

Seguridad y archivos que no deben compartirse

No se debe compartir externamente el ZIP completo del proyecto.

Puede contener datos sensibles o locales como:

.env

bases SQLite

archivos .sqlite-wal

archivos .sqlite-shm

backups

certificados locales

secretos runtime

archivos temporales

datos de prueba

Para cliente piloto se debe entregar únicamente:

dist/Prismia POS Local Setup 1.0.0.exe

Archivos ignorados por Git

El repositorio debe ignorar:

node_modules/

.env

dist/

storage/runtime/

storage/backups/

src/database/data/

certs/

archivos SQLite

archivos temporales

certificados

secretos runtime

La carpeta build/ está ignorada por defecto, pero los archivos del ícono deben mantenerse versionados:

build/icon.ico
build/icon.png

Si Git los ignora al agregarlos, usar:

git add -f build/icon.ico
git add -f build/icon.png

Ícono y branding

Prismia usa un ícono tipo prisma basado en tres piezas geométricas:

blanco

turquesa

azul

Archivos:

build/icon.ico
build/icon.png

Estos archivos se usan para:

ejecutable

instalador

acceso directo

barra de tareas

Módulos funcionales

Autenticación

Login.

Logout.

Sesiones persistentes.

Roles.

Protección de rutas.

Dashboard

Vista general del sistema.

Accesos principales.

Estado operativo.

Configuración

Datos del negocio.

Moneda.

Mensaje de recibo.

Información usada en tickets y documentos.

Productos

Crear, listar y editar productos.

Categorías.

Unidades de medida.

Stock.

Costo.

Precio de venta.

IVA de venta.

Precio con IVA incluido o sin incluir.

Imagen de producto.

Código interno.

Código de barras / SKU.

Regla actual de IVA:

19 = 19%
5 = 5%
0 = sin IVA

Ya no se usa:

1900 = 19%

Inventario

Stock actual.

Stock mínimo.

Ajustes manuales.

Historial.

Conteos físicos.

Diferencias de conteo.

Exportación e importación Excel.

Reporte operativo.

Valoración comercial.

Caja

Apertura de caja.

Base inicial.

Movimientos.

Métodos de pago.

Cierre.

Diferencias.

Relación con ventas.

Ventas / POS

POS táctil.

Búsqueda de productos.

Carrito.

Métodos de pago.

Pago mixto.

Ticket.

Historial de ventas.

Cálculo correcto de subtotal, IVA y total.

Compras

Registro de compras.

Proveedores.

Detalle de compra.

Estados de pago.

Saldos pendientes.

Abonos.

Base futura para cuentas por pagar.

Clientes y proveedores

Administración básica.

Relación con ventas, compras y documentos.

Cotizaciones

Creación y consulta.

Documento comercial previo a venta.

Remisiones

Creación y consulta.

Soporte para entrega o despacho.

Notas crédito

Creación y consulta.

Relación con ventas según flujo comercial.

Backups

Creación de backups.

Restauración controlada.

Validación antes de restaurar.

Backup de emergencia previo a restauración.

Estado de QA

Se consideran suficientemente validados para V1 piloto:

Dashboard.

Configuración.

Productos.

Categorías.

Inventario.

Compras.

Ventas / POS.

Caja.

Clientes.

Proveedores.

Cotizaciones.

Remisiones.

Notas crédito.

Reportes.

Backups.

Restauración.

Ticket.

Instalador.

Desinstalación conservando datos.

Ícono y metadatos base.

Pendientes no bloqueantes para después del piloto

No bloquean la V1 piloto:

Facturación electrónica DIAN.

Sistema de licencias avanzado.

Actualizador automático.

Firma comercial del instalador.

PWA.

App móvil separada.

Dashboard móvil.

Cuentas por pagar avanzadas.

Notificaciones de compras próximas a vencer.

Auditoría avanzada de soporte.

Bloqueo de instancia única Electron.

Migraciones automáticas al iniciar.

Certificados HTTPS automáticos para móviles.

Pulido visual avanzado.

Comandos útiles

Validar estado de Git:

git status

Validar base de datos y pre-Electron:

npm run check:pre-electron

Ejecutar desarrollo:

npm run dev

Ejecutar Electron:

npm run electron

Liberar puerto interno de Electron:

Get-NetTCPConnection -LocalPort 3210 -ErrorAction SilentlyContinue |
ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force
}

Empaquetar:

npm run pack:dir
npm run dist:win

Convenciones de trabajo del proyecto

Trabajar módulo por módulo.

No hacer refactors innecesarios.

No usar git add ..

Usar git add con archivos específicos.

No subir dist.

No subir bases SQLite.

No subir backups.

No subir .env.

No subir certificados.

No entregar ZIP completo del proyecto a clientes.

Probar cada cambio antes de avanzar.

Mantener la base de datos en español.

Mantener la arquitectura modular.

Entrega a cliente piloto

Para un cliente piloto se entrega:

Prismia POS Local Setup 1.0.0.exe

No se entrega:

repositorio completo

ZIP del proyecto

.env

base de datos de desarrollo

backups de prueba

certificados locales

secretos runtime

La instalación debe crear su propio entorno en AppData y su propia configuración inicial.

Estado de la V1

Prismia POS Local V1 queda listo para prueba piloto controlada.

La prioridad de esta etapa es estabilidad, datos seguros, ventas correctas, caja confiable, inventario usable, backups/restauración funcionales y una instalación limpia para cliente real.
