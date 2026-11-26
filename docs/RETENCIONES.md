# Retenciones (ReteFuente, ReteIVA, ReteICA) — estudio para implementar después

Estado: **pendiente**. Estudiado el 2026-11-25 a partir de cómo lo muestra Siigo Nube en la
factura de venta. Antes de construirlo, confirmar tarifas y bases vigentes con un contador:
cambian por decreto y por municipio.

## Qué son

Las retenciones **no son impuestos que cobra el negocio**: se las descuenta el cliente cuando el
cliente es agente retenedor (empresas, entidades del Estado, grandes contribuyentes y algunas
personas naturales). El cliente paga menos, entrega esa plata al Estado a nombre del negocio y le
da un certificado. Para el negocio no es una pérdida: es un **anticipo de sus propios impuestos**,
que el contador descuenta en las declaraciones.

| Retención | Impuesto que anticipa | Cómo se calcula | Quién la practica |
|---|---|---|---|
| **ReteFuente** | Renta | % sobre la base **sin IVA**, solo desde una base mínima | Agentes retenedores de renta |
| **ReteIVA** | IVA | 15 % (tarifa general) **del IVA** facturado | Grandes contribuyentes, entidades del Estado y quienes designe la DIAN |
| **ReteICA** | Industria y comercio (municipal) | Tarifa **por mil** según la actividad y el municipio | Según el estatuto de cada municipio |

## Cómo se ve en Siigo (factura de venta)

- Cada línea tiene dos columnas de impuesto:
  - **Impuesto Cargo**: lo que se *suma* (IVA 19 %, 5 %…).
  - **Impuesto Retención**: lo que el cliente *descuenta* (ReteFuente 11 %, 10 %, 6 %, 4 %,
    3,5 %, 2,5 %, 2 %, 1,5 %, 1 %). Va por línea porque una factura puede mezclar bienes y servicios.
- Al final: Total bruto, Descuentos, Subtotal, **ReteICA** (de toda la factura) y **Total Neto**.
- **Total Neto** es lo que el cliente paga de verdad y debe cuadrar con las formas de pago.

Porcentajes típicos del menú de ReteFuente: 2,5 % y 3,5 % compras (declarante / no declarante),
4 % y 6 % servicios, 10 % y 11 % honorarios; los demás son casos especiales.

## Ejemplo

Venta de $ 1.190.000 a una constructora que practica las tres (ReteICA de ejemplo):

| Concepto | Valor |
|---|---|
| Base (sin IVA) | $ 1.000.000 |
| IVA 19 % | $ 190.000 |
| **Total factura** | **$ 1.190.000** |
| − ReteFuente 2,5 % de la base | − $ 25.000 |
| − ReteIVA 15 % del IVA | − $ 28.500 |
| − ReteICA 5 por mil (ejemplo) | − $ 5.000 |
| **Neto que paga el cliente** | **$ 1.131.500** |

Sin retenciones en Prismia, esa venta queda con $ 58.500 de saldo pendiente, o la caja con un
faltante de $ 58.500.

## Datos de 2026 (verificar antes de usar)

- UVT 2026: **$ 52.374** (Resolución DIAN 000238 de 2025).
- ReteFuente por compras: el Decreto 572 de 2025 bajó la base mínima de 27 a **10 UVT**
  ($ 523.740 en 2026). Tarifa de compras generales: **2,5 %** a declarantes y **3,5 %** a no
  declarantes. Ojo: en 2026 el Consejo de Estado suspendió el decreto por un tiempo (mayo y junio,
  según las fuentes) y volvió a regir la base de 27 UVT. Por eso **nada de esto va fijo en el
  código**.
- ReteIVA: tarifa general **15 %** del IVA. Entre ciertos agentes retenedores (Estado, grandes
  contribuyentes, emisores de tarjetas) no se practica.
- ReteICA: cada municipio fija sus tarifas por mil según la actividad.

## Cuándo lo necesita Prismia

- **Ventas a personas en el mostrador: no.** Un consumidor final no retiene.
- **Ventas a empresas (cotizaciones, remisiones, ventas a crédito): sí.** Sin esto la caja o la
  cartera no cuadran, y el contador no tiene la lista de retenciones por cliente.

## Diseño propuesto

### Fase 1 · Retenciones que le practican al negocio (ventas)
1. **Configuración → Retenciones**: cada retención con nombre, tipo (ReteFuente / ReteIVA /
   ReteICA), tarifa (en % o por mil), base mínima (en UVT o en pesos) y si aplica a bienes o a
   servicios. Valor de la UVT del año, editable. Nada fijo en el código.
2. **Cliente**: "Este cliente me practica retenciones" y cuáles.
3. **Venta, cotización y remisión** con ese cliente:
   - ReteFuente sobre la base sin IVA, solo si supera la base mínima.
   - ReteIVA sobre el IVA.
   - ReteICA sobre la base.
   - La pantalla muestra Total → retenciones → **Neto a pagar**, con la aritmética exacta de
     `dinero-exacto` (enteros, redondeo medio hacia arriba).
4. **Pago**: las retenciones se registran como "pagado con certificado", un medio que no es
   efectivo ni banco. La venta queda pagada y la caja cuadra con lo que de verdad entró.
5. **Ticket y documentos**: muestran cada retención y el neto.
6. **Informe "Retenciones que me practicaron"** por cliente y por fechas, con número de
   certificado (se puede llenar después), para el contador.

### Fase 2 · Retenciones que practica el negocio (compras)
Si el negocio es agente retenedor: al pagar a proveedores, retener y llevar lo que se debe pagar
a la DIAN y al municipio (declaración mensual). Afecta Compras y Pagos a proveedores.

### Factura electrónica (cuando se integre)
El XML de la DIAN lleva las retenciones (WithholdingTaxTotal); el modelo debe guardarlas por
documento y por tipo para poder enviarlas.

## Modelo de datos sugerido

- `retenciones_configuracion`: id, nombre, tipo (`retefuente` | `reteiva` | `reteica`),
  tarifa en diezmilésimas (para cubrir % y por mil sin decimales), base mínima en UVT,
  aplica a (`bienes` | `servicios` | `ambos`), estado.
- `clientes_retenciones`: id_cliente, id_retencion.
- `documentos_retenciones`: tipo y id del documento (venta, remisión, cotización), id_retencion,
  base, tarifa, valor (pesos enteros), número de certificado (opcional).
- Medio de pago "Retención (certificado)": no afecta efectivo ni bancos.

## Fuentes consultadas (2026-11-25)

- [Retención en la fuente por compras 2026 (Alegra)](https://blog.alegra.com/colombia/retencion-en-la-fuente-por-compras/)
- [Retención en la fuente por compras 2026 (Actualícese)](https://actualicese.com/retencion-en-la-fuente-por-compras-2026/)
- [Tabla de retención en la fuente 2026 (Gerencie)](https://www.gerencie.com/tabla-de-retencion-en-la-fuente-2026.html)
- [Tarifas de retención en la fuente 2026 (Siigo)](https://www.siigo.com/blog/obligaciones-fiscales/tabla-de-retencion-en-la-fuente/)
- [Retención en la fuente por IVA – ReteIVA (Gerencie)](https://www.gerencie.com/retencion-en-la-fuente-por-iva-reteiva.html)
- [Tarifa general de ReteIVA para 2026 (Actualícese)](https://actualicese.com/tarifa-general-de-reteiva-para-2026/)
