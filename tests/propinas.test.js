/**
 * Propinas por mesero (perfil comidas y bares).
 *
 * Reglas: la propina es voluntaria, no es venta (no suma al total ni lleva
 * IVA), queda a nombre del mesero que atendió, la de efectivo está en el
 * cajón y una anulación la revierte. Las pruebas comparten un turno de caja.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { crearEntornoPrueba, silenciarErrores } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('propinas');
const { db, usuarioAdmin, crearProducto, idMedioPago, turnoAbierto } = entorno;

const ventas = entorno.requerir('src/modules/ventas/ventas.service');
const caja = entorno.requerir('src/modules/caja/caja.service');
const cajaTotales = entorno.requerir('src/modules/caja/caja.totales');
const meseros = entorno.requerir('src/modules/meseros/meseros.service');

const EFECTIVO = idMedioPago('efectivo');
const NEQUI = idMedioPago('nequi');

const plato = crearProducto({ nombre: 'Bandeja paisa', precio: 50000, costo: 21000, stock: 100 });
const bebida = crearProducto({ nombre: 'Limonada', precio: 15000, costo: 4000, stock: 100, iva: 19, ivaIncluido: true });

let laura;
let andres;
let ventaConPropina;

function vender(items, pagos, extra = {}) {
    return silenciarErrores(() => ventas.registrarVentaPOS({
        idUsuario: usuarioAdmin.id_usuario,
        payload: { items, pagos, ...extra },
    }));
}

function totalesTurno() {
    return cajaTotales.calcularTotalesTurno(db, turnoAbierto().id_turno_caja);
}

function pagos(idVenta) {
    return db.prepare(`
        SELECT id_medio_pago, monto, monto_propina, monto_recibido, cambio_entregado
        FROM pagos_venta WHERE id_venta = ? ORDER BY id_pago_venta
    `).all(idVenta);
}

test('preparación: caja abierta y dos meseros', () => {
    const apertura = caja.abrirCaja({ datosFormulario: { monto_inicial: '50000' }, usuario: usuarioAdmin });
    assert.equal(apertura.ok, true, apertura.mensaje);

    assert.equal(meseros.crearMesero({ nombre: 'Laura' }).ok, true);
    assert.equal(meseros.crearMesero({ nombre: 'Andrés' }).ok, true);
    assert.equal(meseros.crearMesero({ nombre: '  laura ' }).ok, false, 'no se repiten nombres (sin importar mayúsculas)');

    const activos = meseros.listarMeserosActivos();
    laura = activos.find((m) => m.nombre === 'Laura');
    andres = activos.find((m) => m.nombre === 'Andrés');
    assert.ok(laura && andres);
});

test('la propina exige mesero y un valor válido', () => {
    const items = [{ id_producto: plato, cantidad: 1 }];
    const pago = [{ id_medio_pago: EFECTIVO, monto_recibido: 60000 }];

    const sinMesero = vender(items, pago, { propina: 5000 });
    assert.equal(sinMesero.ok, false);
    assert.match(sinMesero.mensaje, /mesero/);

    assert.equal(vender(items, pago, { propina: -1, id_mesero: laura.id_mesero }).ok, false);
    assert.equal(vender(items, pago, { propina: 1500.5, id_mesero: laura.id_mesero }).ok, false);
    assert.equal(vender(items, pago, { propina: 50001, id_mesero: laura.id_mesero }).ok, false, 'no más que el total');

    meseros.cambiarEstadoMesero(andres.id_mesero, false);
    const inactivo = vender(items, pago, { propina: 5000, id_mesero: andres.id_mesero });
    assert.equal(inactivo.ok, false);
    assert.match(inactivo.mensaje, /inactivo/);
    meseros.cambiarEstadoMesero(andres.id_mesero, true);
});

test('venta en efectivo con propina: la venta no cambia y la propina va aparte', () => {
    const antes = totalesTurno();

    const r = vender(
        [{ id_producto: plato, cantidad: 2 }],
        [{ id_medio_pago: EFECTIVO, monto_recibido: 120000 }],
        { propina: 10000, id_mesero: laura.id_mesero }
    );

    assert.equal(r.ok, true, r.mensaje);
    ventaConPropina = r.venta;

    const venta = db.prepare('SELECT total, propina, id_mesero, cambio_entregado FROM ventas WHERE id_venta = ?').get(r.venta.id_venta);
    assert.deepEqual(venta, { total: 100000, propina: 10000, id_mesero: laura.id_mesero, cambio_entregado: 10000 });

    assert.deepEqual(pagos(r.venta.id_venta), [
        { id_medio_pago: EFECTIVO, monto: 100000, monto_propina: 10000, monto_recibido: 120000, cambio_entregado: 10000 },
    ]);

    const despues = totalesTurno();
    assert.equal(despues.total_ventas - antes.total_ventas, 100000, 'la propina no es venta');
    assert.equal(despues.total_propinas - antes.total_propinas, 10000);
    assert.equal(despues.total_propinas_efectivo - antes.total_propinas_efectivo, 10000);
    assert.equal(despues.monto_esperado - antes.monto_esperado, 110000, 'en el cajón queda venta + propina');
});

test('pago mixto: la propina se reparte en proporción y en enteros exactos', () => {
    const antes = totalesTurno();

    // 2 limonadas (IVA incluido) = 30.000; propina 3.000; se cobran 33.000
    const r = vender(
        [{ id_producto: bebida, cantidad: 2 }],
        [
            { id_medio_pago: NEQUI, monto_recibido: 13000, referencia: 'NQ-1' },
            { id_medio_pago: EFECTIVO, monto_recibido: 20000 },
        ],
        { propina: 3000, id_mesero: andres.id_mesero }
    );

    assert.equal(r.ok, true, r.mensaje);

    const filas = pagos(r.venta.id_venta);
    assert.equal(filas.reduce((s, p) => s + p.monto, 0), 30000, 'suma de la venta');
    assert.equal(filas.reduce((s, p) => s + p.monto_propina, 0), 3000, 'suma de la propina');

    // 13.000 × 3.000 / 33.000 = 1.181,8 y 20.000 × 3.000 / 33.000 = 1.818,2 → resto mayor a Nequi
    assert.deepEqual(filas.map((p) => p.monto_propina), [1182, 1818]);
    filas.forEach((p) => assert.equal(p.monto + p.monto_propina + p.cambio_entregado, p.monto_recibido));

    const despues = totalesTurno();
    assert.equal(despues.total_ventas - antes.total_ventas, 30000);
    assert.equal(despues.total_propinas - antes.total_propinas, 3000);
    assert.equal(despues.total_propinas_efectivo - antes.total_propinas_efectivo, 1818);
    assert.equal(despues.monto_esperado - antes.monto_esperado, 20000, 'solo entra al cajón el efectivo');
});

test('venta sin propina en modo comidas: el mesero queda registrado', () => {
    const r = vender(
        [{ id_producto: bebida, cantidad: 1 }],
        [{ id_medio_pago: EFECTIVO, monto_recibido: 15000 }],
        { id_mesero: laura.id_mesero }
    );

    assert.equal(r.ok, true, r.mensaje);
    const venta = db.prepare('SELECT propina, id_mesero FROM ventas WHERE id_venta = ?').get(r.venta.id_venta);
    assert.deepEqual(venta, { propina: 0, id_mesero: laura.id_mesero });
});

test('cierre: propinas por mesero, cada una a nombre de quien atendió', () => {
    const cierre = caja.obtenerDatosFormularioCierre();

    assert.deepEqual(
        cierre.propinasPorMesero.map(({ nombre, ventas_atendidas, total_vendido, total_propinas }) => ({ nombre, ventas_atendidas, total_vendido, total_propinas })),
        [
            { nombre: 'Laura', ventas_atendidas: 2, total_vendido: 115000, total_propinas: 10000 },
            { nombre: 'Andrés', ventas_atendidas: 1, total_vendido: 30000, total_propinas: 3000 },
        ]
    );

    assert.equal(cierre.turnoAbierto.total_propinas, 13000);
    assert.equal(cierre.turnoAbierto.total_propinas_efectivo, 11818);

    // El esperado que muestra el cierre es igual al de la fuente de verdad
    assert.equal(cierre.turnoAbierto.monto_esperado, totalesTurno().monto_esperado);
});

test('ticket: muestra la propina y el mesero', () => {
    const ticket = ventas.obtenerTicketVenta(ventaConPropina.id_venta);

    assert.equal(ticket.ok, true, ticket.mensaje);
    assert.equal(ticket.ticket.venta.propina, 10000);
    assert.equal(ticket.ticket.venta.mesero_nombre, 'Laura');
    assert.equal(ticket.ticket.pagos[0].monto_propina, 10000);
});

test('anulación: revierte la venta y también la propina', () => {
    const antes = totalesTurno();

    const r = silenciarErrores(() => ventas.anularVentaCompleta({
        idVenta: ventaConPropina.id_venta,
        idUsuario: usuarioAdmin.id_usuario,
        payload: { motivo_anulacion: 'Mesa equivocada' },
    }));

    assert.equal(r.ok, true, r.mensaje);

    const despues = totalesTurno();
    assert.equal(antes.total_ventas - despues.total_ventas, 100000);
    assert.equal(antes.total_propinas - despues.total_propinas, 10000);
    assert.equal(antes.monto_esperado - despues.monto_esperado, 110000);

    const laura2 = caja.obtenerDatosFormularioCierre().propinasPorMesero.find((m) => m.nombre === 'Laura');
    assert.equal(laura2.total_propinas, 0, 'la venta anulada ya no le suma propina');
});

test('invariante: en cada venta, pagos = venta + propina (al peso)', () => {
    const descuadres = db.prepare(`
        SELECT v.id_venta
        FROM ventas v
        JOIN pagos_venta p ON p.id_venta = v.id_venta
        GROUP BY v.id_venta
        HAVING SUM(p.monto) <> v.total
            OR SUM(p.monto_propina) <> v.propina
            OR SUM(p.monto_recibido) <> SUM(p.monto + p.monto_propina + p.cambio_entregado)
    `).all();

    assert.deepEqual(descuadres, []);
});
