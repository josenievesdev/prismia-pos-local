/**
 * Pruebas del migrador sobre una base "legacy" (versión 0) que reproduce los
 * bugs históricos: totales de turno en cero, fechas de venta desfasadas y
 * CHECK de stock no negativo.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const { configurarVariables, requerir } = require('./helpers/entorno');

configurarVariables('migraciones');

const logOriginal = console.log;
console.log = () => {};
const db = requerir('src/config/db');
requerir('src/database/init-db').inicializarBaseDatos();
console.log = logOriginal;

const migrator = requerir('src/database/migrator');

function localtime(utc) {
    return db.prepare(`SELECT datetime(?, 'localtime') AS valor`).get(utc).valor;
}

function sumarDias(fecha, dias) {
    return db.prepare(`SELECT datetime(?, ?) AS valor`).get(fecha, `${dias} days`).valor;
}

// ---------- Datos legacy con los bugs ----------

const idUsuario = Number(db.prepare(`
    INSERT INTO usuarios (nombre, correo, contrasena_hash, estado)
    VALUES ('Legacy', 'legacy@pruebas.local', 'x', 'activo')
`).run().lastInsertRowid);

const efectivo = db.prepare(`SELECT id_medio_pago FROM medios_pago WHERE codigo = 'efectivo'`).get().id_medio_pago;
const nequi = db.prepare(`SELECT id_medio_pago FROM medios_pago WHERE codigo = 'nequi'`).get().id_medio_pago;
const idCliente = db.prepare(`SELECT id_cliente FROM clientes WHERE es_consumidor_final = 1`).get().id_cliente;

// Turno cerrado con totales en 0 (bug), pero movimientos reales.
const idTurno = Number(db.prepare(`
    INSERT INTO turnos_caja (id_usuario_apertura, monto_inicial, total_ventas, total_efectivo,
        monto_esperado, monto_contado, diferencia, estado, fecha_cierre)
    VALUES (?, 50000, 15000, 0, 50000, 60000, 0, 'cerrado', CURRENT_TIMESTAMP)
`).run(idUsuario).lastInsertRowid);

const insertarMovimiento = db.prepare(`
    INSERT INTO movimientos_caja (id_turno_caja, id_usuario, tipo_movimiento, metodo_pago, monto, id_medio_pago)
    VALUES (?, ?, ?, ?, ?, ?)
`);
insertarMovimiento.run(idTurno, idUsuario, 'venta', 'efectivo', 10000, efectivo);
insertarMovimiento.run(idTurno, idUsuario, 'venta', 'transferencia', 5000, nequi);

const CREADO_UTC = '2026-05-31 03:12:41';
const fechaReal = localtime(CREADO_UTC);
const desfaseLocalHoras = db.prepare(`SELECT (julianday(datetime(?, 'localtime')) - julianday(?)) * 24 AS h`).get(CREADO_UTC, CREADO_UTC).h;

const insertarVenta = db.prepare(`
    INSERT INTO ventas (id_cliente, id_usuario, id_turno_caja, numero_venta, fecha_venta,
        subtotal, descuento_total, impuesto_total, total, estado, total_pagado, saldo_pendiente,
        cambio_entregado, total_costo, utilidad_bruta, origen, tipo_venta, requiere_factura, creado_en)
    VALUES (?, ?, ?, ?, ?, 1000, 0, 0, 1000, 'pagada', 1000, 0, 0, 0, 1000, 'pos', 'contado', 0, ?)
`);

const ventasLegacy = {
    utcMasLocal: Number(insertarVenta.run(idCliente, idUsuario, idTurno, 'FV-L1', sumarDias(fechaReal, 1), CREADO_UTC).lastInsertRowid),
    guardadaEnUtc: Number(insertarVenta.run(idCliente, idUsuario, idTurno, 'FV-L2', CREADO_UTC, CREADO_UTC).lastInsertRowid),
    correcta: Number(insertarVenta.run(idCliente, idUsuario, idTurno, 'FV-L3', fechaReal, CREADO_UTC).lastInsertRowid),
    fechaManualDistinta: Number(insertarVenta.run(idCliente, idUsuario, idTurno, 'FV-L4', sumarDias(fechaReal, -3), CREADO_UTC).lastInsertRowid),
};

const idProducto = Number(db.prepare(`
    INSERT INTO productos (codigo_interno, nombre, precio_venta, stock_actual, permite_venta_sin_stock)
    VALUES ('LEG-1', 'Producto legacy', 1000, 5, 1)
`).run().lastInsertRowid);

db.prepare(`
    INSERT INTO movimientos_inventario (id_producto, id_usuario, tipo_movimiento, cantidad, stock_anterior, stock_nuevo)
    VALUES (?, ?, 'entrada_inicial', 5, 0, 5)
`).run(idProducto, idUsuario);

const secuenciaProductosAntes = db.prepare(`SELECT seq FROM sqlite_sequence WHERE name = 'productos'`).get().seq;
const fecha = (idVenta) => db.prepare('SELECT fecha_venta FROM ventas WHERE id_venta = ?').get(idVenta).fecha_venta;

// ---------- Pruebas ----------

test('la base legacy arranca en versión 0 y rechaza stock negativo', () => {
    assert.equal(migrator.obtenerVersionActual(db), 0);
    assert.throws(() => db.prepare('UPDATE productos SET stock_actual = -1 WHERE id_producto = ?').run(idProducto), /CHECK/);
});

let resultado;

test('aplica todas las migraciones con respaldo previo', () => {
    resultado = migrator.aplicarMigracionesPendientes(db, { crearRespaldo: true, log: () => {} });

    assert.equal(resultado.version_inicial, 0);
    assert.equal(resultado.version_final, migrator.obtenerVersionObjetivo());
    assert.ok(fs.existsSync(resultado.respaldo), 'debe existir el respaldo pre-migración');
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
});

test('repara los totales del turno desde sus movimientos sin tocar el cierre', () => {
    const turno = db.prepare('SELECT * FROM turnos_caja WHERE id_turno_caja = ?').get(idTurno);

    assert.equal(turno.total_efectivo, 10000);
    assert.equal(turno.total_transferencia, 5000);
    assert.equal(turno.total_ventas, 15000);
    assert.equal(turno.monto_esperado, 60000);
    assert.equal(turno.monto_contado, 60000);
    assert.equal(turno.diferencia, 0);
});

test('corrige solo las fechas con firma de desfase', () => {
    assert.equal(fecha(ventasLegacy.utcMasLocal), fechaReal);
    assert.equal(fecha(ventasLegacy.correcta), fechaReal);
    assert.equal(fecha(ventasLegacy.fechaManualDistinta), sumarDias(fechaReal, -3));

    if (Math.abs(desfaseLocalHoras) > 0.05) {
        assert.equal(fecha(ventasLegacy.guardadaEnUtc), fechaReal);
    } else {
        assert.equal(fecha(ventasLegacy.guardadaEnUtc), CREADO_UTC);
    }

    const auditoria = db.prepare(`SELECT COUNT(*) AS total FROM auditoria WHERE accion LIKE 'migracion_002%'`).get();
    assert.equal(auditoria.total, 1);
});

test('permite stock negativo y conserva datos y AUTOINCREMENT', () => {
    db.prepare('UPDATE productos SET stock_actual = -3 WHERE id_producto = ?').run(idProducto);
    assert.equal(db.prepare('SELECT stock_actual FROM productos WHERE id_producto = ?').get(idProducto).stock_actual, -3);

    db.prepare(`
        INSERT INTO movimientos_inventario (id_producto, id_usuario, tipo_movimiento, cantidad, stock_anterior, stock_nuevo)
        VALUES (?, ?, 'venta', 8, 5, -3)
    `).run(idProducto, idUsuario);

    assert.equal(db.prepare(`SELECT seq FROM sqlite_sequence WHERE name = 'productos'`).get().seq, secuenciaProductosAntes);

    // Las demás restricciones siguen activas.
    assert.throws(() => db.prepare('UPDATE productos SET precio_venta = -1 WHERE id_producto = ?').run(idProducto), /CHECK/);
});

test('crea los índices de rendimiento', () => {
    const plan = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM detalle_ventas WHERE id_venta = 1').all().map((p) => p.detail).join(' ');
    assert.match(plan, /idx_detalle_ventas_venta/);
});

test('es idempotente: un segundo arranque no hace nada', () => {
    const segundo = migrator.aplicarMigracionesPendientes(db, { crearRespaldo: true, log: () => {} });
    assert.deepEqual(segundo.aplicadas, []);
    assert.equal(segundo.respaldo, null);
});

test('se niega a abrir una base de una versión más nueva', () => {
    const version = migrator.obtenerVersionActual(db);
    db.pragma(`user_version = ${version + 1}`);

    assert.throws(() => migrator.aplicarMigracionesPendientes(db, { log: () => {} }), /más nueva/);

    db.pragma(`user_version = ${version}`);
});
