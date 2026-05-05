const db = require('../../config/db');

function obtenerResumenVentasPorFecha(fechaISO) {
    return db.prepare(`
        SELECT
            COUNT(*) AS total_documentos,
            COALESCE(SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END), 0) AS ventas_pagadas,
            COALESCE(SUM(CASE WHEN estado = 'anulada' THEN 1 ELSE 0 END), 0) AS ventas_anuladas,
            COALESCE(SUM(total), 0) AS total_bruto,
            COALESCE(SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END), 0) AS total_neto,
            COALESCE(SUM(CASE WHEN estado = 'anulada' THEN total ELSE 0 END), 0) AS total_anulado,
            COALESCE(AVG(CASE WHEN estado = 'pagada' THEN total ELSE NULL END), 0) AS ticket_promedio,
            COALESCE(SUM(CASE WHEN estado = 'pagada' THEN utilidad_bruta ELSE 0 END), 0) AS utilidad_bruta
        FROM ventas
        WHERE date(fecha_venta) = date(@fecha)
    `).get({ fecha: fechaISO });
}

function obtenerProductosVendidosPorFecha(fechaISO) {
    return db.prepare(`
        SELECT
            COALESCE(SUM(dv.cantidad), 0) AS productos_vendidos
        FROM detalle_ventas dv
        INNER JOIN ventas v
            ON v.id_venta = dv.id_venta
        WHERE v.estado = 'pagada'
            AND date(v.fecha_venta) = date(@fecha)
    `).get({ fecha: fechaISO });
}

function obtenerPagosPorMedioPorFecha(fechaISO) {
    return db.prepare(`
        SELECT
            COALESCE(mp.nombre, pv.entidad, pv.metodo_pago, 'Sin medio') AS medio_pago_nombre,
            COALESCE(mp.tipo, pv.metodo_pago, 'otro') AS medio_pago_tipo,
            COALESCE(mp.afecta_efectivo_caja, CASE WHEN pv.metodo_pago = 'efectivo' THEN 1 ELSE 0 END) AS afecta_efectivo_caja,
            COUNT(*) AS operaciones,

            COALESCE(SUM(CASE
                WHEN v.estado = 'pagada' AND pv.estado = 'registrado'
                THEN pv.monto
                ELSE 0
            END), 0) AS ingresos,

            COALESCE(SUM(CASE
                WHEN v.estado = 'anulada' OR pv.estado = 'anulado'
                THEN pv.monto
                ELSE 0
            END), 0) AS anulaciones,

            COALESCE(SUM(CASE
                WHEN v.estado = 'pagada' AND pv.estado = 'registrado'
                THEN pv.monto
                ELSE 0
            END), 0)
            -
            COALESCE(SUM(CASE
                WHEN v.estado = 'anulada' OR pv.estado = 'anulado'
                THEN pv.monto
                ELSE 0
            END), 0) AS neto
        FROM pagos_venta pv
        INNER JOIN ventas v
            ON v.id_venta = pv.id_venta
        LEFT JOIN medios_pago mp
            ON mp.id_medio_pago = pv.id_medio_pago
        WHERE date(v.fecha_venta) = date(@fecha)
        GROUP BY
            COALESCE(mp.nombre, pv.entidad, pv.metodo_pago, 'Sin medio'),
            COALESCE(mp.tipo, pv.metodo_pago, 'otro'),
            COALESCE(mp.afecta_efectivo_caja, CASE WHEN pv.metodo_pago = 'efectivo' THEN 1 ELSE 0 END)
        ORDER BY neto DESC, ingresos DESC
    `).all({ fecha: fechaISO });
}

function obtenerTurnoAbierto() {
    return db.prepare(`
        SELECT
            t.*,
            ua.nombre AS usuario_apertura_nombre
        FROM turnos_caja t
        INNER JOIN usuarios ua
            ON ua.id_usuario = t.id_usuario_apertura
        WHERE t.estado = 'abierto'
        ORDER BY datetime(t.fecha_apertura) DESC, t.id_turno_caja DESC
        LIMIT 1
    `).get();
}

function obtenerResumenMovimientosTurno(idTurnoCaja) {
    return db.prepare(`
        SELECT
            COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'venta' THEN m.monto ELSE 0 END), 0) AS ventas_turno,
            COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'anulacion' THEN m.monto ELSE 0 END), 0) AS anulaciones_turno,
            COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'ingreso_manual' THEN m.monto ELSE 0 END), 0) AS ingresos_manuales,
            COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'egreso_manual' THEN m.monto ELSE 0 END), 0) AS egresos_manuales,

            COALESCE(SUM(CASE
                WHEN COALESCE(mp.afecta_efectivo_caja, CASE WHEN m.metodo_pago = 'efectivo' THEN 1 ELSE 0 END) = 1
                THEN CASE
                    WHEN m.tipo_movimiento IN ('venta', 'ingreso_manual') THEN m.monto
                    WHEN m.tipo_movimiento IN ('anulacion', 'devolucion', 'egreso_manual') THEN -m.monto
                    ELSE 0
                END
                ELSE 0
            END), 0) AS efectivo_neto
        FROM movimientos_caja m
        LEFT JOIN medios_pago mp
            ON mp.id_medio_pago = m.id_medio_pago
        WHERE m.id_turno_caja = @id_turno_caja
    `).get({ id_turno_caja: idTurnoCaja });
}

function obtenerPagosPorMedioTurno(idTurnoCaja) {
    return db.prepare(`
        SELECT
            COALESCE(mp.nombre, m.entidad_pago, m.metodo_pago, 'Sin medio') AS medio_pago_nombre,
            COALESCE(mp.tipo, m.metodo_pago, 'otro') AS medio_pago_tipo,
            COUNT(*) AS operaciones,

            COALESCE(SUM(CASE
                WHEN m.tipo_movimiento IN ('venta', 'ingreso_manual')
                THEN m.monto
                ELSE 0
            END), 0) AS ingresos,

            COALESCE(SUM(CASE
                WHEN m.tipo_movimiento IN ('anulacion', 'devolucion', 'egreso_manual')
                THEN m.monto
                ELSE 0
            END), 0) AS salidas,

            COALESCE(SUM(CASE
                WHEN m.tipo_movimiento IN ('venta', 'ingreso_manual') THEN m.monto
                WHEN m.tipo_movimiento IN ('anulacion', 'devolucion', 'egreso_manual') THEN -m.monto
                ELSE 0
            END), 0) AS neto
        FROM movimientos_caja m
        LEFT JOIN medios_pago mp
            ON mp.id_medio_pago = m.id_medio_pago
        WHERE m.id_turno_caja = @id_turno_caja
        GROUP BY
            COALESCE(mp.nombre, m.entidad_pago, m.metodo_pago, 'Sin medio'),
            COALESCE(mp.tipo, m.metodo_pago, 'otro')
        ORDER BY neto DESC, ingresos DESC
    `).all({ id_turno_caja: idTurnoCaja });
}

function obtenerAlertasStock() {
    return db.prepare(`
        SELECT
            id_producto,
            codigo_interno,
            nombre,
            stock_actual,
            stock_minimo,
            CASE WHEN stock_actual <= 0 THEN 'sin_stock' ELSE 'stock_bajo' END AS tipo_alerta
        FROM productos
        WHERE estado = 'activo'
            AND controla_inventario = 1
            AND (stock_actual <= 0 OR stock_actual <= stock_minimo)
        ORDER BY
            CASE WHEN stock_actual <= 0 THEN 0 ELSE 1 END,
            (stock_actual - stock_minimo) ASC,
            nombre ASC
        LIMIT 8
    `).all();
}

function obtenerResumenStock() {
    return db.prepare(`
        SELECT
            COALESCE(SUM(CASE WHEN stock_actual <= 0 THEN 1 ELSE 0 END), 0) AS productos_sin_stock,
            COALESCE(SUM(CASE WHEN stock_actual > 0 AND stock_actual <= stock_minimo THEN 1 ELSE 0 END), 0) AS productos_stock_bajo
        FROM productos
        WHERE estado = 'activo'
            AND controla_inventario = 1
    `).get();
}

function obtenerUltimasVentas(fechaISO) {
    return db.prepare(`
        SELECT
            v.id_venta,
            v.numero_venta,
            v.fecha_venta,
            v.estado,
            v.total,

            COALESCE(
                NULLIF(TRIM(c.razon_social), ''),
                NULLIF(TRIM(c.nombre_comercial), ''),
                NULLIF(TRIM(c.nombre), ''),
                'Consumidor final'
            ) AS cliente_nombre,

            GROUP_CONCAT(DISTINCT COALESCE(mp.nombre, pv.entidad, pv.metodo_pago)) AS medios_pago
        FROM ventas v
        LEFT JOIN clientes c
            ON c.id_cliente = v.id_cliente
        LEFT JOIN pagos_venta pv
            ON pv.id_venta = v.id_venta
        LEFT JOIN medios_pago mp
            ON mp.id_medio_pago = pv.id_medio_pago
        WHERE date(v.fecha_venta) = date(@fecha)
        GROUP BY v.id_venta
        ORDER BY datetime(v.fecha_venta) DESC, v.id_venta DESC
        LIMIT 6
    `).all({ fecha: fechaISO });
}

function obtenerUltimasAnulaciones(fechaISO) {
    return db.prepare(`
        SELECT
            v.id_venta,
            v.numero_venta,
            COALESCE(v.anulado_en, v.fecha_venta) AS fecha_anulacion,
            v.total,
            v.motivo_anulacion,
            COALESCE(u.nombre, 'Sin usuario') AS usuario_anulacion
        FROM ventas v
        LEFT JOIN usuarios u
            ON u.id_usuario = v.anulado_por
        WHERE v.estado = 'anulada'
            AND date(COALESCE(v.anulado_en, v.fecha_venta)) = date(@fecha)
        ORDER BY datetime(COALESCE(v.anulado_en, v.fecha_venta)) DESC, v.id_venta DESC
        LIMIT 6
    `).all({ fecha: fechaISO });
}

function obtenerTopProductos(fechaISO) {
    return db.prepare(`
        SELECT
            COALESCE(dv.codigo_interno, 'Sin código') AS codigo_interno,
            dv.nombre_producto,
            COALESCE(dv.unidad_abreviatura, 'und') AS unidad_abreviatura,
            COALESCE(SUM(dv.cantidad), 0) AS cantidad_vendida,
            COALESCE(SUM(dv.total_linea), 0) AS total_vendido
        FROM detalle_ventas dv
        INNER JOIN ventas v
            ON v.id_venta = dv.id_venta
        WHERE v.estado = 'pagada'
            AND date(v.fecha_venta) = date(@fecha)
        GROUP BY
            COALESCE(dv.codigo_interno, 'Sin código'),
            dv.nombre_producto,
            COALESCE(dv.unidad_abreviatura, 'und')
        ORDER BY total_vendido DESC, cantidad_vendida DESC
        LIMIT 6
    `).all({ fecha: fechaISO });
}

function obtenerVentasPorHora(fechaISO) {
    return db.prepare(`
        SELECT
            strftime('%H:00', v.fecha_venta) AS hora,
            COUNT(*) AS ventas,
            COALESCE(SUM(v.total), 0) AS total
        FROM ventas v
        WHERE v.estado = 'pagada'
            AND date(v.fecha_venta) = date(@fecha)
        GROUP BY strftime('%H', v.fecha_venta)
        ORDER BY strftime('%H', v.fecha_venta) ASC
    `).all({ fecha: fechaISO });
}

module.exports = {
    obtenerResumenVentasPorFecha,
    obtenerProductosVendidosPorFecha,
    obtenerPagosPorMedioPorFecha,
    obtenerTurnoAbierto,
    obtenerResumenMovimientosTurno,
    obtenerPagosPorMedioTurno,
    obtenerAlertasStock,
    obtenerResumenStock,
    obtenerUltimasVentas,
    obtenerUltimasAnulaciones,
    obtenerTopProductos,
    obtenerVentasPorHora,
};