const db = require('../../config/db');

function construirFiltroFechas(filtros = {}, aliasFecha = 'v.fecha_venta') {
    const condiciones = [];
    const params = {
        fecha_desde: String(filtros.fecha_desde || '').trim(),
        fecha_hasta: String(filtros.fecha_hasta || '').trim(),
    };

    if (params.fecha_desde) {
        condiciones.push(`date(${aliasFecha}) >= date(@fecha_desde)`);
    }

    if (params.fecha_hasta) {
        condiciones.push(`date(${aliasFecha}) <= date(@fecha_hasta)`);
    }

    return {
        where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '',
        and: condiciones.length ? `AND ${condiciones.join(' AND ')}` : '',
        params,
    };
}

function obtenerResumenVentas(filtros = {}) {
    const filtro = construirFiltroFechas(filtros, 'v.fecha_venta');

    return db.prepare(`
        SELECT
            COUNT(*) AS total_facturas,

            SUM(CASE WHEN v.estado = 'pagada' THEN 1 ELSE 0 END) AS facturas_pagadas,
            SUM(CASE WHEN v.estado = 'anulada' THEN 1 ELSE 0 END) AS facturas_anuladas,

            COALESCE(SUM(v.subtotal), 0) AS subtotal_bruto,
            COALESCE(SUM(v.impuesto_total), 0) AS iva_bruto,
            COALESCE(SUM(v.descuento_total), 0) AS descuento_bruto,
            COALESCE(SUM(v.total), 0) AS total_bruto,

            COALESCE(SUM(CASE WHEN v.estado = 'pagada' THEN v.subtotal ELSE 0 END), 0) AS subtotal_neto,
            COALESCE(SUM(CASE WHEN v.estado = 'pagada' THEN v.impuesto_total ELSE 0 END), 0) AS iva_neto,
            COALESCE(SUM(CASE WHEN v.estado = 'pagada' THEN v.descuento_total ELSE 0 END), 0) AS descuento_neto,
            COALESCE(SUM(CASE WHEN v.estado = 'pagada' THEN v.total ELSE 0 END), 0) AS total_neto,

            COALESCE(SUM(CASE WHEN v.estado = 'anulada' THEN v.subtotal ELSE 0 END), 0) AS subtotal_anulado,
            COALESCE(SUM(CASE WHEN v.estado = 'anulada' THEN v.impuesto_total ELSE 0 END), 0) AS iva_anulado,
            COALESCE(SUM(CASE WHEN v.estado = 'anulada' THEN v.descuento_total ELSE 0 END), 0) AS descuento_anulado,
            COALESCE(SUM(CASE WHEN v.estado = 'anulada' THEN v.total ELSE 0 END), 0) AS total_anulado,

            COALESCE(SUM(CASE WHEN v.estado = 'pagada' THEN v.total_costo ELSE 0 END), 0) AS costo_neto,
            COALESCE(SUM(CASE WHEN v.estado = 'pagada' THEN v.utilidad_bruta ELSE 0 END), 0) AS utilidad_bruta_neta
        FROM ventas v
        ${filtro.where}
    `).get(filtro.params);
}

function obtenerResumenNotasCredito(filtros = {}) {
    const filtro = construirFiltroFechas(filtros, 'nc.fecha_nota');

    return db.prepare(`
        SELECT
            COUNT(*) AS total_notas_credito,
            COALESCE(SUM(nc.subtotal), 0) AS subtotal_notas_credito,
            COALESCE(SUM(nc.impuesto_total), 0) AS iva_notas_credito,
            COALESCE(SUM(nc.total), 0) AS total_notas_credito_valor
        FROM notas_credito nc
        ${filtro.where}
          ${filtro.where ? "AND" : "WHERE"} nc.estado = 'emitida'
    `).get(filtro.params);
}

function obtenerResumenPagosPorMedio(filtros = {}) {
    const filtro = construirFiltroFechas(filtros, 'v.fecha_venta');

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
        WHERE 1 = 1
            ${filtro.and}
        GROUP BY
            COALESCE(mp.nombre, pv.entidad, pv.metodo_pago, 'Sin medio'),
            COALESCE(mp.tipo, pv.metodo_pago, 'otro'),
            COALESCE(mp.afecta_efectivo_caja, CASE WHEN pv.metodo_pago = 'efectivo' THEN 1 ELSE 0 END)
        ORDER BY neto DESC, ingresos DESC
    `).all(filtro.params);
}

function obtenerIvaPorTarifa(filtros = {}) {
    const filtro = construirFiltroFechas(filtros, 'v.fecha_venta');

    return db.prepare(`
        SELECT
            dv.porcentaje_iva,

            COALESCE(SUM(dv.subtotal), 0) AS subtotal_bruto,
            COALESCE(SUM(dv.impuesto_total), 0) AS iva_bruto,
            COALESCE(SUM(dv.total_linea), 0) AS total_bruto,

            COALESCE(SUM(CASE WHEN v.estado = 'pagada' THEN dv.subtotal ELSE 0 END), 0) AS subtotal_neto,
            COALESCE(SUM(CASE WHEN v.estado = 'pagada' THEN dv.impuesto_total ELSE 0 END), 0) AS iva_neto,
            COALESCE(SUM(CASE WHEN v.estado = 'pagada' THEN dv.total_linea ELSE 0 END), 0) AS total_neto,

            COALESCE(SUM(CASE WHEN v.estado = 'anulada' THEN dv.subtotal ELSE 0 END), 0) AS subtotal_anulado,
            COALESCE(SUM(CASE WHEN v.estado = 'anulada' THEN dv.impuesto_total ELSE 0 END), 0) AS iva_anulado,
            COALESCE(SUM(CASE WHEN v.estado = 'anulada' THEN dv.total_linea ELSE 0 END), 0) AS total_anulado
        FROM detalle_ventas dv
        INNER JOIN ventas v
            ON v.id_venta = dv.id_venta
        WHERE 1 = 1
            ${filtro.and}
        GROUP BY dv.porcentaje_iva
        ORDER BY dv.porcentaje_iva ASC
    `).all(filtro.params);
}

function obtenerProductosMasVendidos(filtros = {}) {
    const filtro = construirFiltroFechas(filtros, 'v.fecha_venta');

    return db.prepare(`
        SELECT
            COALESCE(dv.codigo_interno, 'Sin código') AS codigo_interno,
            dv.nombre_producto,
            COALESCE(dv.unidad_abreviatura, 'und') AS unidad_abreviatura,

            COALESCE(SUM(dv.cantidad), 0) AS cantidad_vendida,
            COALESCE(SUM(dv.subtotal), 0) AS subtotal_neto,
            COALESCE(SUM(dv.impuesto_total), 0) AS iva_neto,
            COALESCE(SUM(dv.total_linea), 0) AS total_neto,
            COALESCE(SUM(dv.costo_total), 0) AS costo_neto,
            COALESCE(SUM(dv.utilidad_bruta), 0) AS utilidad_bruta
        FROM detalle_ventas dv
        INNER JOIN ventas v
            ON v.id_venta = dv.id_venta
        WHERE v.estado = 'pagada'
            ${filtro.and}
        GROUP BY
            COALESCE(dv.codigo_interno, 'Sin código'),
            dv.nombre_producto,
            COALESCE(dv.unidad_abreviatura, 'und')
        ORDER BY total_neto DESC, cantidad_vendida DESC
        LIMIT 10
    `).all(filtro.params);
}

function obtenerVentasRecientes(filtros = {}) {
    const filtro = construirFiltroFechas(filtros, 'v.fecha_venta');

    return db.prepare(`
        SELECT
            v.id_venta,
            v.numero_venta,
            v.fecha_venta,
            v.estado,
            v.tipo_venta,
            v.subtotal,
            v.impuesto_total,
            v.total,
            v.total_costo,
            v.utilidad_bruta,

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
        ${filtro.where}
        GROUP BY v.id_venta
        ORDER BY datetime(v.fecha_venta) DESC, v.id_venta DESC
        LIMIT 12
    `).all(filtro.params);
}

module.exports = {
    obtenerResumenVentas,
    obtenerResumenNotasCredito,
    obtenerResumenPagosPorMedio,
    obtenerIvaPorTarifa,
    obtenerProductosMasVendidos,
    obtenerVentasRecientes,
};