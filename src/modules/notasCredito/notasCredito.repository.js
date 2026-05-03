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

function listarUltimasNotasCredito(limite = 10) {
    return db
        .prepare(`
            SELECT
                nc.id_nota_credito,
                nc.numero_nota_credito,
                nc.tipo_nota,
                nc.origen,
                nc.id_venta,
                v.numero_venta,
                nc.id_cliente,
                COALESCE(c.razon_social, c.nombre_comercial, c.nombre, 'Consumidor final') AS cliente_nombre,
                nc.subtotal,
                nc.impuesto_total,
                nc.total,
                nc.estado,
                nc.fecha_nota,
                nc.motivo
            FROM notas_credito nc
            LEFT JOIN ventas v
                ON v.id_venta = nc.id_venta
            LEFT JOIN clientes c
                ON c.id_cliente = nc.id_cliente
            ORDER BY nc.id_nota_credito DESC
            LIMIT ?
        `)
        .all(limite);
}

module.exports = {
    formatearNumeroDocumento,
    obtenerNumeracionNotaCredito,
    contarNotasCredito,
    contarDetalleNotasCredito,
    listarUltimasNotasCredito,
};