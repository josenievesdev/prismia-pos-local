/**
 * Una venta hecha a las 11:30 p. m. pertenece a SU día en el dashboard,
 * los reportes y el historial (antes de la corrección quedaba al día
 * siguiente). También verifica que los filtros usen el índice de fecha.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { crearEntornoPrueba, silenciarErrores } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('reportes');
const { db, usuarioAdmin, crearProducto, idMedioPago } = entorno;

const ventas = entorno.requerir('src/modules/ventas/ventas.service');
const caja = entorno.requerir('src/modules/caja/caja.service');
const dashboardRepository = entorno.requerir('src/modules/dashboard/dashboard.repository');
const reportes = entorno.requerir('src/modules/reportes/reportes.service');

const DIA = '2026-05-30';
const NOCHE = `${DIA} 23:30:00`;

const producto = crearProducto({ precio: 10000, stock: 50 });
caja.abrirCaja({ datosFormulario: { monto_inicial: '0' }, usuario: usuarioAdmin });

const venta = silenciarErrores(() => ventas.registrarVentaPOS({
    idUsuario: usuarioAdmin.id_usuario,
    payload: { items: [{ id_producto: producto, cantidad: 1 }], pagos: [{ id_medio_pago: idMedioPago('efectivo'), monto_recibido: 10000 }] },
}));

// Simula una venta registrada a las 11:30 p. m. hora local de ese día.
db.prepare('UPDATE ventas SET fecha_venta = ? WHERE id_venta = ?').run(NOCHE, venta.venta.id_venta);

test('el dashboard cuenta la venta de la noche en su propio día', () => {
    assert.equal(dashboardRepository.obtenerResumenVentasPorFecha(DIA).total_neto, 10000);
    assert.equal(dashboardRepository.obtenerResumenVentasPorFecha('2026-05-31').total_neto, 0);
});

test('el reporte comercial con rango de un solo día incluye la venta', () => {
    const reporte = reportes.obtenerReporteComercial({ query: { fecha_desde: DIA, fecha_hasta: DIA } });
    assert.equal(reporte.resumenVentas.total_neto, 10000);

    const diaSiguiente = reportes.obtenerReporteComercial({ query: { fecha_desde: '2026-05-31', fecha_hasta: '2026-05-31' } });
    assert.equal(diaSiguiente.resumenVentas.total_neto, 0);
});

test('el historial de ventas filtra por el día correcto', () => {
    const historial = ventas.obtenerHistorialVentas({ query: { fecha_desde: DIA, fecha_hasta: DIA } });
    assert.equal(historial.total_resultados, 1);
});

test('los filtros por día usan el índice de fecha de ventas', () => {
    const plan = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT COUNT(*) FROM ventas
        WHERE fecha_venta >= date(?) AND fecha_venta < date(?, '+1 day')
    `).all(DIA, DIA).map((paso) => paso.detail).join(' ');

    assert.match(plan, /USING (COVERING )?INDEX idx_ventas_fecha/);
});
