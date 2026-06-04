# Prismia POS Local

**Prismia POS Local** es un sistema POS local para pequeños y medianos negocios, desarrollado por **Nieves Systems**.

El objetivo de Prismia es permitir que un negocio pueda operar ventas, caja, inventario, compras, clientes, proveedores, documentos comerciales, reportes y backups desde una aplicación local, sin depender inicialmente de servidores externos ni instalaciones complejas de base de datos.

Esta versión corresponde a una **V1 piloto funcional**, preparada para pruebas reales controladas en negocios pequeños.

---

## Estado actual

Prismia POS Local se encuentra en fase de cierre pre-piloto.

Ya fueron validados los bloques principales:

* Instalación limpia desde instalador Windows.
* Primer inicio desde `/setup`.
* Creación del primer administrador.
* Configuración del negocio.
* Productos y categorías.
* Inventario.
* Compras.
* Ventas / POS.
* Caja.
* Clientes.
* Proveedores.
* Cotizaciones.
* Remisiones.
* Notas crédito.
* Reportes.
* Backups.
* Restauración controlada.
* Ticket de venta.
* POS táctil en Electron.
* Ícono de aplicación e instalador.
* Política de desinstalación conservando datos del negocio.

---

## Stack técnico

El proyecto está construido con:

* Node.js
* Express
* EJS
* SQLite
* better-sqlite3
* express-session
* multer
* xlsx
* Electron
* electron-builder

La base de datos local usa SQLite, lo que permite instalar Prismia sin depender de MySQL, PostgreSQL u otro servidor de base de datos externo.

---

## Arquitectura del proyecto

La arquitectura debe mantenerse modular.

Regla general:

```txt
repository = SQL, acceso a datos y transacciones
service    = reglas de negocio, validaciones y cálculos
controller = request / response
routes     = rutas Express
views      = vistas EJS
CSS        = global o por módulo
JS público = interacción frontend
```

No se debe mezclar:

* SQL en vistas.
* Reglas de negocio en EJS.
* Lógica pesada en controllers.
* Refactors innecesarios durante pruebas finales.
* Cambios grandes sin validación módulo por módulo.

---

## Estructura general

```txt
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
```

---

## Requisitos de desarrollo

Recomendado:

* Windows 10 o Windows 11.
* Node.js LTS.
* Git.
* PowerShell.
* Antigravity, VS Code u otro editor.
* Permisos de administrador para empaquetar si Electron Builder falla con enlaces simbólicos.

En este proyecto Electron está fijado en:

```txt
electron@37.10.3
```

Se mantiene fijo por compatibilidad con `better-sqlite3`.

---

## Instalación de dependencias

Después de clonar el repositorio:

```powershell
npm ci
```

Si se cambió de computador o se reinstaló Node, reconstruir dependencias nativas:

```powershell
npm run native:node
```

Para Electron:

```powershell
npm run native:electron
```

---

## Scripts principales

```powershell
npm run dev
```

Levanta Prismia en modo desarrollo con Express y Nodemon.

```powershell
npm run dev:https
```

Levanta Prismia en modo desarrollo usando HTTPS local.

```powershell
npm run electron
```

Ejecuta Prismia en Electron.

```powershell
npm run check:pre-electron
```

Valida base de datos y revisa que no se estén versionando secretos, bases locales, backups o certificados sensibles.

```powershell
npm run pack:dir
```

Genera versión desempaquetada en `dist/win-unpacked`.

```powershell
npm run dist:win
```

Genera instalador NSIS para Windows.

---

## Validación pre-Electron

Antes de empaquetar, ejecutar:

```powershell
npm run check:pre-electron
```

Debe confirmar:

* Base de datos válida.
* Tablas críticas existentes.
* Columnas críticas existentes.
* Semillas mínimas existentes.
* Sin secretos versionados.
* Sin bases SQLite versionadas.
* Sin backups versionados.
* Sin certificados versionados.

---

## Empaquetado

Para generar la versión instalable:

```powershell
npm run pack:dir
npm run dist:win
```

El instalador se genera en:

```txt
dist/Prismia POS Local Setup 1.0.0.exe
```

La versión desempaquetada queda en:

```txt
dist/win-unpacked/Prismia POS Local.exe
```

Si Electron Builder falla en Windows con errores de enlaces simbólicos relacionados con `winCodeSign`, abrir la terminal o el editor como administrador, limpiar caché y volver a ejecutar:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\nsis" -ErrorAction SilentlyContinue

npm run pack:dir
npm run dist:win
```

---

## Instalación en cliente piloto

Al instalar Prismia por primera vez, el sistema debe llevar a la pantalla de configuración inicial:

```txt
/setup
```

Desde ahí se crea el primer administrador.

Flujo mínimo esperado:

1. Instalar Prismia.
2. Abrir la aplicación.
3. Crear primer administrador.
4. Iniciar sesión.
5. Configurar datos del negocio.
6. Crear categoría.
7. Crear producto.
8. Abrir caja.
9. Realizar venta.
10. Ver ticket.
11. Cerrar caja.
12. Crear backup.

---

## Ruta de datos en producción

En instalación real, Prismia guarda los datos del negocio en:

```txt
C:\Users\USUARIO\AppData\Roaming\Prismia POS Local
```

En esa carpeta viven los datos runtime:

```txt
database/
config/
backups/
uploads/
```

El archivo de secretos runtime se genera automáticamente por instalación:

```txt
config/secretos.local.json
```

Si `SESSION_SECRET` o `SUPPORT_BACKUP_KEY` están vacíos en `.env`, Prismia genera valores únicos por instalación.

---

## Política de desinstalación

Desinstalar Prismia POS Local elimina la aplicación, pero **no borra los datos del negocio**.

La información queda conservada en:

```txt
C:\Users\USUARIO\AppData\Roaming\Prismia POS Local
```

Esa carpeta solo debe borrarse manualmente si el cliente solicita una limpieza total o si soporte realiza una reinstalación controlada desde cero.

---

## Backups y restauración

Prismia cuenta con sistema de backups y restauración controlada.

La restauración:

* Valida el backup.
* Crea backup de emergencia antes de restaurar.
* Restaura base de datos.
* Restaura archivos asociados.
* Limpia sesiones restauradas.
* Reinicia la aplicación cuando corresponde.

En desarrollo, puede usarse un archivo de reinicio técnico temporal. Ese archivo no debe versionarse.

---

## Variables de entorno

El archivo base es:

```txt
.env.example
```

Para desarrollo se puede crear:

```txt
.env
```

El archivo `.env` real no debe subirse al repositorio.

Variables importantes:

```txt
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
```

En producción instalada, si `PRISMIA_DATA_DIR` queda vacío, Prismia usa una carpeta segura del usuario en AppData.

---

## Archivos que no deben compartirse

No se debe compartir externamente el ZIP completo del proyecto.

Puede contener datos sensibles o locales como:

* `.env`
* bases SQLite
* archivos `.sqlite-wal`
* archivos `.sqlite-shm`
* backups
* certificados locales
* secretos runtime
* archivos temporales
* datos de prueba

Para cliente piloto se debe entregar únicamente:

```txt
dist/Prismia POS Local Setup 1.0.0.exe
```

---

## Archivos ignorados por Git

El repositorio debe ignorar:

* `node_modules/`
* `.env`
* `dist/`
* `storage/runtime/`
* `storage/backups/`
* `src/database/data/`
* `certs/`
* archivos SQLite
* archivos temporales
* certificados
* secretos runtime

La carpeta `build/` está ignorada por defecto, pero los archivos del ícono deben mantenerse versionados:

```txt
build/icon.ico
build/icon.png
```

Si Git los ignora al agregarlos, usar:

```powershell
git add -f build/icon.ico
git add -f build/icon.png
```

---

## Ícono y branding

Prismia usa un ícono tipo prisma basado en tres piezas geométricas:

* blanco
* turquesa
* azul

Archivos:

```txt
build/icon.ico
build/icon.png
```

Estos archivos se usan para:

* ejecutable
* instalador
* acceso directo
* barra de tareas

---

## Módulos funcionales

### Autenticación

* Login.
* Logout.
* Sesiones persistentes.
* Roles.
* Protección de rutas.

### Dashboard

* Vista general del sistema.
* Accesos principales.
* Estado operativo.

### Configuración

* Datos del negocio.
* Moneda.
* Mensaje de recibo.
* Información usada en tickets y documentos.

### Productos

* Crear, listar y editar productos.
* Categorías.
* Unidades de medida.
* Stock.
* Costo.
* Precio de venta.
* IVA de venta.
* Precio con IVA incluido o sin incluir.
* Imagen de producto.
* Código interno.
* Código de barras / SKU.

Regla actual de IVA:

```txt
19 = 19%
5 = 5%
0 = sin IVA
```

Ya no se usa:

```txt
1900 = 19%
```

### Inventario

* Stock actual.
* Stock mínimo.
* Ajustes manuales.
* Historial.
* Conteos físicos.
* Diferencias de conteo.
* Exportación e importación Excel.
* Reporte operativo.
* Valoración comercial.

### Caja

* Apertura de caja.
* Base inicial.
* Movimientos.
* Métodos de pago.
* Cierre.
* Diferencias.
* Relación con ventas.

### Ventas / POS

* POS táctil.
* Búsqueda de productos.
* Carrito.
* Métodos de pago.
* Pago mixto.
* Ticket.
* Historial de ventas.
* Cálculo correcto de subtotal, IVA y total.

### Compras

* Registro de compras.
* Proveedores.
* Detalle de compra.
* Estados de pago.
* Saldos pendientes.
* Abonos.
* Base futura para cuentas por pagar.

### Clientes y proveedores

* Administración básica.
* Relación con ventas, compras y documentos.

### Cotizaciones

* Creación y consulta.
* Documento comercial previo a venta.

### Remisiones

* Creación y consulta.
* Soporte para entrega o despacho.

### Notas crédito

* Creación y consulta.
* Relación con ventas según flujo comercial.

### Backups

* Creación de backups.
* Restauración controlada.
* Validación antes de restaurar.
* Backup de emergencia previo a restauración.

---

## Estado de QA

Se consideran suficientemente validados para V1 piloto:

* Dashboard.
* Configuración.
* Productos.
* Categorías.
* Inventario.
* Compras.
* Ventas / POS.
* Caja.
* Clientes.
* Proveedores.
* Cotizaciones.
* Remisiones.
* Notas crédito.
* Reportes.
* Backups.
* Restauración.
* Ticket.
* Instalador.
* Desinstalación conservando datos.
* Ícono y metadatos base.

---

## Pendientes no bloqueantes para después del piloto

No bloquean la V1 piloto:

* Facturación electrónica DIAN.
* Sistema de licencias avanzado.
* Actualizador automático.
* Firma comercial del instalador.
* PWA.
* App móvil separada.
* Dashboard móvil.
* Cuentas por pagar avanzadas.
* Notificaciones de compras próximas a vencer.
* Auditoría avanzada de soporte.
* Bloqueo de instancia única Electron.
* Migraciones automáticas al iniciar.
* Certificados HTTPS automáticos para móviles.
* Pulido visual avanzado.

---

## Comandos útiles

Validar estado de Git:

```powershell
git status
```

Validar base de datos y pre-Electron:

```powershell
npm run check:pre-electron
```

Ejecutar desarrollo:

```powershell
npm run dev
```

Ejecutar Electron:

```powershell
npm run electron
```

Liberar puerto interno de Electron:

```powershell
Get-NetTCPConnection -LocalPort 3210 -ErrorAction SilentlyContinue |
ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force
}
```

Empaquetar:

```powershell
npm run pack:dir
npm run dist:win
```

---

## Reglas de trabajo del proyecto

* Trabajar módulo por módulo.
* No hacer refactors innecesarios.
* No usar `git add .`.
* Usar `git add` con archivos específicos.
* No subir `dist`.
* No subir bases SQLite.
* No subir backups.
* No subir `.env`.
* No subir certificados.
* No entregar ZIP completo del proyecto a clientes.
* Probar cada cambio antes de avanzar.
* Mantener la base de datos en español.
* Mantener la arquitectura modular.

---

## Entrega a cliente piloto

Para un cliente piloto se entrega:

```txt
Prismia POS Local Setup 1.0.0.exe
```

No se entrega:

* repositorio completo
* ZIP del proyecto
* `.env`
* base de datos de desarrollo
* backups de prueba
* certificados locales
* secretos runtime

La instalación debe crear su propio entorno en AppData y su propia configuración inicial.

---

## Estado final

Prismia POS Local V1 queda listo para prueba piloto controlada.

La prioridad de esta etapa es estabilidad, datos seguros, ventas correctas, caja confiable, inventario usable, backups/restauración funcionales y una instalación limpia para cliente real.
