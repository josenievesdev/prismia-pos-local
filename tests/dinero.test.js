/**
 * Pruebas del flujo de dinero: ventas, pagos, cambio, IVA, stock, anulación,
 * movimientos de caja, cierre y conversión de cotizaciones.
 *
 * Las pruebas corren en orden y comparten un turno de caja, como en un día
 * real de operación. Cada una verifica deltas, no valores absolutos.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { crearEntornoPrueba, silenciarErrores } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('dinero');
const { db, usuarioAdmin, crearProducto, idMedioPago, stock, turnoAbierto } = entorno;

const ventas = entorno.requerir('src/modules/ventas/ventas.service');
const caja = entorno.requerir('src/modules/caja/caja.service');
const cajaTotales = entorno.requerir('src/modules/caja/caja.totales');
const cotizaciones = entorno.requerir('src/modules/cotizaciones/cotizaciones.service');
const fechas = entorno.requerir('src/utils/fechas');

const EFECTIVO = idMedioPago('efectivo');
const NEQUI = idMedioPago('nequi');
const DEBITO = idMedioPago('tarjeta_debito');

const BASE_INICIAL = 100000;

const productos = {
    bombillo: crearProducto({ nombre: 'Bombillo LED', precio: 2800, costo: 1000, stock: 100 }),
    tornillo: crearProducto({ nombre: 'Tornillo', precio: 120, costo: 40, stock: 800 }),
    martillo: crearProducto({ nombre: 'Martillo', precio: 24900, costo: 12500, stock: 27, iva: 19, ivaIncluido: true }),
    panel: crearProducto({ nombre: 'Panel LED', precio: 28900, costo: 14500, stock: 50, iva: 19, ivaIncluido: true }),
    alambre: crearProducto({ nombre: 'Alambre por metro', precio: 2499, costo: 1252, stock: 1000, unidad: 'm', decimal: true, iva: 19 }),
    sinStock: crearProducto({ nombre: 'Termo bajo pedido', precio: 30000, costo: 10000, stock: 7, permiteSinStock: true }),
    controlado: crearProducto({ nombre: 'Producto escaso', precio: 5000, costo: 3000, stock: 2 }),
};

function vender(items, pagos, extra = {}) {
    return silenciarErrores(() => ventas.registrarVentaPOS({
        idUsuario: usuarioAdmin.id_usuario,
        payload: { items, pagos, ...extra },
    }));
}

function pagosDeVenta(idVenta) {
    return db.prepare('SELECT metodo_pago, monto, monto_recibido, cambio_entregado FROM pagos_venta WHERE id_venta = ? ORDER BY id_pago_venta').all(idVenta);
}

function esperadoEnPantalla() {
    return caja.obtenerEstadoCaja().turnoAbierto.monto_esperado_calculado;
}

let ventaEfectivo;

test('abrir caja con base inicial y no permitir una segunda caja abierta', () => {
    const apertura = caja.abrirCaja({ datosFormulario: { monto_inicial: String(BASE_INICIAL) }, usuario: usuarioAdmin });
    assert.equal(apertura.ok, true, apertura.mensaje);

    const segunda = silenciarErrores(() => caja.abrirCaja({ datosFormulario: { monto_inicial: '5000' }, usuario: usuarioAdmin }));
    assert.equal(segunda.ok, false);

    const turno = turnoAbierto();
    assert.equal(turno.monto_inicial, BASE_INICIAL);
    assert.equal(turno.monto_esperado, BASE_INICIAL);
});

test('venta en efectivo con cambio: el pago aplica el total y el turno guarda el efectivo', () => {
    const antes = turnoAbierto();
    const r = vender([{ id_producto: productos.bombillo, cantidad: 3 }], [{ id_medio_pago: EFECTIVO, monto_recibido: 10000 }]);

    assert.equal(r.ok, true, r.mensaje);
    assert.equal(r.venta.total, 8400);
    assert.equal(r.venta.cambio_entregado, 1600);

    const [pago] = pagosDeVenta(r.venta.id_venta);
    assert.deepEqual(pago, { metodo_pago: 'efectivo', monto: 8400, monto_recibido: 10000, cambio_entregado: 1600 });

    // Regresión del bug de calcularTotalesTurno duplicada: antes sumaba 0.
    const despues = turnoAbierto();
    assert.equal(despues.total_efectivo - antes.total_efectivo, 8400);
    assert.equal(despues.monto_esperado - antes.monto_esperado, 8400);
    assert.equal(despues.total_ventas - antes.total_ventas, 8400);

    ventaEfectivo = r.venta;
});

test('pago mixto tarjeta + efectivo: el cambio sale solo del efectivo', () => {
    const antes = turnoAbierto();
    const r = vender(
        [{ id_producto: productos.martillo, cantidad: 1 }, { id_producto: productos.tornillo, cantidad: 5 }],
        [
            { id_medio_pago: DEBITO, monto_recibido: 20000, referencia: 'VOUCHER-1' },
            { id_medio_pago: EFECTIVO, monto_recibido: 10000 },
        ]
    );

    assert.equal(r.ok, true, r.mensaje);
    assert.equal(r.venta.total, 25500);

    const pagos = pagosDeVenta(r.venta.id_venta);
    const tarjeta = pagos.find((p) => p.metodo_pago === 'tarjeta');
    const efectivo = pagos.find((p) => p.metodo_pago === 'efectivo');

    assert.equal(tarjeta.monto, 20000);
    assert.equal(tarjeta.cambio_entregado, 0);
    assert.equal(efectivo.monto, 5500);
    assert.equal(efectivo.cambio_entregado, 4500);

    const despues = turnoAbierto();
    assert.equal(despues.total_tarjeta - antes.total_tarjeta, 20000);
    assert.equal(despues.total_efectivo - antes.total_efectivo, 5500);
    assert.equal(despues.monto_esperado - antes.monto_esperado, 5500);
});

test('no se permite cambio sin efectivo ni medios con referencia vacía', () => {
    const sobrepago = vender([{ id_producto: productos.bombillo, cantidad: 1 }], [{ id_medio_pago: NEQUI, monto_recibido: 5000, referencia: 'X1' }]);
    assert.equal(sobrepago.ok, false);
    assert.match(sobrepago.mensaje, /cambio/i);

    const sinReferencia = vender([{ id_producto: productos.bombillo, cantidad: 1 }], [{ id_medio_pago: NEQUI, monto_recibido: 2800 }]);
    assert.equal(sinReferencia.ok, false);
    assert.match(sinReferencia.mensaje, /referencia/i);

    const insuficiente = vender([{ id_producto: productos.bombillo, cantidad: 2 }], [{ id_medio_pago: EFECTIVO, monto_recibido: 5000 }]);
    assert.equal(insuficiente.ok, false);
});

test('IVA no incluido con cantidad decimal (2,5 m de alambre)', () => {
    const r = vender([{ id_producto: productos.alambre, cantidad: 2.5 }], [{ id_medio_pago: EFECTIVO, monto_recibido: 10000 }]);

    assert.equal(r.ok, true, r.mensaje);
    // 2.499 × 2,5 = 6.247,5 → 6.248; IVA 19% = 1.187; total 7.435
    assert.equal(r.venta.subtotal, 6248);
    assert.equal(r.venta.impuesto_total, 1187);
    assert.equal(r.venta.total, 7435);
});

test('IVA incluido en el precio (3 paneles a 28.900)', () => {
    const r = vender([{ id_producto: productos.panel, cantidad: 3 }], [{ id_medio_pago: EFECTIVO, monto_recibido: 86700 }]);

    assert.equal(r.ok, true, r.mensaje);
    assert.equal(r.venta.total, 86700);
    assert.equal(r.venta.subtotal, 72857);
    assert.equal(r.venta.impuesto_total, 13843);
});

test('cantidades y montos inválidos se rechazan', () => {
    const casos = [
        vender([{ id_producto: productos.bombillo, cantidad: 1.5 }], [{ id_medio_pago: EFECTIVO, monto_recibido: 10000 }]),
        vender([{ id_producto: productos.bombillo, cantidad: -2 }], [{ id_medio_pago: EFECTIVO, monto_recibido: 1 }]),
        vender([{ id_producto: productos.bombillo, cantidad: 'abc' }], [{ id_medio_pago: EFECTIVO, monto_recibido: 1 }]),
        vender([{ id_producto: productos.bombillo, cantidad: 1 }], [{ id_medio_pago: EFECTIVO, monto_recibido: -5000 }, { id_medio_pago: EFECTIVO, monto_recibido: 7800 }]),
        vender([], [{ id_medio_pago: EFECTIVO, monto_recibido: 1000 }]),
        vender([{ id_producto: 999999, cantidad: 1 }], [{ id_medio_pago: EFECTIVO, monto_recibido: 1000 }]),
    ];

    casos.forEach((resultado, indice) => assert.equal(resultado.ok, false, `caso ${indice} debió rechazarse`));
});

test('venta sin stock permitida deja el stock en negativo', () => {
    const stockInicial = stock(productos.sinStock);
    const cantidad = stockInicial + 3;

    const r = vender([{ id_producto: productos.sinStock, cantidad }], [{ id_medio_pago: EFECTIVO, monto_recibido: 30000 * cantidad }]);

    assert.equal(r.ok, true, r.mensaje);
    assert.equal(stock(productos.sinStock), -3);

    const movimiento = db.prepare(`
        SELECT stock_anterior, stock_nuevo FROM movimientos_inventario
        WHERE id_producto = ? AND tipo_movimiento = 'venta'
        ORDER BY id_movimiento_inventario DESC LIMIT 1
    `).get(productos.sinStock);

    assert.deepEqual(movimiento, { stock_anterior: stockInicial, stock_nuevo: -3 });
});

test('producto que no permite venta sin stock no se vende por encima del stock', () => {
    const r = vender([{ id_producto: productos.controlado, cantidad: 3 }], [{ id_medio_pago: EFECTIVO, monto_recibido: 15000 }]);

    assert.equal(r.ok, false);
    assert.match(r.mensaje, /Stock insuficiente/);
    assert.equal(stock(productos.controlado), 2);
});

test('la fecha de la venta la asigna el servidor en hora local', () => {
    const r = vender(
        [{ id_producto: productos.bombillo, cantidad: 1 }],
        [{ id_medio_pago: EFECTIVO, monto_recibido: 2800 }],
        { fecha_venta: '2031-01-01' }
    );

    assert.equal(r.ok, true, r.mensaje);

    const { fecha_venta: fechaVenta } = db.prepare('SELECT fecha_venta FROM ventas WHERE id_venta = ?').get(r.venta.id_venta);
    assert.equal(fechaVenta.slice(0, 10), fechas.fechaLocalISO());
    assert.match(fechaVenta, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('anulación revierte stock, caja y genera nota crédito por el total', () => {
    const stockAntes = stock(productos.bombillo);
    const esperadoAntes = turnoAbierto().monto_esperado;

    const r = silenciarErrores(() => ventas.anularVentaCompleta({
        idVenta: ventaEfectivo.id_venta,
        idUsuario: usuarioAdmin.id_usuario,
        payload: { motivo_anulacion: 'Cliente devolvió los bombillos' },
    }));

    assert.equal(r.ok, true, r.mensaje);
    assert.equal(stock(productos.bombillo) - stockAntes, 3);
    assert.equal(esperadoAntes - turnoAbierto().monto_esperado, 8400);

    const venta = db.prepare('SELECT estado FROM ventas WHERE id_venta = ?').get(ventaEfectivo.id_venta);
    assert.equal(venta.estado, 'anulada');

    const nota = db.prepare('SELECT total FROM notas_credito WHERE id_venta = ?').get(ventaEfectivo.id_venta);
    assert.equal(nota.total, 8400);

    const segunda = silenciarErrores(() => ventas.anularVentaCompleta({
        idVenta: ventaEfectivo.id_venta,
        idUsuario: usuarioAdmin.id_usuario,
        payload: { motivo_anulacion: 'Intento de doble anulación' },
    }));
    assert.equal(segunda.ok, false);
});

test('gasto en efectivo baja el esperado; gasto por transferencia no', () => {
    const categoria = db.prepare(`SELECT id_categoria_gasto FROM categorias_gasto WHERE estado = 'activo' LIMIT 1`).get();

    const antes = turnoAbierto().monto_esperado;
    const gastoEfectivo = caja.registrarGastoDesdeCaja({
        datosFormulario: { id_categoria_gasto: categoria.id_categoria_gasto, id_medio_pago: EFECTIVO, monto: '3000', descripcion: 'Bolsas para empacar' },
        usuario: usuarioAdmin,
    });
    assert.equal(gastoEfectivo.ok, true, gastoEfectivo.mensaje);
    assert.equal(antes - turnoAbierto().monto_esperado, 3000);

    const antesTransferencia = turnoAbierto().monto_esperado;
    const gastoTransferencia = caja.registrarGastoDesdeCaja({
        datosFormulario: { id_categoria_gasto: categoria.id_categoria_gasto, id_medio_pago: NEQUI, monto: '7000', descripcion: 'Pago de internet', referencia_pago: 'NQ-1' },
        usuario: usuarioAdmin,
    });
    assert.equal(gastoTransferencia.ok, true, gastoTransferencia.mensaje);
    assert.equal(turnoAbierto().monto_esperado, antesTransferencia);
});

test('ingreso manual suma al esperado y el egreso no puede superar el efectivo', () => {
    const antes = turnoAbierto().monto_esperado;
    const ingreso = caja.registrarMovimientoManual({
        datosFormulario: { tipo_movimiento: 'ingreso_manual', id_medio_pago: EFECTIVO, monto: '20000', descripcion: 'Cambio traído del banco' },
        usuario: usuarioAdmin,
    });
    assert.equal(ingreso.ok, true, ingreso.mensaje);
    assert.equal(turnoAbierto().monto_esperado - antes, 20000);

    const egresoExcesivo = caja.registrarMovimientoManual({
        datosFormulario: { tipo_movimiento: 'egreso_manual', id_medio_pago: EFECTIVO, monto: '99999999', descripcion: 'Retiro excesivo de prueba' },
        usuario: usuarioAdmin,
    });
    assert.equal(egresoExcesivo.ok, false);
});

test('conversión de cotización a venta suma al turno', () => {
    const consumidorFinal = db.prepare('SELECT id_cliente FROM clientes WHERE es_consumidor_final = 1 LIMIT 1').get();

    const cotizacion = silenciarErrores(() => cotizaciones.crearCotizacion({
        idUsuario: usuarioAdmin.id_usuario,
        payload: { id_cliente: consumidorFinal.id_cliente, items: [{ id_producto: productos.bombillo, cantidad: 2 }], validez_dias: 15 },
    }));
    assert.equal(cotizacion.ok, true, cotizacion.mensaje);

    const antes = turnoAbierto();
    const conversion = silenciarErrores(() => cotizaciones.convertirCotizacionAVenta({
        idCotizacion: cotizacion.cotizacion.id_cotizacion,
        idUsuario: usuarioAdmin.id_usuario,
        payload: { pago: { id_medio_pago: EFECTIVO, monto_recibido: 6000 } },
    }));
    assert.equal(conversion.ok, true, conversion.mensaje);

    const despues = turnoAbierto();
    assert.equal(despues.total_efectivo - antes.total_efectivo, 5600);
    assert.equal(despues.monto_esperado - antes.monto_esperado, 5600);
});

test('invariante: los totales guardados del turno son iguales a los derivados de movimientos', () => {
    const turno = turnoAbierto();
    const calculados = cajaTotales.calcularTotalesTurno(db, turno.id_turno_caja);

    Object.entries(calculados).forEach(([campo, valor]) => {
        assert.equal(turno[campo], valor, `campo ${campo}`);
    });

    // Y coinciden con lo que muestra la pantalla de caja.
    assert.equal(esperadoEnPantalla(), turno.monto_esperado);
});

test('invariante: cada venta cuadra (total = líneas = pagos aplicados)', () => {
    const descuadres = db.prepare(`
        SELECT v.id_venta, v.total,
            (SELECT COALESCE(SUM(total_linea), 0) FROM detalle_ventas d WHERE d.id_venta = v.id_venta) AS lineas,
            (SELECT COALESCE(SUM(monto), 0) FROM pagos_venta p WHERE p.id_venta = v.id_venta) AS pagos
        FROM ventas v
    `).all().filter((v) => v.total !== v.lineas || v.total !== v.pagos);

    assert.deepEqual(descuadres, []);
});

test('invariante: numeración de facturas consecutiva y sin duplicados', () => {
    const consecutivos = db.prepare(`SELECT consecutivo FROM comprobantes WHERE prefijo = 'FV' ORDER BY consecutivo`).all().map((c) => c.consecutivo);

    consecutivos.forEach((valor, indice) => assert.equal(valor, indice + 1));
});

test('cierre de caja: guarda la diferencia y la foto final de los totales', () => {
    const turno = turnoAbierto();
    const esperado = esperadoEnPantalla();

    const r = caja.cerrarCaja({
        datosFormulario: { monto_contado: String(esperado - 1000), observaciones_cierre: 'Faltaron mil pesos' },
        usuario: usuarioAdmin,
    });
    assert.equal(r.ok, true, r.mensaje);

    const cerrado = db.prepare('SELECT * FROM turnos_caja WHERE id_turno_caja = ?').get(turno.id_turno_caja);
    assert.equal(cerrado.estado, 'cerrado');
    assert.equal(cerrado.diferencia, -1000);
    assert.equal(cerrado.monto_esperado, esperado);

    // El historial de turnos debe mostrar el mismo esperado (antes salía falso).
    const enHistorial = caja.obtenerEstadoCaja().turnosRecientes.find((t) => t.id_turno_caja === turno.id_turno_caja);
    assert.equal(enHistorial.monto_esperado_calculado, esperado);
});

test('no se puede vender ni mover caja con la caja cerrada', () => {
    const venta = vender([{ id_producto: productos.bombillo, cantidad: 1 }], [{ id_medio_pago: EFECTIVO, monto_recibido: 2800 }]);
    assert.equal(venta.ok, false);

    const movimiento = silenciarErrores(() => caja.registrarMovimientoManual({
        datosFormulario: { tipo_movimiento: 'ingreso_manual', id_medio_pago: EFECTIVO, monto: '1000', descripcion: 'Con caja cerrada' },
        usuario: usuarioAdmin,
    }));
    assert.equal(movimiento.ok, false);
});
