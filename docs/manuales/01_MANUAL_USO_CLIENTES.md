# Manual de uso de Prismia POS Local

> Guía paso a paso para operar ventas, productos, inventario, caja, compras, reportes, backups
> y licencia.
>
> Versión inicial: `0.1` · Fecha de creación: 2026-06-24.
> Basado en los documentos internos de Prismia (mapa documental, guía contable y guía técnica).
>
> Cuando algo depende de cómo quedó instalado Prismia en su negocio, se indica como
> **Pendiente de confirmar en su instalación**.

---

## Índice

1. Introducción
2. Recomendaciones antes de empezar
3. Primer ingreso al sistema
4. Pantalla principal
5. Configuración del negocio
6. Usuarios y permisos
7. Clientes
8. Categorías de productos
9. Productos
10. Inventario
11. Caja y turnos
12. Ventas (POS)
13. POS móvil o táctil
14. Historial de ventas
15. Anulación de ventas
16. Notas crédito internas
17. Proveedores
18. Compras
19. Cotizaciones
20. Remisiones
21. Reportes
22. Backups (copias de seguridad)
23. Restauración de backup
24. Licencia del sistema
25. Error conocido: Prismia ya está abierto o puerto ocupado
26. Errores comunes y soluciones rápidas
27. Buenas prácticas
28. Glosario para usuarios
29. Estado del documento

---

## 1. Introducción

**Prismia POS Local** es un sistema de punto de venta para su negocio. Se instala en el
computador del negocio y funciona de forma **local**, sin depender de internet para vender.

**¿Para qué sirve?** Para llevar el control diario del negocio:

* registrar **ventas** y entregar el **ticket** al cliente;
* manejar **productos**, **precios** e **inventario**;
* controlar la **caja** y los **turnos**;
* registrar **compras** a proveedores;
* manejar **clientes** y **proveedores**;
* hacer **cotizaciones** y **remisiones**;
* ver **reportes** del negocio;
* hacer **copias de seguridad (backups)** de su información.

**¿Quién lo puede usar?** El **administrador** (dueño o encargado) y el personal autorizado,
como el **cajero** o el encargado de **inventario**.

**¿Qué cubre este manual?** El uso del sistema paso a paso. Busque el tema en el índice y vaya
a la sección que necesita.

> Prismia se instala y guarda la información en su propio computador. La información del
> negocio queda en ese equipo.

---

## 2. Recomendaciones antes de empezar

* **Use un usuario para cada persona.** Así sabrá quién hizo cada cosa.
* **No comparta contraseñas.** Cada quien debe entrar con su propio usuario.
* **Abra la caja antes de vender.** Las ventas se registran sobre un turno de caja.
* **Registre bien los productos antes de vender** (precio, costo, IVA y stock correctos).
* **Haga backups con frecuencia.** Una copia de seguridad lo protege ante imprevistos.
* **Cierre la caja al terminar el turno.** Así cuadra el dinero del día.
* **No anule ventas sin un motivo claro.** Anular afecta la caja, el inventario y los reportes.
* **Revise el inventario con frecuencia** para que el stock del sistema coincida con el real.

---

## 3. Primer ingreso al sistema

1. **Abra Prismia** desde el ícono en el escritorio o el menú de inicio.
2. Si es la **primera vez** y aparece la **pantalla de configuración inicial**, cree el
   **primer usuario administrador**: escriba el nombre, el usuario y una contraseña segura.
3. **Inicie sesión** con su usuario y contraseña.
4. A partir de ahí verá la pantalla principal del sistema.

**¿Olvidó su contraseña?**

* Si hay **otro administrador**, puede pedirle que entre a **Usuarios**, edite su usuario y le
  asigne una nueva contraseña.
* Si usted es el **único administrador** y no recuerda la contraseña, **contacte a soporte**.
  Prismia no tiene una recuperación automática de contraseña por correo.

> No existe un "olvidé mi contraseña" automático. La contraseña la restablece otro
> administrador o el soporte técnico.

---

## 4. Pantalla principal

Al iniciar sesión verá:

* **Menú lateral:** desde aquí entra a cada parte del sistema.
* **Panel de inicio (dashboard):** muestra información general y accesos principales.

Desde el menú lateral puede entrar a **ventas, productos, categorías, inventario, caja,
clientes, proveedores, compras, cotizaciones, remisiones, notas crédito, reportes y backups**.

> Lo que ve cada persona depende de su rol (ver sección 6). Por ejemplo, un cajero verá
> principalmente ventas y caja.

---

## 5. Configuración del negocio

En **Configuración** (disponible para el administrador) puede definir:

* **Datos básicos del negocio** (nombre, identificación, contacto).
* **Moneda.**
* **IVA por defecto** (si los productos manejan IVA, el porcentaje por defecto y si el precio
  incluye IVA o no).
* **Mensaje del recibo/ticket**, si su negocio lo usa.

Revise esta sección **antes de empezar a vender**, para que los tickets y los cálculos salgan
como su negocio necesita.

> **Advertencia:** cambiar la configuración de IVA puede afectar productos nuevos y cálculos
> futuros. Si ya tiene productos creados, revise que sigan correctos después de un cambio.

---

## 6. Usuarios y permisos

En **Usuarios** (disponible para el administrador) puede:

* **Crear usuario:** nombre, usuario y contraseña.
* **Editar usuario:** cambiar datos o restablecer la contraseña.
* **Activar usuario:** habilitarlo para entrar.
* **Desactivar usuario:** impedirle el acceso sin borrarlo.

**Roles disponibles:**

```txt
administrador
cajero
inventario
```

* **Administrador:** acceso completo al sistema (configuración, usuarios, compras, reportes,
  backups, etc.).
* **Cajero:** operación diaria de ventas y caja (vender, cobrar, abrir/cerrar caja, clientes,
  cotizaciones, remisiones, notas crédito).
* **Inventario:** manejo de **productos**, **categorías** e **inventario**.

> El detalle fino de qué puede hacer exactamente cada rol en cada pantalla puede variar; si
> tiene dudas sobre un permiso puntual, consúltelo con el administrador o soporte.
> **Pendiente de confirmar** el detalle acción por acción.

---

## 7. Clientes

En **Clientes** puede:

* **Crear cliente:** datos del cliente para sus ventas y documentos.
* **Editar cliente:** actualizar la información.
* **Buscar cliente:** por nombre o documento.
* **Activar / desactivar cliente.**
* **Crear cliente rápido desde la venta:** si necesita registrar un cliente en el momento de
  vender, puede crearlo de forma rápida sin salir de la venta.

**Datos recomendados:** nombre o razón social, documento, teléfono y, si aplica, correo y
dirección para los documentos.

> Si la venta es rápida y no requiere datos completos, puede usarse el cliente general
> (mostrado como **"Consumidor final"**) o crear un **cliente rápido**, según esté disponible
> en su instalación.

---

## 8. Categorías de productos

Una **categoría** agrupa productos parecidos (por ejemplo: *Bebidas*, *Aseo*, *Papelería*).
Sirven para **organizar** y **encontrar** los productos más rápido.

En **Categorías** puede:

* **Crear categoría.**
* **Editar categoría.**
* **Activar / desactivar categoría.**

**Buenas prácticas:**

* Use nombres claros y pocos para empezar.
* Cree primero las categorías y luego asígnelas a los productos.
* Evite categorías repetidas o demasiado parecidas.

---

## 9. Productos

En **Productos** registra todo lo que vende. Pasos:

1. **Crear producto** (botón de nuevo producto).
2. Llene los datos principales:
   * **Nombre** y **categoría**.
   * **Precio de venta** (lo que cobra al cliente).
   * **Precio de costo** (lo que le cuesta a usted).
   * **Stock** (cantidad disponible) y **stock mínimo** (para avisarle cuando esté bajo).
   * **Unidad de medida** (unidad, kilo, etc.).
   * **Imagen** del producto (opcional; se aceptan imágenes JPG, PNG o WEBP, hasta 2 MB).
3. Defina el control de inventario:
   * **Producto con control de inventario:** Prismia descuenta el stock al vender.
   * **Producto sin control de inventario:** se vende sin afectar stock (por ejemplo,
     servicios).
4. Defina el IVA:
   * **Producto que maneja IVA** y su **porcentaje** (por ejemplo 19% o 5%).
   * **Precio incluye IVA** o **precio no incluye IVA**.
5. **Guarde.** Después puede **editar** el producto o **activarlo/desactivarlo**.

**El IVA en palabras simples:**

```txt
Si el precio incluye IVA, el valor que escribe ya es el valor final para el cliente.
Si el precio no incluye IVA, Prismia suma el IVA encima del precio.
Si el producto no maneja IVA, el IVA será 0.
```

> "Sin IVA" significa que el impuesto es 0, **no** que el precio sea 0.

---

## 10. Inventario

En **Inventario** puede:

* **Ver el inventario** y **buscar productos**.
* **Revisar el stock** de cada producto.
* **Revisar el stock bajo** (productos por debajo del mínimo).
* **Ver el historial** de movimientos (entradas y salidas).
* **Hacer un ajuste de inventario:** corregir el stock de un producto.
* **Hacer un conteo físico:**
  1. Crear un nuevo conteo.
  2. Registrar las cantidades contadas.
  3. **Guardar** el conteo.
  4. **Revisar las diferencias** (lo que dice el sistema vs. lo contado).
  5. **Aplicar** el conteo para actualizar el stock.
* **Exportar** reportes de inventario (por ejemplo, a Excel), si su instalación lo permite.

> **Advertencia:** un ajuste o un conteo aplicado **cambia el stock real** del sistema. Revise
> bien las diferencias **antes de aplicarlo**.

---

## 11. Caja y turnos

Un **turno de caja** es el periodo entre que **abre** la caja y la **cierra** (por ejemplo, un
día o un turno de trabajo). Las ventas se registran dentro de un turno.

En **Caja** puede:

* **Abrir caja** e **ingresar el monto inicial** (la base con la que arranca).
* **Registrar ingresos manuales** (dinero que entra por fuera de las ventas).
* **Registrar egresos manuales** (dinero que sale).
* **Registrar gastos** del negocio.
* **Ver los movimientos** del turno.
* **Cerrar caja** al terminar.
* **Imprimir o exportar** el turno (por ejemplo a Excel), si su instalación lo permite.

Al cerrar, Prismia le muestra:

```txt
El monto esperado es lo que Prismia calcula que debería haber en efectivo.
El monto contado es lo que usted cuenta físicamente.
La diferencia muestra si sobra o falta dinero.
```

* Si la **diferencia es 0**, la caja cuadró.
* Si es **negativa**, falta dinero. Si es **positiva**, sobra.

> El monto esperado se calcula sobre el **efectivo**. Las transferencias y tarjetas se
> controlan por su propio total.

---

## 12. Ventas (POS)

Para registrar una venta:

1. Entre a **Ventas**.
2. **Busque el producto** por nombre o código.
3. **Agréguelo al carrito.**
4. **Cambie la cantidad** si es necesario.
5. **Aplique un descuento** si corresponde (por unidad).
6. **Seleccione el cliente** (o use el cliente general / cree un cliente rápido).
7. **Revise el subtotal, el IVA y el total** antes de cobrar.
8. **Registre el pago:**
   * **Efectivo** (Prismia le ayuda con el cambio).
   * **Transferencia, tarjeta u otros medios.**
   * **Pago mixto:** una misma venta pagada con **varios medios** a la vez.
9. **Finalice la venta.**
10. **Imprima el ticket** para el cliente.
11. Puede **consultar el detalle** de la venta cuando lo necesite.

**Advertencias:**

* Debe haber **caja abierta** si el sistema lo requiere.
* **Revise los productos y cantidades** antes de finalizar.
* **Verifique el medio de pago** registrado.
* **No cierre la ventana** mientras se registra la venta.

---

## 13. POS móvil o táctil

Prismia incluye una **vista de ventas pensada para pantalla táctil / móvil**, además del POS
principal. Sirve para vender de forma más cómoda en pantallas táctiles.

* **Cómo abrirla:** desde la sección de ventas, en la opción de vista móvil/táctil.
* **Para qué sirve:** vender de manera rápida con botones grandes, ideal para mostradores con
  pantalla táctil.
* **Diferencia frente al POS principal:** es la misma operación de venta, con una
  presentación adaptada al toque.

> El funcionamiento del POS móvil en otros dispositivos puede depender de la red local, de
> certificados de seguridad o de la cámara del equipo. Esto **queda Pendiente de confirmar en
> su instalación** y debe revisarse con soporte si lo va a usar desde un celular o tablet.

---

## 14. Historial de ventas

En **Historial de ventas** puede:

* **Entrar al historial** y ver las ventas registradas.
* **Buscar y filtrar** ventas (por ejemplo, por fecha), según los filtros disponibles.
* **Ver el detalle** de una venta.
* **Volver a imprimir el ticket** de una venta.
* **Revisar el estado** de la venta (por ejemplo, **pagada** o **anulada**).

---

## 15. Anulación de ventas

**Anular una venta** es dejarla sin efecto cuando hubo un error o una devolución total.

**Tenga en cuenta que al anular una venta:**

* la venta queda marcada como **anulada**;
* **afecta la caja** (se reversa el dinero del turno);
* **afecta el inventario** (se reintegra el stock vendido);
* **se anulan los pagos** de esa venta;
* **se genera una nota crédito interna** (ver sección 16);
* **queda un registro de auditoría** con quién la anuló, cuándo y por qué.

**Pasos generales:**

1. **Busque la venta** en el historial.
2. **Entre al detalle** de la venta.
3. Use la opción de **anular**, si está disponible para su usuario.
4. **Escriba el motivo** de la anulación.
5. **Confirme.**

> **Advertencia:** la anulación **no** debe usarse para corregir cualquier error sin revisar.
> Afecta caja, inventario y reportes. Úsela solo con un motivo claro.

---

## 16. Notas crédito internas

* **¿Qué son?** Documentos **internos** que dejan constancia cuando se anula una venta.
* **¿Cuándo se generan?** Automáticamente al **anular una venta**.
* **¿Dónde se consultan?** En la sección de **Notas crédito**.
* **¿Cómo ver el detalle?** Abriendo la nota crédito desde su listado.
* **¿Cómo imprimir?** Desde la opción de impresión de la nota crédito.

```txt
Las notas crédito de Prismia son internas y sirven como soporte operativo dentro del sistema. No reemplazan una nota crédito electrónica DIAN.
```

---

## 17. Proveedores

En **Proveedores** puede:

* **Crear proveedor.**
* **Editar proveedor.**
* **Activar / desactivar proveedor.**

**Datos recomendados:** nombre o razón social, identificación, teléfono y contacto. Tener bien
los proveedores facilita registrar las compras.

---

## 18. Compras

En **Compras** registra la mercancía que compra a sus proveedores:

1. **Registrar compra.**
2. **Seleccionar el proveedor.**
3. **Agregar los productos** comprados.
4. Indicar la **cantidad** y el **costo unitario** de cada producto.
5. Registrar el **IVA de la compra**, si aplica.
6. Revisar el **total de la compra**.
7. Indicar si es **compra de contado** o **a crédito**:
   * **Contado:** queda pagada.
   * **A crédito:** queda un **saldo pendiente** (cuentas por pagar).
8. Registrar **pagos a proveedores** cuando abone o pague el saldo.
9. **Imprimir la compra**, si su instalación lo permite.

> **Advertencia:** las compras **actualizan el inventario** (suman stock) y pueden **cambiar
> el costo promedio** de los productos. Por eso conviene registrarlas bien y a tiempo.

---

## 19. Cotizaciones

Una **cotización** es una propuesta de precios para el cliente, **antes** de la venta.

1. **Crear cotización.**
2. **Seleccionar el cliente.**
3. **Agregar los productos** y cantidades.
4. **Revisar el total.**
5. **Guardar.**
6. **Imprimir** para entregar al cliente.
7. **Convertir a venta**, si el cliente acepta y la opción está disponible.

```txt
Una cotización no es una venta hasta que se convierte o se registra como venta.
```

---

## 20. Remisiones

Una **remisión** es un documento de **entrega o despacho** de productos.

1. **Crear remisión.**
2. **Seleccionar el cliente.**
3. **Agregar los productos** y cantidades.
4. **Guardar.**
5. **Imprimir.**
6. **Convertir a venta**, si corresponde y la opción está disponible.

```txt
Una remisión es un documento de entrega o despacho. Revise su uso interno antes de convertirla en venta.
```

---

## 21. Reportes

En **Reportes** puede consultar el comportamiento del negocio. Según su instalación, podrá ver:

* **Ventas** (del día/periodo).
* **IVA** cobrado.
* **Descuentos** aplicados.
* **Medios de pago** (efectivo, transferencia, tarjeta, otros).
* **Utilidad** y **margen** (cuánto gana el negocio).
* **Caja** (turnos y movimientos).
* **Inventario** (stock y valoración).

> El reporte exacto de **productos más vendidos** y el detalle de cada reporte pueden variar
> según la versión instalada. Si una métrica puntual no aparece, queda **Pendiente de
> confirmar** en su instalación.

---

## 22. Backups (copias de seguridad)

* **¿Qué es un backup?** Una **copia de seguridad** de la información de su negocio.
* **¿Por qué es importante?** Si pasa algo con el computador, una copia le permite recuperar
  sus datos.
* **¿Cuándo hacerlo?** Con frecuencia: al final del día o del turno, y antes de cambios
  importantes.
* **¿Quién debe hacerlo?** El **administrador**, normalmente con apoyo de soporte.
* **¿Cómo crear un backup?** Desde la sección de **Backups**, en el **modo soporte**. Puede
  ser necesario **desbloquear el modo soporte** con una clave.
* **¿Dónde se guardan?** En una carpeta de backups del equipo. Puede **descargar el backup** y
  **abrir la carpeta** donde se guardan, si la opción está disponible.

> **Advertencia:** el backup contiene **información del negocio**. Guárdelo en un lugar
> seguro y, si es posible, también **fuera del computador** (por ejemplo, en una memoria USB
> o en un disco aparte).

---

## 23. Restauración de backup

**Restaurar** es cargar una copia de seguridad para volver a un estado anterior.

Tenga muy en cuenta:

* La restauración **reemplaza (sobrescribe) la información actual** por la del backup.
* Requiere el **modo soporte** desbloqueado.
* Debe hacerse **con apoyo técnico**.
* Antes de restaurar, Prismia **crea un backup de emergencia** de los datos actuales.
* Después de restaurar, la **aplicación puede reiniciarse** sola.

```txt
No restaure un backup si no está seguro de que corresponde al negocio correcto. La restauración reemplaza la información actual.
```

> Si tiene dudas, **no restaure** y contacte a soporte antes de continuar.

---

## 24. Licencia del sistema

Prismia funciona con una **licencia** instalada en el equipo. En la sección de **Licencia**
puede ver:

* **Estado de la licencia.**
* **Periodo de prueba inicial** (al instalar por primera vez).
* **Días de gracia** (un tiempo adicional después del vencimiento para renovar).
* **Licencia vencida** (cuando termina el periodo y aún no se renueva).

**Para activar o renovar:**

* En la pantalla de **activación** se ingresa el **código de activación**.
* Prismia usa una **huella del equipo** (un identificador del computador) que se incluye al
  pedir la renovación.
* La **renovación** suele hacerse contactando al proveedor por **WhatsApp**, enviando los
  datos que el sistema muestra.
* Si la licencia está vencida, aparece una **pantalla de licencia vencida** y se debe renovar
  para seguir operando.

> No necesita conocer los detalles técnicos internos de la licencia. Solo siga las
> instrucciones de la pantalla y, para renovar, contacte al proveedor por los medios indicados.

---

## 25. Error conocido: Prismia ya está abierto o puerto ocupado

A veces, al abrir Prismia, puede aparecer un **mensaje de error** indicando que la aplicación
no pudo iniciar (por ejemplo, un aviso de "puerto en uso").

```txt
Este mensaje puede aparecer si Prismia ya está abierto, si se abrió dos veces muy rápido o si quedó un proceso anterior en segundo plano.
```

**Solución temporal:**

1. **Cierre Prismia por completo.**
2. **Reinicie el computador.**
3. **Abra Prismia una sola vez** y espere a que cargue.
4. Si el problema continúa, **contacte a soporte**.

```txt
Este error no significa que se dañó la información del negocio.
```

> Evite abrir Prismia varias veces seguidas. Ábralo una sola vez y espere a que cargue.

---

## 26. Errores comunes y soluciones rápidas

| Problema | Posible causa | Qué hacer |
|---|---|---|
| No puedo iniciar sesión | Usuario o contraseña incorrectos, o usuario desactivado | Verifique usuario/contraseña; pida a un administrador que revise o restablezca su usuario. |
| No aparece un producto | Producto inactivo, mal escrito o sin crear | Busque por otro nombre/código; revise en Productos si está activo o créelo. |
| No puedo vender | No hay caja abierta o el producto no tiene stock | Abra la caja; revise el stock o la configuración del producto. |
| No hay caja abierta | El turno no se ha abierto | Vaya a Caja y abra el turno con el monto inicial. |
| Diferencia en caja | Faltó registrar un movimiento o hubo un descuadre | Revise movimientos del turno; registre gastos/ingresos faltantes; cuente de nuevo. |
| No imprime el ticket | Impresora apagada, sin papel o no seleccionada | Revise la impresora y vuelva a imprimir desde el historial. |
| Licencia vencida | Terminó el periodo de licencia | Renueve siguiendo la pantalla de licencia (contacte al proveedor). |
| Prismia ya abierto / puerto ocupado | La app ya estaba abierta o quedó un proceso anterior | Cierre Prismia, reinicie el equipo y ábralo una sola vez (ver sección 25). |
| No puedo restaurar un backup | Falta modo soporte o no se confirmó la acción | No improvise; restaure solo con apoyo de soporte (ver sección 23). |
| Stock incorrecto | Ventas, compras o ajustes mal registrados | Revise el historial de inventario y haga un conteo físico para corregir. |

> No intente soluciones técnicas avanzadas por su cuenta. Ante la duda, contacte a soporte.

---

## 27. Buenas prácticas

* **Abra la caja** al iniciar el turno.
* **Cierre la caja** al finalizar el turno.
* **Registre las compras** oportunamente.
* **Revise los costos** de los productos (afectan la utilidad).
* **Haga backups** con frecuencia.
* **No comparta usuarios** ni contraseñas.
* **Revise el inventario** periódicamente.
* **Anule ventas solo con un motivo claro.**
* **Guarde los backups fuera del computador** si es posible (USB, disco aparte).
* **Mantenga los datos del negocio actualizados** (productos, precios, clientes, proveedores).

---

## 28. Glosario para usuarios

| Término | Qué significa |
|---|---|
| **Producto** | Lo que usted vende. |
| **Cliente** | A quién le vende. |
| **Proveedor** | A quién le compra. |
| **Venta** | El registro de algo vendido. |
| **Ticket** | El comprobante que se imprime para el cliente. |
| **Caja** | El dinero y los movimientos del punto de venta. |
| **Turno** | El periodo entre abrir y cerrar la caja. |
| **IVA** | El impuesto que se cobra sobre algunas ventas. |
| **Descuento** | Una rebaja en el precio. |
| **Inventario** | El control de las cantidades de productos. |
| **Stock** | La cantidad disponible de un producto. |
| **Compra** | La mercancía que usted compra a un proveedor. |
| **Cotización** | Una propuesta de precios antes de vender. |
| **Remisión** | Un documento de entrega o despacho. |
| **Nota crédito interna** | Documento interno que queda al anular una venta (no es fiscal). |
| **Backup** | Una copia de seguridad de su información. |
| **Restauración** | Cargar una copia de seguridad (reemplaza la información actual). |
| **Licencia** | El permiso para usar Prismia en su equipo. |
| **Huella del equipo** | Un identificador del computador, usado para activar/renovar la licencia. |

---

## 29. Estado del documento

* **Documento:** Manual de uso para clientes.
* **Versión inicial:** `0.1`.
* **Basado en:**

```txt
docs/manuales/00_MAPA_DOCUMENTAL_PRISMIA.md
docs/manuales/02_GUIA_CONTABLE_LOGICA_NEGOCIO.md
docs/manuales/03_GUIA_TECNICA_INTERNA_JOSE.md
```

* **Fecha de creación:** 2026-06-24.
* Esta es una **versión inicial**, antes de agregar **capturas de pantalla**.
* **Todavía no es PDF ni Word final**; por ahora es solo el texto del manual.
* Las partes marcadas como **Pendiente de confirmar en su instalación** dependen de cómo quedó
  configurado Prismia en cada negocio y deben revisarse con soporte.

---

*Fin del Manual de uso de Prismia POS Local (versión `0.1`).*
