const db = require('../../config/db');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function construirFiltrosCompras(filtros = {}) {
    const condiciones = ['1 = 1'];
    const parametros = [];

    const busqueda = limpiarTexto(filtros.busqueda);

    if (busqueda) {
        condiciones.push(`
            (
                LOWER(c.numero_compra) LIKE LOWER(?)
                OR LOWER(COALESCE(c.numero_soporte, '')) LIKE LOWER(?)
                OR LOWER(COALESCE(p.nombre_comercial, '')) LIKE LOWER(?)
                OR LOWER(COALESCE(p.razon_social, '')) LIKE LOWER(?)
                OR LOWER(COALESCE(p.documento, '')) LIKE LOWER(?)
            )
        `);

        const patron = `%${busqueda}%`;
        parametros.push(patron, patron, patron, patron, patron);
    }

    const estado = limpiarTexto(filtros.estado);

    if (['borrador', 'registrada', 'anulada'].includes(estado)) {
        condiciones.push('c.estado = ?');
        parametros.push(estado);
    }

    return {
        where: condiciones.join(' AND '),
        parametros,
    };
}

function listarCompras(filtros = {}) {
    const { where, parametros } = construirFiltrosCompras(filtros);
    const limite = Number(filtros.limite || 20);
    const offset = Number(filtros.offset || 0);

    return db
        .prepare(`
            SELECT
                c.id_compra,
                c.numero_compra,
                c.numero_soporte,
                c.tipo_soporte,
                c.fecha_compra,
                c.fecha_registro,
                c.subtotal,
                c.iva_total,
                c.total,
                c.estado,
                c.observaciones,
                p.id_proveedor,
                p.nombre_comercial AS proveedor_nombre_comercial,
                p.razon_social AS proveedor_razon_social,
                p.tipo_documento AS proveedor_tipo_documento,
                p.documento AS proveedor_documento,
                u.nombre AS usuario_nombre
            FROM compras c
            INNER JOIN proveedores p
                ON p.id_proveedor = c.id_proveedor
            LEFT JOIN usuarios u
                ON u.id_usuario = c.id_usuario
            WHERE ${where}
            ORDER BY c.fecha_compra DESC, c.id_compra DESC
            LIMIT ?
            OFFSET ?
        `)
        .all(...parametros, limite, offset);
}

function contarCompras(filtros = {}) {
    const { where, parametros } = construirFiltrosCompras(filtros);

    const resultado = db
        .prepare(`
            SELECT COUNT(*) AS total
            FROM compras c
            INNER JOIN proveedores p
                ON p.id_proveedor = c.id_proveedor
            WHERE ${where}
        `)
        .get(...parametros);

    return Number(resultado?.total || 0);
}

module.exports = {
    listarCompras,
    contarCompras,
};