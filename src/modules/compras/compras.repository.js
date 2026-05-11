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

function listarProveedoresActivos({ limite = 300 } = {}) {
    return db
        .prepare(`
            SELECT
                id_proveedor,
                nombre_comercial,
                razon_social,
                tipo_documento,
                documento,
                estado
            FROM proveedores
            WHERE estado = 'activo'
              AND eliminado_en IS NULL
            ORDER BY nombre_comercial ASC
            LIMIT ?
        `)
        .all(Number(limite || 300));
}

function buscarProductosParaCompra({ busqueda = '', limite = 20 } = {}) {
    const termino = limpiarTexto(busqueda);
    const limiteSeguro = Number(limite || 20);

    if (!termino) {
        return db
            .prepare(`
                SELECT
                    p.id_producto,
                    p.codigo_interno,
                    p.codigo_barras,
                    p.nombre,
                    p.precio_costo,
                    p.precio_venta,
                    p.costo_promedio,
                    p.ultimo_costo,
                    p.stock_actual,
                    p.controla_inventario,
                    p.maneja_iva,
                    p.porcentaje_iva,
                    p.precio_incluye_iva,
                    p.id_unidad_medida,
                    u.nombre AS unidad_nombre,
                    u.abreviatura AS unidad_abreviatura,
                    u.permite_decimales AS unidad_permite_decimales
                FROM productos p
                LEFT JOIN unidades_medida u
                    ON u.id_unidad_medida = p.id_unidad_medida
                WHERE p.estado = 'activo'
                  AND p.eliminado_en IS NULL
                ORDER BY p.nombre ASC
                LIMIT ?
            `)
            .all(limiteSeguro);
    }

    const patron = `%${termino}%`;

    return db
        .prepare(`
            SELECT
                p.id_producto,
                p.codigo_interno,
                p.codigo_barras,
                p.nombre,
                p.precio_costo,
                p.precio_venta,
                p.costo_promedio,
                p.ultimo_costo,
                p.stock_actual,
                p.controla_inventario,
                p.maneja_iva,
                p.porcentaje_iva,
                p.precio_incluye_iva,
                p.id_unidad_medida,
                u.nombre AS unidad_nombre,
                u.abreviatura AS unidad_abreviatura,
                u.permite_decimales AS unidad_permite_decimales
            FROM productos p
            LEFT JOIN unidades_medida u
                ON u.id_unidad_medida = p.id_unidad_medida
            WHERE p.estado = 'activo'
              AND p.eliminado_en IS NULL
              AND (
                    p.nombre LIKE @patron
                 OR p.codigo_interno LIKE @patron
                 OR COALESCE(p.codigo_barras, '') LIKE @patron
              )
            ORDER BY
                CASE
                    WHEN p.codigo_barras = @termino THEN 1
                    WHEN p.codigo_interno = @termino THEN 2
                    WHEN p.nombre LIKE @patron THEN 3
                    ELSE 4
                END,
                p.nombre ASC
            LIMIT @limite
        `)
        .all({
            termino,
            patron,
            limite: limiteSeguro,
        });
}

module.exports = {
    listarCompras,
    contarCompras,
    listarProveedoresActivos,
    buscarProductosParaCompra,
};