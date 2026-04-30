const db = require('../../config/db');

function obtenerTurnoAbierto() {
    return db
        .prepare(`
            SELECT
                t.*,
                ua.nombre AS usuario_apertura_nombre,
                uc.nombre AS usuario_cierre_nombre
            FROM turnos_caja t
            INNER JOIN usuarios ua
                ON ua.id_usuario = t.id_usuario_apertura
            LEFT JOIN usuarios uc
                ON uc.id_usuario = t.id_usuario_cierre
            WHERE t.estado = 'abierto'
            ORDER BY t.fecha_apertura DESC, t.id_turno_caja DESC
            LIMIT 1
        `)
        .get();
}

function obtenerConfiguracionNegocio() {
    return db
        .prepare(`
            SELECT
                *
            FROM configuracion_negocio
            WHERE estado = 'activo'
            ORDER BY id_configuracion DESC
            LIMIT 1
        `)
        .get();
}

function obtenerClienteConsumidorFinal() {
    return db
        .prepare(`
            SELECT
                id_cliente,
                tipo_documento,
                documento,
                nombre,
                telefono,
                correo,
                direccion,
                es_consumidor_final,
                estado
            FROM clientes
            WHERE es_consumidor_final = 1
              AND estado = 'activo'
              AND eliminado_en IS NULL
            ORDER BY id_cliente ASC
            LIMIT 1
        `)
        .get();
}

function obtenerClientePorId(idCliente) {
    return db
        .prepare(`
            SELECT
                id_cliente,
                tipo_documento,
                documento,
                nombre,
                telefono,
                correo,
                direccion,
                es_consumidor_final,
                estado
            FROM clientes
            WHERE id_cliente = ?
              AND estado = 'activo'
              AND eliminado_en IS NULL
            LIMIT 1
        `)
        .get(idCliente);
}

function buscarClientesParaVenta({ busqueda = '', limite = 10 } = {}) {
    const termino = String(busqueda || '').trim();

    if (!termino) {
        return [];
    }

    const patron = `%${termino}%`;
    const inicio = `${termino}%`;

    return db
        .prepare(`
            SELECT
                id_cliente,
                tipo_documento,
                documento,
                nombre,
                telefono,
                correo,
                direccion,
                es_consumidor_final,
                estado
            FROM clientes
            WHERE estado = 'activo'
              AND eliminado_en IS NULL
              AND (
                    nombre LIKE @patron
                 OR documento LIKE @patron
                 OR telefono LIKE @patron
                 OR correo LIKE @patron
              )
            ORDER BY
                CASE
                    WHEN documento = @termino THEN 1
                    WHEN telefono = @termino THEN 2
                    WHEN nombre LIKE @inicio THEN 3
                    WHEN documento LIKE @inicio THEN 4
                    ELSE 5
                END,
                es_consumidor_final DESC,
                nombre ASC
            LIMIT @limite
        `)
        .all({
            termino,
            patron,
            inicio,
            limite,
        });
}

function listarMediosPagoActivos() {
    return db
        .prepare(`
            SELECT
                id_medio_pago,
                codigo,
                nombre,
                tipo,
                requiere_referencia,
                afecta_efectivo_caja,
                activo,
                orden
            FROM medios_pago
            WHERE activo = 1
            ORDER BY orden ASC, nombre ASC
        `)
        .all();
}

function buscarProductosParaVenta({ busqueda = '', limite = 30 } = {}) {
    const termino = String(busqueda || '').trim();

    if (!termino) {
        return db
            .prepare(`
                SELECT
                    p.id_producto,
                    p.id_categoria_producto,
                    cp.nombre AS categoria_nombre,

                    p.codigo_interno,
                    p.codigo_barras,
                    p.nombre,
                    p.descripcion,

                    p.precio_costo,
                    p.precio_venta,
                    p.costo_promedio,
                    p.ultimo_costo,

                    p.stock_actual,
                    p.stock_minimo,
                    p.stock_reservado,

                    p.controla_inventario,
                    p.permite_venta_sin_stock,
                    p.permite_cantidad_decimal,
                    p.venta_fraccionada_habilitada,

                    p.id_unidad_medida,
                    um.nombre AS unidad_nombre,
                    um.abreviatura AS unidad_abreviatura,
                    um.permite_decimales AS unidad_permite_decimales,

                    p.maneja_iva,
                    p.porcentaje_iva,
                    p.precio_incluye_iva,

                    p.imagen_url,
                    p.estado
                FROM productos p
                LEFT JOIN categorias_productos cp
                    ON cp.id_categoria_producto = p.id_categoria_producto
                LEFT JOIN unidades_medida um
                    ON um.id_unidad_medida = p.id_unidad_medida
                WHERE p.estado = 'activo'
                  AND p.eliminado_en IS NULL
                ORDER BY p.nombre ASC
                LIMIT ?
            `)
            .all(limite);
    }

    const patron = `%${termino}%`;

    return db
        .prepare(`
            SELECT
                p.id_producto,
                p.id_categoria_producto,
                cp.nombre AS categoria_nombre,

                p.codigo_interno,
                p.codigo_barras,
                p.nombre,
                p.descripcion,

                p.precio_costo,
                p.precio_venta,
                p.costo_promedio,
                p.ultimo_costo,

                p.stock_actual,
                p.stock_minimo,
                p.stock_reservado,

                p.controla_inventario,
                p.permite_venta_sin_stock,
                p.permite_cantidad_decimal,
                p.venta_fraccionada_habilitada,

                p.id_unidad_medida,
                um.nombre AS unidad_nombre,
                um.abreviatura AS unidad_abreviatura,
                um.permite_decimales AS unidad_permite_decimales,

                p.maneja_iva,
                p.porcentaje_iva,
                p.precio_incluye_iva,

                p.imagen_url,
                p.estado
            FROM productos p
            LEFT JOIN categorias_productos cp
                ON cp.id_categoria_producto = p.id_categoria_producto
            LEFT JOIN unidades_medida um
                ON um.id_unidad_medida = p.id_unidad_medida
            WHERE p.estado = 'activo'
              AND p.eliminado_en IS NULL
              AND (
                    p.nombre LIKE @patron
                 OR p.codigo_interno LIKE @patron
                 OR p.codigo_barras LIKE @patron
                 OR cp.nombre LIKE @patron
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
            limite,
        });
}

function obtenerProductoParaVenta(idProducto) {
    return db
        .prepare(`
            SELECT
                p.id_producto,
                p.id_categoria_producto,
                cp.nombre AS categoria_nombre,

                p.codigo_interno,
                p.codigo_barras,
                p.nombre,
                p.descripcion,

                p.precio_costo,
                p.precio_venta,
                p.costo_promedio,
                p.ultimo_costo,

                p.stock_actual,
                p.stock_minimo,
                p.stock_reservado,

                p.controla_inventario,
                p.permite_venta_sin_stock,
                p.permite_cantidad_decimal,
                p.venta_fraccionada_habilitada,

                p.id_unidad_medida,
                um.nombre AS unidad_nombre,
                um.abreviatura AS unidad_abreviatura,
                um.permite_decimales AS unidad_permite_decimales,

                p.maneja_iva,
                p.porcentaje_iva,
                p.precio_incluye_iva,

                p.imagen_url,
                p.estado
            FROM productos p
            LEFT JOIN categorias_productos cp
                ON cp.id_categoria_producto = p.id_categoria_producto
            LEFT JOIN unidades_medida um
                ON um.id_unidad_medida = p.id_unidad_medida
            WHERE p.id_producto = ?
              AND p.estado = 'activo'
              AND p.eliminado_en IS NULL
            LIMIT 1
        `)
        .get(idProducto);
}

function listarVentasRecientes(limite = 10) {
    return db
        .prepare(`
            SELECT
                v.id_venta,
                v.numero_venta,
                v.fecha_venta,
                v.estado,
                v.subtotal,
                v.descuento_total,
                v.impuesto_total,
                v.total,
                v.total_pagado,
                v.saldo_pendiente,
                v.cambio_entregado,
                v.tipo_venta,
                v.origen,

                c.nombre AS cliente_nombre,
                c.documento AS cliente_documento,

                u.nombre AS usuario_nombre,

                t.id_turno_caja,
                t.estado AS estado_turno
            FROM ventas v
            LEFT JOIN clientes c
                ON c.id_cliente = v.id_cliente
            INNER JOIN usuarios u
                ON u.id_usuario = v.id_usuario
            INNER JOIN turnos_caja t
                ON t.id_turno_caja = v.id_turno_caja
            ORDER BY v.fecha_venta DESC, v.id_venta DESC
            LIMIT ?
        `)
        .all(limite);
}

module.exports = {
    obtenerTurnoAbierto,
    obtenerConfiguracionNegocio,
    obtenerClienteConsumidorFinal,
    obtenerClientePorId,
    buscarClientesParaVenta,
    listarMediosPagoActivos,
    buscarProductosParaVenta,
    obtenerProductoParaVenta,
    listarVentasRecientes,
};