/**
 * Compras: lo que mueve inventario, costos, precios y pagos.
 *
 * - El stock suma sin residuos (metros, kilos con decimales).
 * - Costo promedio ponderado; si el stock venía negativo (venta sin stock),
 *   esas unidades ya se vendieron y el promedio toma el costo de la compra.
 * - IVA de la compra: responsable de IVA -> el costo va sin IVA (se descuenta);
 *   no responsable -> el IVA es parte del costo.
 * - El precio de venta solo cambia con un precio escrito a propósito.
 * - De contado se guarda con qué se pagó; a crédito queda la deuda.
 * - La fecha de compra debe ser válida y no futura.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { crearEntornoPrueba, silenciarErrores } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('compras-logica');
const { db, usuarioAdmin, crearProducto, idMedioPago } = entorno;

const compras = entorno.requerir('src/modules/compras/compras.service');

const idProveedor = Number(db.prepare(`INSERT INTO proveedores (nombre_comercial) VALUES ('Distribuidora Prueba')`).run().lastInsertRowid);
const EFECTIVO = idMedioPago('efectivo');

function hoyLocal() {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function linea(idProducto, datos = {}) {
    return { id_producto: idProducto, cantidad: 1, costo_unitario: 1000, descuento_porcentaje: 0, porcentaje_iva: 0, ...datos };
}

function comprar(lineas, extra = {}) {
    return silenciarErrores(() => compras.guardarCompra({
        id_proveedor: idProveedor,
        fecha_compra: hoyLocal(),
        tipo_soporte: 'factura_proveedor',
        condicion_pago: 'contado',
        id_medio_pago: EFECTIVO,
        lineas,
        ...extra,
    }, { usuario: usuarioAdmin, ip: '127.0.0.1', userAgent: 'pruebas' }));
}

function producto(idProducto) {
    return db.prepare('SELECT stock_actual, costo_promedio, ultimo_costo, precio_venta FROM productos WHERE id_producto = ?')
        .get(idProducto);
}

test('el stock suma sin residuos y el costo promedio es ponderado', () => {
    const cable = crearProducto({ nombre: 'Cable', precio: 3000, costo: 1000, stock: 1.1, unidad: 'm', decimal: true });

    const resultado = comprar([linea(cable, { cantidad: 2.2, costo_unitario: 1200 })]);
    assert.equal(resultado.ok, true, (resultado.errores || []).join(' '));

    const despues = producto(cable);
    assert.equal(despues.stock_actual, 3.3, '1,1 + 2,2 = 3,3 exacto');
    assert.equal(despues.ultimo_costo, 1200);
    assert.equal(despues.costo_promedio, 1133, '(1,1 × 1.000 + 2,2 × 1.200) / 3,3 = 1.133,3');

    const movimiento = db.prepare(`SELECT stock_anterior, stock_nuevo, cantidad FROM movimientos_inventario
        WHERE id_producto = ? AND tipo_movimiento = 'compra'`).get(cable);
    assert.deepEqual(movimiento, { stock_anterior: 1.1, stock_nuevo: 3.3, cantidad: 2.2 });
});

test('con stock negativo (venta sin stock) el promedio toma el costo de la compra', () => {
    const tornillo = crearProducto({ nombre: 'Tornillo', precio: 500, costo: 800, permiteSinStock: true });
    db.prepare('UPDATE productos SET stock_actual = -5, costo_promedio = 800 WHERE id_producto = ?').run(tornillo);

    assert.equal(comprar([linea(tornillo, { cantidad: 10, costo_unitario: 1000 })]).ok, true);

    const despues = producto(tornillo);
    assert.equal(despues.stock_actual, 5);
    assert.equal(despues.costo_promedio, 1000, 'las 5 unidades negativas ya se vendieron: no cuentan');
});

test('IVA de la compra: no responsable lo suma al costo; responsable lo descuenta', () => {
    const martillo = crearProducto({ nombre: 'Martillo', precio: 20000, costo: 9000, stock: 0 });

    db.prepare('UPDATE configuracion_negocio SET maneja_iva = 0').run();
    assert.equal(comprar([linea(martillo, { costo_unitario: 10000, porcentaje_iva: 19 })]).ok, true);
    assert.equal(producto(martillo).ultimo_costo, 11900, 'no responsable: el IVA pagado es costo');

    db.prepare('UPDATE configuracion_negocio SET maneja_iva = 1').run();
    assert.equal(comprar([linea(martillo, { costo_unitario: 10000, porcentaje_iva: 19 })]).ok, true);
    assert.equal(producto(martillo).ultimo_costo, 10000, 'responsable: el IVA se descuenta');

    db.prepare('UPDATE configuracion_negocio SET maneja_iva = 0').run();
});

test('el precio de venta solo cambia con un precio escrito a propósito', () => {
    const pala = crearProducto({ nombre: 'Pala', precio: 30000, costo: 15000, stock: 0 });

    // Antes: marcar "Actualizar" con 0 % de ganancia dejaba el precio igual al costo
    const sinPrecio = comprar([linea(pala, { costo_unitario: 16000, actualizar_precio_venta: 1, ganancia_sobre_costo_porcentaje: 0 })]);
    assert.equal(sinPrecio.ok, false);
    assert.match(sinPrecio.errores.join(' '), /nuevo precio de venta/);
    assert.equal(producto(pala).precio_venta, 30000);

    assert.equal(comprar([linea(pala, { costo_unitario: 16000 })]).ok, true);
    assert.equal(producto(pala).precio_venta, 30000, 'sin pedirlo, el precio no cambia');

    assert.equal(comprar([linea(pala, { costo_unitario: 16000, actualizar_precio_venta: 1, precio_venta_nuevo: 32000 })]).ok, true);
    assert.equal(producto(pala).precio_venta, 32000);
});

test('de contado se guarda con qué se pagó; a crédito queda la deuda', () => {
    const brocha = crearProducto({ nombre: 'Brocha', precio: 8000, costo: 4000, stock: 0 });

    const sinMedio = comprar([linea(brocha)], { id_medio_pago: '' });
    assert.equal(sinMedio.ok, false);
    assert.match(sinMedio.errores.join(' '), /con qué se pagó/);

    const contado = comprar([linea(brocha, { cantidad: 3, costo_unitario: 4000 })], { referencia_pago: 'TR-77' });
    assert.equal(contado.ok, true, (contado.errores || []).join(' '));

    const compraContado = db.prepare('SELECT total, total_pagado, saldo_pendiente, estado_pago FROM compras WHERE id_compra = ?')
        .get(contado.compra.id_compra);
    assert.deepEqual(compraContado, { total: 12000, total_pagado: 12000, saldo_pendiente: 0, estado_pago: 'pagada' });

    const pago = db.prepare('SELECT monto_pagado, id_medio_pago, referencia_pago, origen_pago, estado FROM pagos_compras_proveedores WHERE id_compra = ?')
        .get(contado.compra.id_compra);
    assert.deepEqual(pago, { monto_pagado: 12000, id_medio_pago: EFECTIVO, referencia_pago: 'TR-77', origen_pago: 'tesoreria', estado: 'registrado' });

    const [anio, mes, dia] = hoyLocal().split('-').map(Number);
    const vence = new Date(anio, mes - 1, dia + 30);
    const credito = comprar([linea(brocha, { cantidad: 2, costo_unitario: 4000 })], {
        condicion_pago: 'credito',
        id_medio_pago: '',
        fecha_vencimiento: `${vence.getFullYear()}-${String(vence.getMonth() + 1).padStart(2, '0')}-${String(vence.getDate()).padStart(2, '0')}`,
    });
    assert.equal(credito.ok, true, (credito.errores || []).join(' '));

    const compraCredito = db.prepare('SELECT total_pagado, saldo_pendiente, estado_pago FROM compras WHERE id_compra = ?')
        .get(credito.compra.id_compra);
    assert.deepEqual(compraCredito, { total_pagado: 0, saldo_pendiente: 8000, estado_pago: 'pendiente' });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pagos_compras_proveedores WHERE id_compra = ?').get(credito.compra.id_compra).n, 0);
});

test('la fecha de compra debe ser válida y no futura', () => {
    const lija = crearProducto({ nombre: 'Lija', precio: 1000, costo: 500, stock: 0 });

    const futura = comprar([linea(lija)], { fecha_compra: '2099-01-01' });
    assert.equal(futura.ok, false);
    assert.match(futura.errores.join(' '), /futura/);

    const invalida = comprar([linea(lija)], { fecha_compra: '2026-13-45' });
    assert.equal(invalida.ok, false);
    assert.match(invalida.errores.join(' '), /no es válida/);
});

test('los totales de la compra cuadran al peso con descuento, IVA y cantidades decimales', () => {
    const alambre = crearProducto({ nombre: 'Alambre', precio: 3000, costo: 2000, stock: 0, unidad: 'm', decimal: true });
    const panel = crearProducto({ nombre: 'Panel', precio: 30000, costo: 20000, stock: 0 });

    const resultado = comprar([
        linea(alambre, { cantidad: 2.5, costo_unitario: 2499, descuento_porcentaje: 5, porcentaje_iva: 19 }),
        linea(panel, { cantidad: 3, costo_unitario: 21000, porcentaje_iva: 19 }),
    ]);
    assert.equal(resultado.ok, true, (resultado.errores || []).join(' '));

    const cabecera = db.prepare('SELECT subtotal, iva_total, total FROM compras WHERE id_compra = ?').get(resultado.compra.id_compra);
    const detalle = db.prepare('SELECT subtotal_linea, iva_linea, total_linea FROM compras_detalle WHERE id_compra = ? ORDER BY id_compra_detalle')
        .all(resultado.compra.id_compra);

    // Línea 1: 2.374 × 2,5 = 5.935 + IVA 1.128 = 7.063 · Línea 2: 63.000 + 11.970 = 74.970
    assert.deepEqual(detalle, [
        { subtotal_linea: 5935, iva_linea: 1128, total_linea: 7063 },
        { subtotal_linea: 63000, iva_linea: 11970, total_linea: 74970 },
    ]);
    assert.deepEqual(cabecera, { subtotal: 68935, iva_total: 13098, total: 82033 });
});
