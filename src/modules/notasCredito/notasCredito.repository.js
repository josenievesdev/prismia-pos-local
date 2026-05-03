const db = require('../../config/db');

function formatearNumeroDocumento(prefijo, longitudConsecutivo, consecutivo) {
    return `${prefijo}-${String(consecutivo).padStart(longitudConsecutivo, '0')}`;
}

function obtenerNumeracionNotaCredito() {
    const numeracion = db
        .prepare(`
            SELECT
                id_numeracion,
                codigo_documento,
                nombre_documento,
                prefijo,
                longitud_consecutivo,
                ultimo_consecutivo,
                tipo_comprobante,
                activo,
                observaciones,
                ultimo_consecutivo + 1 AS siguiente_consecutivo
            FROM numeraciones_documentos
            WHERE codigo_documento = 'nota_credito'
              AND activo = 1
            LIMIT 1
        `)
        .get();

    if (!numeracion) {
        return null;
    }

    return {
        ...numeracion,
        siguiente_numero: formatearNumeroDocumento(
            numeracion.prefijo,
            numeracion.longitud_consecutivo,
            numeracion.siguiente_consecutivo
        ),
    };
}

function construirFiltrosNotasCredito(filtros = {}) {
    const condiciones = [];
    const params = {
        busqueda: `%${String(filtros.busqueda || '').trim()}%`,
        estado: String(filtros.estado || '').trim(),
        documento_fiscal_estado: String(filtros.documento_fiscal_estado || '').trim(),
        fecha_desde: String(filtros.fecha_desde || '').trim(),
        fecha_hasta: String(filtros.fecha_hasta || '').trim(),
        limite: Number(filtros.limite || 20),
        offset: Number(filtros.offset || 0),
    };

    if (String(filtros.busqueda || '').trim()) {
        condiciones.push(`
            (
                nc.numero_nota_credito LIKE @busqueda
                OR v.numero_venta LIKE @busqueda
                OR c.documento LIKE @busqueda
                OR c.nombre LIKE @busqueda
                OR c.razon_social LIKE @busqueda
                OR c.nombre_comercial LIKE @busqueda
                OR nc.motivo LIKE @busqueda
            )
        `);
    }

    if (params.estado) {
        condiciones.push('nc.estado = @estado');
    }

    if (params.documento_fiscal_estado) {
        condiciones.push('nc.documento_fiscal_estado = @documento_fiscal_estado');
    }

    if (params.fecha_desde) {
        condiciones.push('date(nc.fecha_nota) >= date(@fecha_desde)');
    }

    if (params.fecha_hasta) {
        condiciones.push('date(nc.fecha_nota) <= date(@fecha_hasta)');
    }

    return {
        where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '',
        params,
    };
}

function seleccionarCamposNotaCredito() {
    return `
        nc.id_nota_credito,
        nc.id_venta,
        nc.id_cliente,
        nc.id_usuario,
        nc.id_anulacion_venta,
        nc.numero_nota_credito,
        nc.prefijo,
        nc.consecutivo,
        nc.tipo_nota,
        nc.origen,
        nc.fecha_nota,
        nc.subtotal,
        nc.descuento_total,
        nc.impuesto_total,
        nc.total,
        nc.motivo,
        nc.observaciones,
        nc.estado,
        nc.documento_fiscal_estado,
        nc.documento_fiscal_referencia,
        nc.cude,
        nc.qr,
        nc.xml,
        nc.respuesta_dian,
        nc.creada_en,
        nc.actualizada_en,
        nc.anulada_en,
        nc.anulada_por,
        nc.motivo_anulacion,

        v.numero_venta,
        v.fecha_venta,
        v.estado AS venta_estado,
        v.total AS venta_total,
        v.total_pagado AS venta_total_pagado,
        v.cambio_entregado AS venta_cambio_entregado,

        c.tipo_documento AS cliente_tipo_documento,
        c.documento AS cliente_documento,
        c.digito_verificacion AS cliente_digito_verificacion,
        c.nombre AS cliente_nombre,
        c.razon_social AS cliente_razon_social,
        c.nombre_comercial AS cliente_nombre_comercial,
        c.telefono AS cliente_telefono,
        c.celular AS cliente_celular,
        c.correo AS cliente_correo,
        c.correo_facturacion AS cliente_correo_facturacion,
        c.direccion AS cliente_direccion,
        c.departamento AS cliente_departamento,
        c.municipio AS cliente_municipio,

        COALESCE(
            NULLIF(TRIM(c.razon_social), ''),
            NULLIF(TRIM(c.nombre_comercial), ''),
            NULLIF(TRIM(c.nombre), ''),
            'Consumidor final'
        ) AS cliente_nombre_mostrar,

        u.nombre AS usuario_nombre,
        au.nombre AS anulada_por_nombre
    `;
}

function desdeNotasCreditoBase() {
    return `
        FROM notas_credito nc
        LEFT JOIN ventas v
            ON v.id_venta = nc.id_venta
        LEFT JOIN clientes c
            ON c.id_cliente = nc.id_cliente
        LEFT JOIN usuarios u
            ON u.id_usuario = nc.id_usuario
        LEFT JOIN usuarios au
            ON au.id_usuario = nc.anulada_por
    `;
}

function contarNotasCredito() {
    return db
        .prepare(`
            SELECT
                COUNT(*) AS total_notas_credito
            FROM notas_credito
        `)
        .get();
}

function contarDetalleNotasCredito() {
    return db
        .prepare(`
            SELECT
                COUNT(*) AS total_detalles
            FROM detalle_notas_credito
        `)
        .get();
}

function contarNotasCreditoListado(filtros = {}) {
    const { where, params } = construirFiltrosNotasCredito(filtros);

    return db
        .prepare(`
            SELECT COUNT(*) AS total
            ${desdeNotasCreditoBase()}
            ${where}
        `)
        .get(params).total;
}

function listarNotasCredito(filtros = {}) {
    const { where, params } = construirFiltrosNotasCredito(filtros);

    return db
        .prepare(`
            SELECT
                ${seleccionarCamposNotaCredito()}
            ${desdeNotasCreditoBase()}
            ${where}
            ORDER BY datetime(nc.fecha_nota) DESC, nc.id_nota_credito DESC
            LIMIT @limite OFFSET @offset
        `)
        .all(params);
}

function obtenerNotaCreditoPorId(idNotaCredito) {
    return db
        .prepare(`
            SELECT
                ${seleccionarCamposNotaCredito()}
            ${desdeNotasCreditoBase()}
            WHERE nc.id_nota_credito = ?
            LIMIT 1
        `)
        .get(idNotaCredito);
}

function obtenerNotaCreditoPorVenta(idVenta) {
    return db
        .prepare(`
            SELECT
                ${seleccionarCamposNotaCredito()}
            ${desdeNotasCreditoBase()}
            WHERE nc.id_venta = ?
              AND nc.estado = 'emitida'
            ORDER BY nc.id_nota_credito DESC
            LIMIT 1
        `)
        .get(idVenta);
}

function listarDetalleNotaCredito(idNotaCredito) {
    return db
        .prepare(`
            SELECT
                id_detalle_nota_credito,
                id_nota_credito,
                id_venta,
                id_detalle_venta,
                id_producto,
                id_unidad_medida,
                unidad_abreviatura,
                codigo_interno,
                codigo_barras,
                nombre_producto,
                cantidad,
                precio_unitario,
                precio_costo_unitario,
                descuento_unitario,
                porcentaje_iva,
                impuesto_unitario,
                impuesto_total,
                subtotal,
                total_linea,
                costo_total
            FROM detalle_notas_credito
            WHERE id_nota_credito = ?
            ORDER BY id_detalle_nota_credito ASC
        `)
        .all(idNotaCredito);
}

function listarUltimasNotasCredito(limite = 10) {
    return db
        .prepare(`
            SELECT
                ${seleccionarCamposNotaCredito()}
            ${desdeNotasCreditoBase()}
            ORDER BY datetime(nc.fecha_nota) DESC, nc.id_nota_credito DESC
            LIMIT ?
        `)
        .all(limite);
}

module.exports = {
    formatearNumeroDocumento,
    obtenerNumeracionNotaCredito,
    contarNotasCredito,
    contarDetalleNotasCredito,
    contarNotasCreditoListado,
    listarNotasCredito,
    obtenerNotaCreditoPorId,
    obtenerNotaCreditoPorVenta,
    listarDetalleNotaCredito,
    listarUltimasNotasCredito,
};