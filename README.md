Reporte total de avance · Prismia POS Local
1. Qué es Prismia POS Local

Prismia POS Local es un sistema POS pensado para pequeños comercios que necesitan operar con orden desde el primer día.

No busca ser todavía un monstruo tipo Siigo, Farmatodo o Éxito, pero sí quiere quedar con una arquitectura suficientemente seria para crecer hacia algo más completo.

La idea central es:

POS local, profesional, completo y preparado para crecer.

Debe funcionar inicialmente en entorno local, posiblemente empaquetado más adelante con Electron, usando una base de datos local sin obligar al cliente a instalar MySQL. Por eso se decidió migrar la base a SQLite.

2. Objetivo general del software

Prismia POS busca cubrir:

productos
categorías
inventario
conteos físicos
reportes de inventario
caja
ventas POS
clientes
proveedores
compras
gastos
reportes
configuración del negocio

La visión es que el dueño de un negocio pueda saber:

qué productos tiene
cuánto stock hay
cuánto dinero tiene invertido
cuánto podría vender
cuánta utilidad bruta estimada tiene
qué productos están bajos
qué movimientos se hicieron
qué diferencias hubo en inventario
cuánto dinero debería haber en caja
qué ventas se hicieron
qué gastos salieron

En resumen: que el negocio no funcione “a ojo”, esa maravillosa tradición humana de perder plata con confianza.

3. Stack actual

El proyecto está construido con:

Node.js
Express
EJS
CSS
JavaScript
SQLite
better-sqlite3
express-session
bcrypt
dotenv
multer
xlsx

La decisión más importante fue:

SQLite para instalación local

Razón:

- funciona bien con Electron
- no requiere instalar servidor MySQL
- es ideal para un POS local
- facilita empaquetado
- permite distribuir el sistema más fácil
4. Nombre y branding

Al inicio el proyecto se llamaba Kaja POS Local, pero se encontró que “Kaja” ya existe como nombre comercial. Luego se evaluaron nombres como CashiLite, Cajix y otros.

Finalmente se decidió usar:

Prismia POS Local

Con marca desarrolladora:

Nieves Systems

También se creó la idea de manejar un archivo centralizado tipo:

company.js

o configuración equivalente, para que el nombre, versión, desarrollador y textos principales puedan cambiarse sin tener que tocar 80 archivos como castigo medieval.

Datos visibles actuales:

Nombre: Prismia POS Local
Versión: 0.1.0
Desarrollador: Nieves Systems
5. Estructura actual del proyecto

La estructura base que se ha venido usando es modular:

src
├── config
├── database
│   ├── data
│   ├── migrations
│   ├── init-db.js
│   └── schema.sql
├── middlewares
├── modules
│   ├── auth
│   ├── dashboard
│   ├── configuracion
│   ├── categorias
│   ├── productos
│   └── inventario
├── public
│   ├── css
│   │   ├── main.css
│   │   └── modules
│   │       └── inventario.css
│   └── js
└── views
    ├── auth
    ├── dashboard
    ├── layouts
    ├── partials
    ├── configuracion
    ├── categorias
    ├── productos
    └── inventario

La arquitectura por módulo sigue este patrón:

module.repository.js
module.service.js
module.controller.js
module.routes.js
views/module/*.ejs

Ejemplo en inventario:

src/modules/inventario/inventario.repository.js
src/modules/inventario/inventario.service.js
src/modules/inventario/inventario.controller.js
src/modules/inventario/inventario.routes.js
src/views/inventario/index.ejs
src/views/inventario/ajuste.ejs
src/views/inventario/historial.ejs
src/views/inventario/reportes.ejs
src/views/inventario/conteos/index.ejs
src/views/inventario/conteos/nuevo.ejs
src/views/inventario/conteos/detalle.ejs
src/views/inventario/conteos/diferencias.ejs
src/public/css/modules/inventario.css

Este patrón debe mantenerse para los siguientes módulos. Nada de empezar a meter lógica en vistas o SQL en controllers, porque ese es el camino hacia el pantano.

6. Configuración actual

Se trabajó con .env y .gitignore.

.env base

Se definieron variables como:

APP_NAME=Prismia POS Local
APP_PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=prismia_pos_local
DB_USER=root
DB_PASSWORD=""

SESSION_SECRET=prismia_pos_local_dev_secret_123

Luego se migró el enfoque hacia SQLite, por lo que MySQL quedó como referencia vieja o futura, no como base operativa principal.

.gitignore

Se dejó preparado para no subir basura ni datos sensibles:

node_modules/
.env
.env.*
!.env.example

logs/
*.log

dist/
build/
coverage/

.DS_Store
Thumbs.db

public/uploads/*
!public/uploads/.gitkeep

src/database/data/*.sqlite
src/database/data/*.sqlite-shm
src/database/data/*.sqlite-wal

Correcto para evitar subir la base local real al repositorio.

7. Base de datos

Se inicializó SQLite correctamente con:

npm run db:init

Resultado esperado que ya salió:

Base de datos SQLite conectada
Schema ejecutado correctamente
Configuración inicial creada
Roles iniciales verificados
Categorías de gasto verificadas
Categorías de productos verificadas
Cliente consumidor final creado
Usuario administrador creado

Usuario inicial:

Correo: admin@prismia.local
Contraseña inicial: Admin12345
Tablas importantes conocidas

Entre las tablas ya vistas o usadas están:

auditoria
categorias_gasto
categorias_productos
clientes
comprobantes
configuracion_negocio
detalle_ventas
gastos
movimientos_caja
movimientos_inventario
pagos_venta
productos
unidades_medida
conteos_inventario
detalle_conteos_inventario
usuarios
roles

La base está pensada en español, como se decidió desde el inicio.

8. Módulos implementados hasta ahora
Sprint 0 · Base del sistema

Se trabajó en:

estructura inicial
servidor Express
EJS
layout base
rutas iniciales
login visual
dashboard inicial
ruta /salud
configuración de empresa/software
conexión SQLite
inicialización de base de datos

Rutas trabajadas:

/auth/login
/dashboard
/salud

Se corrigieron errores visuales iniciales del login y se reemplazó la identidad vieja por Prismia.

También se mejoró el login para que dejara de parecer generado por IA en estado de pánico.

Autenticación

Se dejó funcionando:

login real
sesión activa
usuario administrador
protección de rutas
middleware de autenticación
middleware de roles
logout

Se resolvió un error importante:

estilosModulo is not defined

Causa:

layouts/app.ejs esperaba estilosModulo, pero algunas vistas no lo mandaban.

Solución aplicada:

pasar estilosModulo desde controllers o manejarlo correctamente.
Dashboard

Se creó dashboard administrativo con sidebar y sesión activa.

Incluye:

usuario actual
rol principal
estado del servidor
estado de base de datos
estado de autenticación
accesos a módulos

Visualmente quedó bastante bien y sirvió como base para la aplicación interna.

9. Módulo configuración

Se implementó configuración base del negocio.

Función del módulo:

guardar datos comerciales del negocio
moneda
recibo
ajustes generales
datos que después usarán tickets, facturas, caja, reportes y ventas

Se aclaró que esta configuración no es “decorativa”; será la fuente central para que el sistema se adapte al negocio sin tocar código.

10. Módulo categorías

Se implementó:

listar categorías
crear categoría
editar categoría
activar categoría
inactivar categoría

Se vio un caso donde los IDs saltaron de 6 a 19 o 20 en SQLite.

Se explicó que esto no era error funcional:

SQLite AUTOINCREMENT no reutiliza IDs borrados o intentos fallidos.

Decisión correcta:

No importa que el id interno no sea bonito.
Los IDs visibles bonitos son necesarios en productos, ventas, remisiones, cotizaciones, etc.
11. Módulo productos

Este módulo fue tratado como crítico, porque es el corazón del POS.

Funciones implementadas
listar productos
crear producto
editar producto
activar/desactivar producto
buscar productos
filtrar productos
paginación
código interno visible tipo PRD-0001
código de barras / SKU
categoría
unidad de medida
precio de costo
precio de venta
stock inicial
stock mínimo
control de inventario
permitir venta sin stock
manejo de IVA
precio incluye IVA
imagen local futura
Decisiones importantes

Se incluyeron unidades de medida porque el cliente puede vender productos como:

unidades
metros
kilos
litros
servicios

Caso principal:

alambre vendido por metro

Se decidió que un producto puede manejar stock en metros. Ejemplo:

Compra un rollo de 1000 m
Se registra stock: 1000 m
Se vende por metro

Más adelante, cuando exista módulo compras, se podrá mejorar para registrar:

compra por rollo
conversión a metros
entrada al inventario por unidad de venta
Ganancia y margen

El sistema ya maneja:

precio_costo
costo_promedio
precio_venta
margen
markup
utilidad estimada

Regla conceptual:

utilidad = precio venta neto - costo promedio

Si hay IVA:

IVA no es ganancia
IVA debe separarse
utilidad se calcula sobre valor neto sin IVA
Deuda visual del módulo productos

Queda pendiente:

formulario demasiado largo
cards muy grandes
header superior compite con header del módulo
algunos campos se ven saturados
se necesita patrón visual más compacto
mejor agrupación de secciones
mejor responsive
mejor tabla para muchos productos

Funcionalmente está bien encaminado, visualmente requiere limpieza.

12. Módulo inventario

Este fue el módulo más trabajado y quedó fuerte.

12.1 Inventario principal

Se implementó vista de inventario con:

stock actual
stock mínimo
unidad
estado de stock
acciones
filtros
paginación
historial
conteos físicos
reportes
12.2 Ajustes manuales

Se implementó:

entrada manual
salida manual
motivo obligatorio
validación de cantidad
actualización de stock
registro en movimientos_inventario
auditoría

Ejemplos:

Entrada manual: compra no registrada, corrección positiva.
Salida manual: merma, pérdida, daño, corrección negativa.
12.3 Historial de inventario

Se creó historial con:

tipo de movimiento
producto
cantidad
stock anterior
stock nuevo
motivo
usuario
referencia
fecha
filtros
paginación

Registra movimientos como:

entrada_inicial
ajuste_positivo
ajuste_negativo
conteo_inventario
13. Conteo físico de inventario

Este es uno de los logros más importantes del sistema hasta ahora.

Flujo completo implementado
crear conteo físico
congelar stock del sistema
registrar cantidades manualmente
importar plantilla Excel
calcular diferencias
revisar reporte de diferencias
aplicar conteo
actualizar stock real
crear movimientos de inventario
bloquear conteo aplicado
exportar reporte
Rutas de conteo
GET  /inventario/conteos
GET  /inventario/conteos/nuevo
POST /inventario/conteos/nuevo
GET  /inventario/conteos/:id
POST /inventario/conteos/:id/guardar
POST /inventario/conteos/:id/aplicar
GET  /inventario/conteos/:id/diferencias
GET  /inventario/conteos/:id/exportar-diferencias
GET  /inventario/conteos/:id/exportar-plantilla
POST /inventario/conteos/:id/importar-plantilla
Estados del conteo
borrador
en_revision
aplicado
anulado futuro
Detalle de conteo

Cada producto del conteo guarda:

producto
código interno
código de barras
unidad
stock sistema congelado
stock contado
diferencia
costo promedio
valor diferencia
estado
observación
Regla fundamental

Crear conteo no cambia stock real.

Solo hace:

foto del stock actual

El stock real cambia únicamente al aplicar el conteo.

Protección importante

Se implementó una protección clave:

si el stock de un producto cambió después de crear el conteo,
el sistema bloquea la aplicación.

Esto evita que un conteo viejo pise movimientos nuevos.

14. Plantilla Excel de conteo

Se implementó exportación de plantilla Excel.

Archivo ejemplo:

INV-000001_plantilla_conteo.xlsx

Hojas:

Instrucciones
Conteo

Columnas principales:

id_detalle
codigo_interno
codigo_barras
producto
unidad
stock_sistema
stock_contado
observacion

Regla para el usuario:

solo modificar stock_contado y observacion
Importación Excel

Se implementó con:

multer
xlsx

Funciona así:

sube archivo .xlsx
lee hoja Conteo
normaliza encabezados
valida id_detalle
valida stock_contado
valida cantidades negativas
valida decimales según unidad
guarda cantidades
calcula diferencias
deja conteo en revisión

Se probó y funcionó correctamente.

15. Reporte de diferencias de conteo

Ruta:

/inventario/conteos/:id/diferencias

Muestra:

total productos
sobrantes
faltantes
sin diferencia
valor sobrantes
valor faltantes
impacto neto
estado del conteo
tabla solo de productos con diferencia

También exporta Excel:

INV-000001_diferencias.xlsx

Hojas:

Resumen
Diferencias
Detalle completo

En el detalle completo también salen productos sin diferencia.

16. Reporte operativo de inventario

Ruta:

/inventario/reportes

Exportación:

/inventario/reportes/exportar
Muestra en pantalla
productos activos
stock suficiente
bajo stock
sin stock
sin control
valor al costo
movimientos 30 días
conteos recientes
valoración comercial del inventario
alertas de stock
movimientos últimos 30 días
mayor valor en inventario
conteos físicos recientes
Valoración comercial

Se agregó una sección muy importante:

Valor al costo
Valor venta bruto
Valor venta neto
IVA estimado
Utilidad bruta estimada
Margen bruto estimado

Reglas:

valor al costo = stock actual × costo promedio
valor venta bruto = venta estimada con IVA si aplica
valor venta neto = venta sin IVA
IVA estimado = impuesto separado
utilidad bruta estimada = venta neta - valor al costo
margen bruto estimado = utilidad / venta neta

Esto responde preguntas reales del dueño:

cuánto dinero tengo invertido
cuánto podría vender
cuánto ganaría bruto
cuánto IVA está separado
Excel de reporte operativo

Se implementó exportación Excel con hojas:

Resumen
Valoracion
Alertas stock
Movimientos 30 dias
Mayor valor
Conteos recientes

El Excel no está “bonito”, pero cumple:

datos claros
datos precisos
datos fáciles de leer
estructura útil para contador o administrador

Eso es lo importante por ahora. Ya habrá tiempo para ponerlo elegante, si el mundo no se acaba primero por culpa de una celda mal formateada.

17. Rutas principales actuales
Sistema
GET /salud
GET /dashboard
Auth
GET  /auth/login
POST /auth/login
POST /auth/logout
Configuración
GET  /configuracion
POST /configuracion
Categorías
GET  /categorias
GET  /categorias/nueva
POST /categorias/nueva
GET  /categorias/:id/editar
POST /categorias/:id/editar
POST /categorias/:id/activar
POST /categorias/:id/desactivar
Productos
GET  /productos
GET  /productos/nuevo
POST /productos/nuevo
GET  /productos/:id/editar
POST /productos/:id/editar
POST /productos/:id/activar
POST /productos/:id/desactivar
Inventario
GET  /inventario
GET  /inventario/reportes
GET  /inventario/reportes/exportar
GET  /inventario/historial
GET  /inventario/:id/ajuste
POST /inventario/:id/ajuste
Conteos
GET  /inventario/conteos
GET  /inventario/conteos/nuevo
POST /inventario/conteos/nuevo
GET  /inventario/conteos/:id
POST /inventario/conteos/:id/guardar
POST /inventario/conteos/:id/aplicar
GET  /inventario/conteos/:id/diferencias
GET  /inventario/conteos/:id/exportar-diferencias
GET  /inventario/conteos/:id/exportar-plantilla
POST /inventario/conteos/:id/importar-plantilla
18. Errores corregidos durante el desarrollo
Error estilosModulo is not defined

Ocurrió en:

layouts/app.ejs

Causa:

la vista no recibía estilosModulo

Solución:

pasar estilosModulo desde los controllers.
Error SQLite "activo"

Error:

no such column: "activo"

Causa:

p.estado = "activo"

SQLite interpretó "activo" como columna.

Corrección:

p.estado = ?

con parámetro:

['activo']
Error de rutas undefined

Error:

Route.get() requires a callback function but got [object Undefined]

Causa:

función no exportada en controller o service

Solución:

reemplazar controller/routes y asegurar exports correctos.
Duplicidad de botón en conteo

Problema:

dos botones Guardar cantidades

Solución:

dejar solo el botón inferior.
Confirm nativo del navegador

Problema:

prompt feo del navegador al aplicar conteo

Solución:

modal propio en detalle.ejs
19. Deuda visual pendiente

Esto debe quedar como prioridad en la próxima sesión o en una sesión específica de UI.

Deuda visual general
headers demasiado grandes
cards muy altas
acciones superiores incómodas
tablas con scroll horizontal poco elegante
formularios largos saturan demasiado
botones en headers no siempre se acomodan bien
main.css puede crecer demasiado
inventario.css ya empieza a cargarse bastante
Productos
formulario de producto largo
secciones visualmente pesadas
cards demasiado grandes
demasiado texto pequeño
algunos textos suenan más a desarrollador que a usuario final
mejorar agrupación visual
mejorar responsive
Inventario
vista de ajuste desajustada
detalle de conteo pesado
tablas anchas
scroll horizontal visible
cards de resumen ocupan bastante
importar Excel y acciones necesitan mejor patrón
Reportes
acciones del header aún no se ven perfectas
botones exportar/inventario/conteos/historial necesitan patrón global
la pantalla está limpia, pero las acciones superiores siguen flojas
Solución recomendada

No arreglar pantalla por pantalla.

Lo correcto:

crear patrón UI global

Para:

module-header
module-actions
report-actions
form-section
table-wrapper
modal global reutilizable
botones primarios/secundarios
cards compactas
layouts de formularios largos
20. Estado funcional actual

El sistema ya tiene una base funcional sólida en:

autenticación
dashboard
configuración
categorías
productos
inventario
conteos físicos
reportes de inventario
Excel import/export
auditoría básica

El módulo de inventario se puede considerar:

cerrado funcionalmente
pendiente de pulido visual
21. Orden correcto de desarrollo desde aquí

La recomendación es no pasar todavía a ventas. Primero debe existir caja.

Orden recomendado:

Sprint 3: Caja
Sprint 4: POS / ventas
Sprint 5: Compras a proveedores
Sprint 6: Gastos
Sprint 7: Clientes y comprobantes
Sprint 8: Reportes generales
Sprint 9: Pulido UI global
Sprint 10: Preparación Electron / instalación local
Por qué caja antes de ventas

Porque ventas necesita saber:

si hay caja abierta
quién está vendiendo
qué turno recibe el dinero
qué método de pago se usó
cómo se cierra el efectivo
qué diferencia hay al final

Hacer ventas sin caja sería posible, pero sucio. Y este proyecto ya va demasiado bien como para empezar a pegar módulos con cinta.

22. Siguiente sprint recomendado
Sprint 3 · Caja
Objetivo

Crear un módulo de caja que permita:

abrir caja
cerrar caja
registrar base inicial
registrar ingresos manuales
registrar egresos manuales
registrar gastos desde caja
ver caja activa
ver movimientos de caja
calcular efectivo esperado
calcular diferencia de cierre
historial de turnos
Fase 3A · Base de caja
crear/validar tablas turnos_caja y movimientos_caja
crear módulo src/modules/caja
crear rutas base
crear vista /caja
mostrar caja activa o botón abrir caja
Fase 3B · Apertura de caja
abrir caja con base inicial
validar caja abierta por usuario
validar que no haya turno abierto duplicado
mostrar datos del turno
Fase 3C · Movimientos manuales
ingreso manual
egreso manual
gasto desde caja
motivo obligatorio
historial de movimientos
Fase 3D · Cierre de caja
efectivo esperado
efectivo contado
diferencia
observación de cierre
cierre definitivo
bloqueo de caja cerrada
Fase 3E · Reportes de caja
cajas abiertas
cajas cerradas
historial de cierres
diferencias
movimientos por turno
exportación futura
Fase 3F · Preparación para ventas
dejar caja lista para recibir pagos de ventas
efectivo
transferencia
tarjeta
otros métodos
23. Reglas de arquitectura para continuar

Mantener siempre:

controller = maneja request/response
service = reglas de negocio
repository = SQL
views = presentación
routes = rutas
CSS por módulo cuando sea necesario

No mezclar:

SQL en vistas
lógica de negocio en EJS
validaciones serias solo en frontend
rutas desordenadas
helpers duplicados
CSS improvisado por pantalla

Orden para cada módulo nuevo:

1. definir tablas
2. crear repository
3. crear service
4. crear controller
5. crear routes
6. crear vistas mínimas
7. probar flujo
8. agregar reportes
9. agregar Excel solo si aporta valor
10. pulir visual después de validar lógica

Este orden ha funcionado muy bien en inventario.

24. Contexto breve para pegar en el próximo chat

Puedes iniciar la siguiente conversación con esto:

Actúa como arquitecto de software y desarrollador senior.

Estoy desarrollando Prismia POS Local, un POS local profesional para pequeños comercios, preparado para empaquetarse más adelante con Electron y usando SQLite como base local.

Stack:
Node.js, Express, EJS, CSS, JavaScript, SQLite, better-sqlite3, express-session, bcrypt, multer y xlsx.

Arquitectura:
src/modules por módulo, usando repository, service, controller y routes.
Las vistas están en src/views.
El CSS global está en main.css y los módulos pueden tener CSS propio en public/css/modules.

Ya están funcionales:
- auth/login
- dashboard
- configuración del negocio
- categorías
- productos
- inventario
- ajustes manuales
- historial de inventario
- conteos físicos
- exportar/importar plantilla Excel de conteo
- aplicar conteo con validaciones
- reporte de diferencias
- reporte operativo de inventario
- valoración comercial del inventario
- exportar reporte operativo a Excel

El módulo inventario está cerrado funcionalmente, pero tiene deuda visual:
headers grandes, acciones superiores feas, formularios largos, tablas anchas, cards saturadas, necesidad de modal global reutilizable y patrón UI definitivo.

Quiero continuar con Sprint 3: Caja.

Objetivo de caja:
abrir caja, base inicial, movimientos manuales, ingresos, egresos, gastos desde caja, cierre de caja, efectivo esperado, efectivo contado, diferencia, historial de turnos y preparación para conectar ventas después.

Quiero seguir como antes:
paso a paso, módulo por módulo, con código para copiar y pegar, sin romper lo que ya funciona.
La base de datos debe mantenerse en español.
25. Resumen final

Prismia POS ya dejó de ser “proyecto inicial” y empezó a tener columna vertebral.

Lo más fuerte hasta ahora:

Inventario ya no es solo stock.
Inventario ahora tiene control, conteo físico, Excel, diferencias, valorización y reportes.

Eso es una base muy seria para un POS local.

Lo siguiente correcto es:

Caja

Después:

Ventas POS

Y cuando caja + ventas + inventario estén conectados, ahí sí Prismia empieza a sentirse como POS real de comercio, no como colección de pantallas bonitas con esperanza.