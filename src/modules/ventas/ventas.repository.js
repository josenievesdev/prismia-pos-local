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

function obtenerMedioPagoPorId(idMedioPago) {
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
            WHERE id_medio_pago = ?
              AND activo = 1
            LIMIT 1
        `)
        .get(idMedioPago);
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

function registrarVentaPOS(datos) {
    const transaccion = db.transaction(() => {
        const prefijo = datos.prefijo_comprobante || 'FV';

        const siguiente = db
            .prepare(`
                SELECT COALESCE(MAX(consecutivo), 0) + 1 AS consecutivo
                FROM comprobantes
                WHERE prefijo = ?
            `)
            .get(prefijo);

        const consecutivo = siguiente.consecutivo;
        const numeroVenta = `${prefijo}-${String(consecutivo).padStart(6, '0')}`;

        const ventaInsertada = db
            .prepare(`
                INSERT INTO ventas (
                    id_cliente,
                    id_usuario,
                    id_turno_caja,
                    numero_venta,
                    fecha_venta,
                    subtotal,
                    descuento_total,
                    impuesto_total,
                    total,
                    estado,
                    observaciones,
                    total_pagado,
                    saldo_pendiente,
                    cambio_entregado,
                    total_costo,
                    utilidad_bruta,
                    origen,
                    tipo_venta,
                    requiere_factura
                ) VALUES (
                    @id_cliente,
                    @id_usuario,
                    @id_turno_caja,
                    @numero_venta,
                    @fecha_venta,
                    @subtotal,
                    @descuento_total,
                    @impuesto_total,
                    @total,
                    'pagada',
                    @observaciones,
                    @total_pagado,
                    @saldo_pendiente,
                    @cambio_entregado,
                    @total_costo,
                    @utilidad_bruta,
                    'pos',
                    'contado',
                    @requiere_factura
                )
            `)
            .run({
                id_cliente: datos.cliente ? datos.cliente.id_cliente : null,
                id_usuario: datos.id_usuario,
                id_turno_caja: datos.turno.id_turno_caja,
                numero_venta: numeroVenta,
                fecha_venta: datos.fecha_venta,
                subtotal: datos.resumen.subtotal,
                descuento_total: datos.resumen.descuento_total,
                impuesto_total: datos.resumen.impuesto_total,
                total: datos.resumen.total,
                observaciones: datos.observaciones || null,
                total_pagado: datos.pago.monto_pago,
                saldo_pendiente: datos.pago.saldo_pendiente,
                cambio_entregado: datos.pago.cambio_entregado,
                total_costo: datos.resumen.total_costo,
                utilidad_bruta: datos.resumen.utilidad_bruta,
                requiere_factura: datos.requiere_factura ? 1 : 0,
            });

        const idVenta = Number(ventaInsertada.lastInsertRowid);

        const insertarDetalle = db.prepare(`
            INSERT INTO detalle_ventas (
                id_venta,
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
                costo_total,
                utilidad_bruta
            ) VALUES (
                @id_venta,
                @id_producto,
                @id_unidad_medida,
                @unidad_abreviatura,
                @codigo_interno,
                @codigo_barras,
                @nombre_producto,
                @cantidad,
                @precio_unitario,
                @precio_costo_unitario,
                @descuento_unitario,
                @porcentaje_iva,
                @impuesto_unitario,
                @impuesto_total,
                @subtotal,
                @total_linea,
                @costo_total,
                @utilidad_bruta
            )
        `);

        const actualizarStock = db.prepare(`
            UPDATE productos
            SET
                stock_actual = @stock_nuevo,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_producto = @id_producto
        `);

        const insertarMovimientoInventario = db.prepare(`
            INSERT INTO movimientos_inventario (
                id_producto,
                id_usuario,
                id_unidad_medida,
                unidad_abreviatura,
                tipo_movimiento,
                cantidad,
                stock_anterior,
                stock_nuevo,
                costo_unitario,
                costo_total,
                motivo,
                referencia_tipo,
                referencia_id
            ) VALUES (
                @id_producto,
                @id_usuario,
                @id_unidad_medida,
                @unidad_abreviatura,
                'venta',
                @cantidad,
                @stock_anterior,
                @stock_nuevo,
                @costo_unitario,
                @costo_total,
                @motivo,
                'venta',
                @referencia_id
            )
        `);

        for (const item of datos.items) {
            insertarDetalle.run({
                id_venta: idVenta,
                id_producto: item.id_producto,
                id_unidad_medida: item.id_unidad_medida,
                unidad_abreviatura: item.unidad_abreviatura,
                codigo_interno: item.codigo_interno,
                codigo_barras: item.codigo_barras,
                nombre_producto: item.nombre_producto,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                precio_costo_unitario: item.precio_costo_unitario,
                descuento_unitario: item.descuento_unitario,
                porcentaje_iva: item.porcentaje_iva,
                impuesto_unitario: item.impuesto_unitario,
                impuesto_total: item.impuesto_total,
                subtotal: item.subtotal,
                total_linea: item.total_linea,
                costo_total: item.costo_total,
                utilidad_bruta: item.utilidad_bruta,
            });

            if (item.controla_inventario === 1) {
                const resultadoStock = actualizarStock.run({
                    id_producto: item.id_producto,
                    stock_nuevo: item.stock_nuevo,
                });

                if (resultadoStock.changes === 0) {
                    throw new Error(`No se pudo actualizar stock del producto ${item.nombre_producto}.`);
                }

                insertarMovimientoInventario.run({
                    id_producto: item.id_producto,
                    id_usuario: datos.id_usuario,
                    id_unidad_medida: item.id_unidad_medida,
                    unidad_abreviatura: item.unidad_abreviatura,
                    cantidad: item.cantidad,
                    stock_anterior: item.stock_anterior,
                    stock_nuevo: item.stock_nuevo,
                    costo_unitario: item.precio_costo_unitario,
                    costo_total: item.costo_total,
                    motivo: `Venta ${numeroVenta}`,
                    referencia_id: idVenta,
                });
            }
        }

        db.prepare(`
            INSERT INTO pagos_venta (
                id_venta,
                metodo_pago,
                monto,
                referencia,
                entidad,
                observaciones,
                id_medio_pago,
                id_usuario,
                monto_recibido,
                cambio_entregado,
                estado
            ) VALUES (
                @id_venta,
                @metodo_pago,
                @monto,
                @referencia,
                @entidad,
                @observaciones,
                @id_medio_pago,
                @id_usuario,
                @monto_recibido,
                @cambio_entregado,
                'registrado'
            )
        `).run({
            id_venta: idVenta,
            metodo_pago: datos.pago.metodo_pago,
            monto: datos.pago.monto_pago,
            referencia: datos.pago.referencia || null,
            entidad: datos.pago.entidad || null,
            observaciones: datos.pago.observaciones || null,
            id_medio_pago: datos.pago.id_medio_pago,
            id_usuario: datos.id_usuario,
            monto_recibido: datos.pago.monto_recibido,
            cambio_entregado: datos.pago.cambio_entregado,
        });

        db.prepare(`
            INSERT INTO movimientos_caja (
                id_turno_caja,
                id_usuario,
                tipo_movimiento,
                metodo_pago,
                monto,
                descripcion,
                referencia_tipo,
                referencia_id,
                id_medio_pago,
                referencia_pago,
                entidad_pago
            ) VALUES (
                @id_turno_caja,
                @id_usuario,
                'venta',
                @metodo_pago,
                @monto,
                @descripcion,
                'venta',
                @referencia_id,
                @id_medio_pago,
                @referencia_pago,
                @entidad_pago
            )
        `).run({
            id_turno_caja: datos.turno.id_turno_caja,
            id_usuario: datos.id_usuario,
            metodo_pago: datos.pago.metodo_pago,
            monto: datos.pago.monto_pago,
            descripcion: `Venta ${numeroVenta}`,
            referencia_id: idVenta,
            id_medio_pago: datos.pago.id_medio_pago,
            referencia_pago: datos.pago.referencia || null,
            entidad_pago: datos.pago.entidad || null,
        });

        const resultadoTurno = db
            .prepare(`
                UPDATE turnos_caja
                SET
                    total_ventas = total_ventas + @total_ventas,
                    total_efectivo = total_efectivo + @total_efectivo,
                    total_transferencia = total_transferencia + @total_transferencia,
                    total_tarjeta = total_tarjeta + @total_tarjeta,
                    total_otros = total_otros + @total_otros,
                    monto_esperado = monto_esperado + @monto_esperado,
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id_turno_caja = @id_turno_caja
                  AND estado = 'abierto'
            `)
            .run({
                id_turno_caja: datos.turno.id_turno_caja,
                total_ventas: datos.resumen.total,
                total_efectivo: datos.totales_turno.total_efectivo,
                total_transferencia: datos.totales_turno.total_transferencia,
                total_tarjeta: datos.totales_turno.total_tarjeta,
                total_otros: datos.totales_turno.total_otros,
                monto_esperado: datos.totales_turno.monto_esperado,
            });

        if (resultadoTurno.changes === 0) {
            throw new Error('No se pudo actualizar el turno de caja abierto.');
        }

        db.prepare(`
            INSERT INTO comprobantes (
                id_venta,
                tipo_comprobante,
                prefijo,
                numero,
                consecutivo,
                estado,
                datos_fiscales_json
            ) VALUES (
                @id_venta,
                'recibo_interno',
                @prefijo,
                @numero,
                @consecutivo,
                'emitido',
                @datos_fiscales_json
            )
        `).run({
            id_venta: idVenta,
            prefijo,
            numero: numeroVenta,
            consecutivo,
            datos_fiscales_json: JSON.stringify(datos.datos_fiscales || {}),
        });

        return {
            id_venta: idVenta,
            numero_venta: numeroVenta,
            comprobante: {
                prefijo,
                numero: numeroVenta,
                consecutivo,
            },
        };
    });

    return transaccion();
}

function obtenerVentaTicketPorId(idVenta) {
    return db
        .prepare(`
            SELECT
                v.id_venta,
                v.id_cliente,
                v.id_usuario,
                v.id_turno_caja,
                v.numero_venta,
                v.fecha_venta,
                v.subtotal,
                v.descuento_total,
                v.impuesto_total,
                v.total,
                v.estado,
                v.observaciones,
                v.total_pagado,
                v.saldo_pendiente,
                v.cambio_entregado,
                v.total_costo,
                v.utilidad_bruta,
                v.origen,
                v.tipo_venta,
                v.requiere_factura,
                v.creado_en,

                c.tipo_documento AS cliente_tipo_documento,
                c.documento AS cliente_documento,
                c.nombre AS cliente_nombre,
                c.telefono AS cliente_telefono,
                c.correo AS cliente_correo,
                c.direccion AS cliente_direccion,
                c.es_consumidor_final AS cliente_es_consumidor_final,

                u.nombre AS cajero_nombre,

                t.fecha_apertura AS turno_fecha_apertura,
                t.estado AS turno_estado
            FROM ventas v
            LEFT JOIN clientes c
                ON c.id_cliente = v.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = v.id_usuario
            LEFT JOIN turnos_caja t
                ON t.id_turno_caja = v.id_turno_caja
            WHERE v.id_venta = ?
            LIMIT 1
        `)
        .get(idVenta);
}

function listarDetalleVentaTicket(idVenta) {
    return db
        .prepare(`
            SELECT
                id_detalle_venta,
                id_venta,
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
                costo_total,
                utilidad_bruta
            FROM detalle_ventas
            WHERE id_venta = ?
            ORDER BY id_detalle_venta ASC
        `)
        .all(idVenta);
}

function listarPagosVentaTicket(idVenta) {
    return db
        .prepare(`
            SELECT
                pv.id_pago_venta,
                pv.id_venta,
                pv.metodo_pago,
                pv.monto,
                pv.referencia,
                pv.entidad,
                pv.observaciones,
                pv.creado_en,
                pv.id_medio_pago,
                pv.id_usuario,
                pv.monto_recibido,
                pv.cambio_entregado,
                pv.estado,

                mp.codigo AS medio_pago_codigo,
                mp.nombre AS medio_pago_nombre,
                mp.tipo AS medio_pago_tipo
            FROM pagos_venta pv
            LEFT JOIN medios_pago mp
                ON mp.id_medio_pago = pv.id_medio_pago
            WHERE pv.id_venta = ?
              AND pv.estado = 'registrado'
              AND pv.anulado_en IS NULL
            ORDER BY pv.id_pago_venta ASC
        `)
        .all(idVenta);
}

function obtenerComprobanteVentaTicket(idVenta) {
    return db
        .prepare(`
            SELECT
                id_comprobante,
                id_venta,
                tipo_comprobante,
                prefijo,
                numero,
                consecutivo,
                estado,
                fecha_emision,
                ruta_pdf,
                datos_fiscales_json,
                creado_en
            FROM comprobantes
            WHERE id_venta = ?
            ORDER BY id_comprobante DESC
            LIMIT 1
        `)
        .get(idVenta);
}

module.exports = {
    obtenerTurnoAbierto,
    obtenerConfiguracionNegocio,
    obtenerClienteConsumidorFinal,
    obtenerClientePorId,
    buscarClientesParaVenta,
    listarMediosPagoActivos,
    obtenerMedioPagoPorId,
    buscarProductosParaVenta,
    obtenerProductoParaVenta,
    listarVentasRecientes,
    registrarVentaPOS,

    obtenerVentaTicketPorId,
    listarDetalleVentaTicket,
    listarPagosVentaTicket,
    obtenerComprobanteVentaTicket,
};