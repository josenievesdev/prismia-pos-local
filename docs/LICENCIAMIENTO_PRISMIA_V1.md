# Licenciamiento Prismia POS Local V1

## 1. Propósito del módulo

El módulo de licenciamiento de **Prismia POS Local** permite controlar el uso del sistema mediante una licencia local, activación manual y códigos firmados offline.

La solución fue diseñada para una primera versión comercial/piloto donde Prismia funciona de forma local en Windows, sin depender obligatoriamente de internet, pero dejando la base lista para integrarse más adelante con un panel central de clientes, pagos, instalaciones y licencias.

---

## 2. Estado actual del licenciamiento V1

El módulo permite:

* prueba local inicial;
* periodo de gracia;
* bloqueo operativo por licencia vencida;
* activación manual desde pantalla local;
* generación de códigos firmados offline;
* validación de firma digital;
* validación de huella del equipo;
* control de vigencia por fechas;
* protección contra reutilizar el mismo código;
* protección contra aplicar códigos con menor vigencia;
* conexión con datos del negocio local;
* envío de solicitud de renovación por WhatsApp;
* auditoría de activación;
* auditoría técnica del módulo de licenciamiento.

---

## 3. Flujo comercial recomendado

### 3.1 Instalación inicial

Cuando Prismia se instala por primera vez, el cliente debe registrar los datos básicos del negocio en el setup inicial.

Estos datos quedan en la tabla:

```txt
configuracion_negocio
```

Datos importantes:

```txt
nombre_negocio
nombre_comercial
documento
telefono
correo
direccion
```

Estos datos se usan en:

* tickets y documentos;
* configuración local;
* pantalla de licencia;
* mensaje de WhatsApp para renovación;
* futuro panel central de clientes/licencias.

---

### 3.2 Prueba inicial

Prismia inicia con una prueba local de 30 días.

La información se guarda en:

```txt
licencia_local
```

Campos principales:

```txt
estado = prueba
fecha_inicio_prueba
fecha_fin_prueba
dias_prueba
dias_gracia
```

Durante la prueba, Prismia permite operar normalmente.

---

### 3.3 Solicitud de activación o renovación

Desde la pantalla:

```txt
/licencia
```

o:

```txt
/licencia/activar
```

el cliente puede:

* consultar el estado de licencia;
* copiar la huella del equipo;
* solicitar renovación por WhatsApp;
* pegar un código de activación.

El WhatsApp de activación real de Prismia es:

```txt
3215394234
```

En formato `wa.me`:

```txt
573215394234
```

El mensaje enviado por WhatsApp incluye:

```txt
Negocio local
Cliente de licencia
Documento/NIT
Teléfono negocio
Estado actual
Plan
Fecha de vencimiento
Días restantes
Huella del equipo
```

Esto permite generar el código correcto sin pedir datos manualmente al cliente.

---

### 3.4 Generación del código firmado

El código se genera desde el equipo del desarrollador o soporte usando:

```powershell
npm run licencia:code -- --cliente "Nombre Cliente" --plan mensual --dias 30 --gracia 3 --huella "HUELLA_COMPLETA"
```

Ejemplo:

```powershell
npm run licencia:code -- --cliente "Cliente Demo" --plan mensual --dias 30 --gracia 3 --huella "6626f374f7bcbfd766d67efb894d1e64134d0f82b438b2b6d5c48f166bf75ae6"
```

El código generado tiene formato:

```txt
PRM1.payload.firma
```

Ese código se entrega al cliente por WhatsApp u otro canal.

---

### 3.5 Activación en Prismia

El cliente entra a:

```txt
/licencia/activar
```

Pega el código recibido y Prismia valida:

```txt
firma digital
producto
plan
fecha inicial
fecha final
huella del equipo
código repetido
vigencia superior a la actual
```

Si todo es correcto, Prismia actualiza la licencia local a:

```txt
estado = activa
plan = mensual / trimestral / semestral / anual / piloto
firma_valida = 1
fecha_inicio_periodo
fecha_fin_periodo
cliente_licencia
huella_equipo
codigo_firmado
ultimo_nonce_licencia
fecha_emision_codigo
origen_activacion = local_firmada
```

---

## 4. Flujo técnico general

```txt
Cliente instala Prismia
        ↓
Registra datos del negocio
        ↓
Prismia crea licencia local de prueba
        ↓
Cliente solicita activación por WhatsApp
        ↓
WhatsApp envía datos del negocio + huella
        ↓
Soporte genera código firmado
        ↓
Cliente pega código en /licencia/activar
        ↓
Prismia valida firma + huella + fechas
        ↓
Prismia activa licencia
        ↓
Prismia registra auditoría
```

---

## 5. Archivos principales del módulo

### Configuración comercial

```txt
src/config/licencia-comercial.js
```

Responsable de:

* número real de WhatsApp;
* construcción del mensaje de renovación;
* generación de URL `wa.me`.

---

### Clave pública

```txt
src/config/licencia-public-key.js
```

Contiene la clave pública usada por Prismia para validar códigos firmados.

Esta clave puede estar en el repositorio.

---

### Clave privada

```txt
tools/licencias/private/prismia-license-private.pem
```

Esta clave se usa para generar códigos de activación.

Nunca debe subirse al repositorio.

Está protegida por `.gitignore`.

---

### Generador de claves

```txt
tools/licencias/generar-claves-licencia.js
```

Genera:

```txt
clave privada
clave pública
```

Comando:

```powershell
npm run licencia:keys
```

Solo debe ejecutarse cuando se vaya a crear un nuevo par de claves.

No debe ejecutarse accidentalmente si ya existe una clave privada válida.

---

### Generador de códigos

```txt
tools/licencias/generar-codigo-activacion.js
```

Genera códigos firmados para activar Prismia.

Comando base:

```powershell
npm run licencia:code -- --cliente "Cliente" --plan mensual --dias 30 --gracia 3 --huella "HUELLA_COMPLETA"
```

---

### Servicio de huella del equipo

```txt
src/modules/licencia-local/huellaEquipo.service.js
```

Genera una huella técnica del equipo usando:

```txt
app_id
plataforma
arquitectura
hostname
MachineGuid de Windows
```

La huella se usa para que un código emitido para un equipo no funcione en otro.

---

### Servicio de firma

```txt
src/modules/licencia-local/licenciaFirma.service.js
```

Valida:

```txt
formato del código
payload
firma digital
producto
plan
huella del equipo
fechas
días de gracia
```

---

### Repository de licencia

```txt
src/modules/licencia-local/licenciaLocal.repository.js
```

Responsable de consultar y actualizar:

```txt
licencia_local
configuracion_negocio
auditoria
```

---

### Service de licencia

```txt
src/modules/licencia-local/licenciaLocal.service.js
```

Responsable de:

* calcular estado operativo;
* iniciar prueba local;
* validar cambio de fecha;
* activar licencia con código firmado;
* evitar códigos repetidos;
* evitar códigos con menor vigencia;
* conectar datos del negocio;
* registrar auditoría de activación.

---

### Controller de licencia

```txt
src/modules/licencia-local/licenciaLocal.controller.js
```

Maneja las pantallas:

```txt
/licencia
/licencia/activar
```

---

### Rutas de licencia

```txt
src/modules/licencia-local/licenciaLocal.routes.js
```

Rutas actuales:

```txt
GET  /licencia
GET  /licencia/activar
POST /licencia/activar
```

---

### Middleware de licencia

```txt
src/middlewares/licencia.middleware.js
```

Controla el bloqueo operativo según:

```txt
bloquea_operacion
permite_operar
estado_operativo
```

Debe permitir siempre:

```txt
/auth
/setup
/licencia
/backups
assets públicos
```

---

### Vista de licencia

```txt
src/views/licencia/index.ejs
```

Muestra:

```txt
estado
vigencia
días restantes
negocio local
cliente de licencia
documento
plan
firma válida
renovación
huella
WhatsApp
```

---

### Vista de activación

```txt
src/views/licencia/activar.ejs
```

Permite pegar códigos firmados y muestra:

```txt
estado actual
negocio local
cliente de licencia
huella del equipo
formulario de activación
botón copiar huella
botón solicitar renovación
```

---

### Vista de licencia vencida

```txt
src/views/licencia/vencida.ejs
```

Se muestra cuando Prismia bloquea operación por licencia vencida, bloqueada o inválida.

Permite:

```txt
ingresar código
activar por WhatsApp
cerrar sesión
```

---

## 6. Tabla licencia_local

La tabla principal es:

```txt
licencia_local
```

Campos relevantes:

```txt
id_licencia
estado
fecha_inicio_prueba
fecha_fin_prueba
fecha_inicio_periodo
fecha_fin_periodo
dias_prueba
dias_gracia
plan
fecha_ultimo_uso
fecha_activacion
huella_equipo
cliente_licencia
codigo_activacion
codigo_firmado
ultimo_nonce_licencia
fecha_emision_codigo
firma_valida
origen_activacion
ultima_validacion_online
ultimo_intento_online
motivo_bloqueo
nota
creado_en
actualizado_en
```

---

## 7. Estados operativos

El servicio calcula estos estados:

```txt
prueba
activa
gracia
vencida
bloqueada
reloj_manipulado
sin_registro
```

### prueba

La prueba inicial está activa.

Permite operar.

---

### activa

La licencia firmada está vigente.

Permite operar.

---

### gracia

La licencia o prueba venció, pero todavía está dentro del periodo de gracia.

Permite operar, pero requiere renovación.

---

### vencida

La licencia ya no permite operar.

Bloquea módulos operativos.

---

### bloqueada

La licencia fue bloqueada por el sistema.

Debe revisarse con soporte.

---

### reloj_manipulado

Prismia detectó que la fecha del sistema parece anterior al último uso registrado.

Bloquea operación.

---

### sin_registro

No existe registro de licencia local.

Bloquea operación.

---

## 8. Política de bloqueo

Cuando la licencia bloquea operación, Prismia debe impedir el acceso a módulos operativos como:

```txt
ventas
caja
compras
inventario operativo
reportes operativos
```

Pero debe permitir:

```txt
login
licencia
activación
backup
logout
assets públicos
```

La información del cliente no se elimina ni se secuestra. El cliente conserva su base local.

---

## 9. Seguridad implementada

El módulo no depende de códigos simples.

Usa firma digital con clave pública y privada.

La clave privada queda fuera del software instalado.

Prismia solo incluye la clave pública.

Esto permite validar códigos offline sin exponer la clave usada para firmarlos.

---

## 10. Protección contra reutilización y retroceso

Prismia rechaza:

```txt
código ya aplicado
código que no corresponde a este equipo
código con firma inválida
código vencido
código de otro producto
código con plan no permitido
código que no mejora la vigencia actual
```

Esto evita que un cliente aplique un código viejo para reemplazar una vigencia mayor por una menor.

---

## 11. Auditoría de activación

Cada activación firmada registra auditoría con acción:

```txt
licencia_activada_codigo_firmado
```

La auditoría guarda:

```txt
estado anterior
plan anterior
cliente anterior
fecha fin anterior
firma anterior
nuevo estado
nuevo plan
cliente nuevo
fecha inicio
fecha fin
días de gracia
origen de activación
nonce
fecha de emisión
huella del equipo
```

Esto permite revisar posteriormente cuándo y cómo se activó una licencia.

---

## 12. Auditoría técnica de licenciamiento

Script:

```txt
src/database/audit-licencia.js
```

Comando:

```powershell
npm run licencia:audit
```

Valida:

```txt
clave pública configurada
clave privada local presente e ignorada
resumen de licencia disponible
estado operativo
negocio local conectado
cliente de licencia resuelto
huella actual disponible
fecha fin operativa
firma válida
fecha de activación
coincidencia de huella
días restantes
WhatsApp real
```

Resultado esperado:

```txt
Errores críticos: 0
Advertencias: 0
```

---

## 13. Comandos de cierre recomendados

Antes de entregar o probar piloto:

```powershell
npm run db:validate
npm run db:audit:contable
npm run licencia:audit
```

Resultado ideal:

```txt
Validación de base correcta
Auditoría contable correcta
Auditoría de licencia correcta
```

---

## 14. Relación con futuro panel central

Prismia queda preparado para conectarse con un futuro software de administración de clientes/licencias.

Ese futuro sistema debería controlar:

```txt
clientes
instalaciones
huellas de equipo
planes
pagos
licencias
códigos emitidos
renovaciones
estado de cartera
```

Modelo conceptual:

```txt
Cliente
    ↓
Instalación
    ↓
Licencia
    ↓
Pago
    ↓
Código firmado
    ↓
Activación local en Prismia
```

---

## 15. Datos que Prismia ya puede enviar al ecosistema futuro

Desde el resumen local de licencia se pueden usar:

```txt
nombre_negocio_local
documento_negocio_local
telefono_negocio_local
correo_negocio_local
direccion_negocio_local
cliente_licencia
cliente_licencia_resuelto
estado_operativo
plan
fecha_fin_operativa
dias_restantes
huella_equipo_actual
huella_equipo_actual_corta
firma_valida
origen_activacion
fecha_activacion
fecha_emision_codigo
```

Estos datos son suficientes para crear un primer panel de control de clientes.

---

## 16. Futuras mejoras recomendadas

### 16.1 Campos remotos

Agregar en una futura migración:

```txt
id_cliente_remoto
id_instalacion_remota
codigo_cliente
sincronizado_online
ultima_sincronizacion
```

---

### 16.2 Validación híbrida online

Más adelante Prismia puede consultar un backend remoto para validar:

```txt
estado del cliente
estado de pago
fecha de vencimiento
bloqueo remoto
renovación automática
```

Si no hay internet, Prismia puede operar usando la licencia local y el periodo de gracia.

---

### 16.3 Panel central

El panel central debería permitir:

```txt
registrar clientes
registrar pagos
ver instalaciones
ver huellas
generar códigos firmados
marcar códigos como emitidos
enviar códigos por WhatsApp
ver historial de renovaciones
```

---

### 16.4 Automatización WhatsApp

A futuro se puede integrar envío automático de mensajes de renovación.

Por ahora, el botón de WhatsApp deja el mensaje preparado para atención manual.

---

## 17. Estado final V1

El licenciamiento V1 queda apto para piloto controlado con activación manual firmada.

No requiere nube para operar.

Permite vender Prismia como software local con control mensual.

Deja base técnica preparada para evolucionar hacia un ecosistema centralizado de clientes, instalaciones, pagos y licencias.
