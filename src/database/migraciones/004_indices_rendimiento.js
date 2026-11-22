/**
 * Migración 004 · Índices de rendimiento.
 *
 * - detalle_ventas(id_venta): cada ticket, detalle, anulación y reporte
 *   recorría la tabla completa.
 * - movimientos_inventario(id_producto, ...): historial por producto.
 */

function up(db) {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta
            ON detalle_ventas (id_venta);

        CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_producto
            ON movimientos_inventario (id_producto, id_movimiento_inventario);
    `);
}

module.exports = {
    version: 4,
    nombre: 'Índices de rendimiento para ventas e inventario',
    up,
};
