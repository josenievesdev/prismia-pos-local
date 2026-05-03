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

function formatearNumeroDocumento(prefijo, consecutivo, longitudConsecutivo = 6) {
    const prefijoSeguro = String(prefijo || '').trim() || 'DOC';
    const consecutivoSeguro = Number(consecutivo || 0);
    const longitudSegura = Number(longitudConsecutivo || 6);

    return `${prefijoSeguro}-${String(consecutivoSeguro).padStart(longitudSegura, '0')}`;
}

function obtenerNumeracionDocumento(codigoDocumento) {
    return db
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
                observaciones
            FROM numeraciones_documentos
            WHERE codigo_documento = ?
              AND activo = 1
            LIMIT 1
        `)
        .get(codigoDocumento);
}

function obtenerSiguienteNumeroDocumento(codigoDocumento) {
    const numeracion = obtenerNumeracionDocumento(codigoDocumento);

    if (!numeracion) {
        return null;
    }

    const siguienteConsecutivo = Number(numeracion.ultimo_consecutivo || 0) + 1;
    const siguienteNumero = formatearNumeroDocumento(
        numeracion.prefijo,
        siguienteConsecutivo,
        numeracion.longitud_consecutivo
    );

    return {
        ...numeracion,
        siguiente_consecutivo: siguienteConsecutivo,
        siguiente_numero: siguienteNumero,
    };
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
                razon_social,
                nombre_comercial,
                telefono,
                celular,
                correo,
                correo_facturacion,
                direccion,
                es_consumidor_final,
                estado
            FROM clientes
            WHERE estado = 'activo'
              AND eliminado_en IS NULL
              AND (
                    nombre LIKE @patron
                 OR razon_social LIKE @patron
                 OR nombre_comercial LIKE @patron
                 OR documento LIKE @patron
                 OR telefono LIKE @patron
                 OR celular LIKE @patron
                 OR correo LIKE @patron
                 OR correo_facturacion LIKE @patron
              )
            ORDER BY
                CASE
                    WHEN documento = @termino THEN 1
                    WHEN telefono = @termino THEN 2
                    WHEN celular = @termino THEN 3
                    WHEN nombre LIKE @inicio THEN 4
                    WHEN razon_social LIKE @inicio THEN 5
                    WHEN nombre_comercial LIKE @inicio THEN 6
                    WHEN documento LIKE @inicio THEN 7
                    ELSE 8
                END,
                es_consumidor_final DESC,
                nombre COLLATE NOCASE ASC
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

function construirFiltrosHistorialVentas(filtros = {}) {
    const condiciones = [];
    const limiteSeguro = Number(filtros.limite || 50);
    const offsetSeguro = Number(filtros.offset || 0);

    const params = {
        fecha_desde: filtros.fecha_desde || null,
        fecha_hasta: filtros.fecha_hasta || null,
        factura: filtros.factura || null,
        cliente: filtros.cliente || null,
        id_medio_pago: filtros.id_medio_pago || null,
        estado: filtros.estado || null,
        id_turno_caja: filtros.id_turno_caja || null,
        id_cajero: filtros.id_cajero || null,
        limite: limiteSeguro > 0 ? limiteSeguro : 50,
        offset: offsetSeguro >= 0 ? offsetSeguro : 0,
    };

    if (params.fecha_desde) {
        condiciones.push('date(v.fecha_venta) >= date(@fecha_desde)');
    }

    if (params.fecha_hasta) {
        condiciones.push('date(v.fecha_venta) <= date(@fecha_hasta)');
    }

    if (params.factura) {
        params.factura = `%${params.factura}%`;
        condiciones.push(`(
            v.numero_venta LIKE @factura
            OR comp.numero LIKE @factura
        )`);
    }

    if (params.cliente) {
        params.cliente = `%${params.cliente}%`;
        condiciones.push(`(
            c.nombre LIKE @cliente
            OR c.documento LIKE @cliente
            OR c.telefono LIKE @cliente
            OR c.correo LIKE @cliente
        )`);
    }

    if (params.id_medio_pago) {
        condiciones.push(`EXISTS (
            SELECT 1
            FROM pagos_venta pvf
            WHERE pvf.id_venta = v.id_venta
              AND pvf.estado = 'registrado'
              AND pvf.anulado_en IS NULL
              AND pvf.id_medio_pago = @id_medio_pago
        )`);
    }

    if (params.estado) {
        condiciones.push('v.estado = @estado');
    }

    if (params.id_turno_caja) {
        condiciones.push('v.id_turno_caja = @id_turno_caja');
    }

    if (params.id_cajero) {
        condiciones.push('v.id_usuario = @id_cajero');
    }

    const where = condiciones.length > 0
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    return {
        where,
        params,
    };
}

function contarHistorialVentas(filtros = {}) {
    const { where, params } = construirFiltrosHistorialVentas(filtros);

    const resultado = db
        .prepare(`
            SELECT
                COUNT(DISTINCT v.id_venta) AS total
            FROM ventas v
            LEFT JOIN clientes c
                ON c.id_cliente = v.id_cliente
            LEFT JOIN comprobantes comp
                ON comp.id_venta = v.id_venta
            ${where}
        `)
        .get(params);

    return Number(resultado?.total || 0);
}

function listarHistorialVentas(filtros = {}) {
    const { where, params } = construirFiltrosHistorialVentas(filtros);

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
                v.creado_en,

                c.tipo_documento AS cliente_tipo_documento,
                c.documento AS cliente_documento,
                c.nombre AS cliente_nombre,

                u.nombre AS cajero_nombre,

                t.estado AS estado_turno,
                t.fecha_apertura AS turno_fecha_apertura,

                pagos.medios_pago_nombre,
                pagos.medios_pago_tipo,
                pagos.metodos_pago,
                pagos.total_pagado_calculado,

                comp.id_comprobante,
                comp.numero AS comprobante_numero,
                comp.estado AS comprobante_estado,
                comp.fecha_emision AS comprobante_fecha_emision
            FROM ventas v
            LEFT JOIN clientes c
                ON c.id_cliente = v.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = v.id_usuario
            LEFT JOIN turnos_caja t
                ON t.id_turno_caja = v.id_turno_caja
            LEFT JOIN comprobantes comp
                ON comp.id_venta = v.id_venta
            LEFT JOIN (
                SELECT
                    pv.id_venta,
                    GROUP_CONCAT(DISTINCT COALESCE(mp.nombre, pv.entidad, pv.metodo_pago)) AS medios_pago_nombre,
                    GROUP_CONCAT(DISTINCT COALESCE(mp.tipo, pv.metodo_pago)) AS medios_pago_tipo,
                    GROUP_CONCAT(DISTINCT pv.metodo_pago) AS metodos_pago,
                    SUM(pv.monto) AS total_pagado_calculado
                FROM pagos_venta pv
                LEFT JOIN medios_pago mp
                    ON mp.id_medio_pago = pv.id_medio_pago
                WHERE pv.estado = 'registrado'
                  AND pv.anulado_en IS NULL
                GROUP BY pv.id_venta
            ) pagos
                ON pagos.id_venta = v.id_venta
            ${where}
            ORDER BY datetime(v.fecha_venta) DESC, v.id_venta DESC
            LIMIT @limite OFFSET @offset
        `)
        .all(params);
}

function listarCajerosConVentas() {
    return db
        .prepare(`
            SELECT DISTINCT
                u.id_usuario,
                u.nombre
            FROM ventas v
            INNER JOIN usuarios u
                ON u.id_usuario = v.id_usuario
            ORDER BY u.nombre ASC
        `)
        .all();
}

function listarTurnosConVentas(limite = 100) {
    return db
        .prepare(`
            SELECT DISTINCT
                t.id_turno_caja,
                t.fecha_apertura,
                t.estado
            FROM ventas v
            INNER JOIN turnos_caja t
                ON t.id_turno_caja = v.id_turno_caja
            ORDER BY t.id_turno_caja DESC
            LIMIT ?
        `)
        .all(limite);
}

function registrarVentaPOS(datos) {
    const transaccion = db.transaction(() => {
        const codigoDocumento = datos.codigo_documento || 'factura_venta';

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
                    activo
                FROM numeraciones_documentos
                WHERE codigo_documento = ?
                  AND activo = 1
                LIMIT 1
            `)
            .get(codigoDocumento);

        if (!numeracion) {
            throw new Error(`No existe una numeración activa para el documento "${codigoDocumento}".`);
        }

        const prefijo = String(numeracion.prefijo || datos.prefijo_comprobante || 'FV').trim();
        const longitudConsecutivo = Number(numeracion.longitud_consecutivo || 6);
        const tipoComprobante = String(
            numeracion.tipo_comprobante || datos.tipo_comprobante || 'recibo_interno'
        ).trim();

        const ultimoComprobante = db
            .prepare(`
                SELECT COALESCE(MAX(consecutivo), 0) AS ultimo_consecutivo
                FROM comprobantes
                WHERE prefijo = ?
            `)
            .get(prefijo);

        const ultimoConsecutivo = Math.max(
            Number(numeracion.ultimo_consecutivo || 0),
            Number(ultimoComprobante?.ultimo_consecutivo || 0)
        );

        const consecutivo = ultimoConsecutivo + 1;
        const numeroVenta = formatearNumeroDocumento(
            prefijo,
            consecutivo,
            longitudConsecutivo
        );

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
                @tipo_comprobante,
                @prefijo,
                @numero,
                @consecutivo,
                'emitido',
                @datos_fiscales_json
            )
        `).run({
            id_venta: idVenta,
            tipo_comprobante: tipoComprobante,
            prefijo,
            numero: numeroVenta,
            consecutivo,
            datos_fiscales_json: JSON.stringify(datos.datos_fiscales || {}),
        });

        db.prepare(`
    UPDATE numeraciones_documentos
    SET ultimo_consecutivo = @consecutivo,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE id_numeracion = @id_numeracion
`).run({
            id_numeracion: numeracion.id_numeracion,
            consecutivo,
        });

        if (typeof datos.afterRegistrarVenta === 'function') {
            datos.afterRegistrarVenta({
                id_venta: idVenta,
                numero_venta: numeroVenta,
                comprobante: {
                    tipo_comprobante: tipoComprobante,
                    prefijo,
                    numero: numeroVenta,
                    consecutivo,
                },
            });
        }

        return {
            id_venta: idVenta,
            numero_venta: numeroVenta,
            comprobante: {
                tipo_comprobante: tipoComprobante,
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

function obtenerVentaDetallePorId(idVenta) {
    return obtenerVentaTicketPorId(idVenta);
}

function listarDetalleVentaPorId(idVenta) {
    return listarDetalleVentaTicket(idVenta);
}

function listarPagosVentaPorId(idVenta) {
    return listarPagosVentaTicket(idVenta);
}

function obtenerComprobanteVentaPorId(idVenta) {
    return obtenerComprobanteVentaTicket(idVenta);
}

function obtenerVentaParaAnulacion(idVenta) {
    return db
        .prepare(`
            SELECT
                v.*,

                c.tipo_documento AS cliente_tipo_documento,
                c.documento AS cliente_documento,
                c.nombre AS cliente_nombre,
                c.razon_social AS cliente_razon_social,
                c.nombre_comercial AS cliente_nombre_comercial,

                u.nombre AS usuario_nombre,

                tc.estado AS turno_estado,
                tc.fecha_apertura AS turno_fecha_apertura,
                tc.fecha_cierre AS turno_fecha_cierre,
                tc.total_ventas AS turno_total_ventas,
                tc.total_efectivo AS turno_total_efectivo,
                tc.total_transferencia AS turno_total_transferencia,
                tc.total_tarjeta AS turno_total_tarjeta,
                tc.total_otros AS turno_total_otros,
                tc.monto_esperado AS turno_monto_esperado
            FROM ventas v
            LEFT JOIN clientes c
                ON c.id_cliente = v.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = v.id_usuario
            LEFT JOIN turnos_caja tc
                ON tc.id_turno_caja = v.id_turno_caja
            WHERE v.id_venta = ?
            LIMIT 1
        `)
        .get(idVenta);
}

function obtenerAnulacionVentaPorVenta(idVenta) {
    return db
        .prepare(`
            SELECT *
            FROM anulaciones_venta
            WHERE id_venta = ?
            LIMIT 1
        `)
        .get(idVenta);
}

function listarDetalleVentaParaAnulacion(idVenta) {
    return db
        .prepare(`
            SELECT
                dv.*,

                p.nombre AS producto_nombre_actual,
                p.stock_actual AS producto_stock_actual,
                p.controla_inventario AS producto_controla_inventario,
                p.estado AS producto_estado,
                p.eliminado_en AS producto_eliminado_en
            FROM detalle_ventas dv
            LEFT JOIN productos p
                ON p.id_producto = dv.id_producto
            WHERE dv.id_venta = ?
            ORDER BY dv.id_detalle_venta ASC
        `)
        .all(idVenta);
}

function listarPagosVentaParaAnulacion(idVenta) {
    return db
        .prepare(`
            SELECT
                pv.*,

                mp.codigo AS medio_pago_codigo,
                mp.nombre AS medio_pago_nombre,
                mp.tipo AS medio_pago_tipo,
                mp.afecta_efectivo_caja AS medio_pago_afecta_efectivo_caja,
                mp.requiere_referencia AS medio_pago_requiere_referencia
            FROM pagos_venta pv
            LEFT JOIN medios_pago mp
                ON mp.id_medio_pago = pv.id_medio_pago
            WHERE pv.id_venta = ?
            ORDER BY pv.id_pago_venta ASC
        `)
        .all(idVenta);
}

function listarMovimientosInventarioVenta(idVenta) {
    return db
        .prepare(`
            SELECT *
            FROM movimientos_inventario
            WHERE referencia_tipo = 'venta'
              AND referencia_id = ?
            ORDER BY id_movimiento_inventario ASC
        `)
        .all(idVenta);
}

function obtenerProductoBasicoParaAnulacion(idProducto) {
    return db
        .prepare(`
            SELECT
                id_producto,
                nombre,
                stock_actual,
                controla_inventario,
                estado,
                eliminado_en
            FROM productos
            WHERE id_producto = ?
            LIMIT 1
        `)
        .get(idProducto);
}

function anularVentaCompleta(datos) {
    const transaccion = db.transaction(() => {
        const venta = datos.venta;
        const detalle = datos.detalle;
        const pagos = datos.pagos;
        const reversaCaja = datos.reversa_caja;

        const resultadoAnulacion = db
            .prepare(`
                INSERT INTO anulaciones_venta (
                    id_venta,
                    numero_venta,
                    id_cliente,
                    id_turno_caja,

                    total_venta,
                    total_pagado,
                    cambio_entregado,

                    total_efectivo_reversado,
                    total_transferencia_reversado,
                    total_tarjeta_reversado,
                    total_otros_reversado,
                    monto_esperado_reversado,

                    motivo_anulacion,
                    observaciones,

                    anulada_por
                ) VALUES (
                    @id_venta,
                    @numero_venta,
                    @id_cliente,
                    @id_turno_caja,

                    @total_venta,
                    @total_pagado,
                    @cambio_entregado,

                    @total_efectivo_reversado,
                    @total_transferencia_reversado,
                    @total_tarjeta_reversado,
                    @total_otros_reversado,
                    @monto_esperado_reversado,

                    @motivo_anulacion,
                    @observaciones,

                    @anulada_por
                )
            `)
            .run({
                id_venta: venta.id_venta,
                numero_venta: venta.numero_venta,
                id_cliente: venta.id_cliente || null,
                id_turno_caja: venta.id_turno_caja,

                total_venta: venta.total,
                total_pagado: venta.total_pagado,
                cambio_entregado: venta.cambio_entregado,

                total_efectivo_reversado: reversaCaja.total_efectivo,
                total_transferencia_reversado: reversaCaja.total_transferencia,
                total_tarjeta_reversado: reversaCaja.total_tarjeta,
                total_otros_reversado: reversaCaja.total_otros,
                monto_esperado_reversado: reversaCaja.monto_esperado,

                motivo_anulacion: datos.motivo_anulacion,
                observaciones: datos.observaciones || null,

                anulada_por: datos.id_usuario,
            });

        const idAnulacionVenta = Number(resultadoAnulacion.lastInsertRowid);

        const ventaActualizada = db
            .prepare(`
                UPDATE ventas
                SET
                    estado = 'anulada',
                    anulado_en = CURRENT_TIMESTAMP,
                    anulado_por = @anulado_por,
                    motivo_anulacion = @motivo_anulacion,
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id_venta = @id_venta
                  AND estado = 'pagada'
                  AND anulado_en IS NULL
            `)
            .run({
                id_venta: venta.id_venta,
                anulado_por: datos.id_usuario,
                motivo_anulacion: datos.motivo_anulacion,
            });

        if (ventaActualizada.changes === 0) {
            throw new Error('No se pudo marcar la venta como anulada.');
        }

        const pagosActualizados = db
            .prepare(`
                UPDATE pagos_venta
                SET
                    estado = 'anulado',
                    anulado_en = CURRENT_TIMESTAMP,
                    anulado_por = @anulado_por,
                    motivo_anulacion = @motivo_anulacion
                WHERE id_venta = @id_venta
                  AND estado = 'registrado'
            `)
            .run({
                id_venta: venta.id_venta,
                anulado_por: datos.id_usuario,
                motivo_anulacion: datos.motivo_anulacion,
            });

        if (pagosActualizados.changes === 0 && pagos.length > 0) {
            throw new Error('No se pudieron anular los pagos de la venta.');
        }

        const actualizarProducto = db.prepare(`
            UPDATE productos
            SET
                stock_actual = @stock_nuevo,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_producto = @id_producto
        `);

        const obtenerProducto = db.prepare(`
            SELECT
                id_producto,
                nombre,
                stock_actual,
                controla_inventario,
                estado,
                eliminado_en
            FROM productos
            WHERE id_producto = ?
            LIMIT 1
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
                @tipo_movimiento,
                @cantidad,
                @stock_anterior,
                @stock_nuevo,
                @costo_unitario,
                @costo_total,
                @motivo,
                @referencia_tipo,
                @referencia_id
            )
        `);

        detalle.forEach((item) => {
            if (!item.id_producto) {
                return;
            }

            const producto = obtenerProducto.get(item.id_producto);

            if (!producto) {
                throw new Error(`No se encontró el producto "${item.nombre_producto}".`);
            }

            const controlaInventario = Number(producto.controla_inventario || 0);

            if (controlaInventario !== 1) {
                return;
            }

            const cantidad = Number(item.cantidad || 0);
            const stockAnterior = Number(producto.stock_actual || 0);
            const stockNuevo = Math.round((stockAnterior + cantidad) * 1000) / 1000;

            const actualizado = actualizarProducto.run({
                id_producto: item.id_producto,
                stock_nuevo: stockNuevo,
            });

            if (actualizado.changes === 0) {
                throw new Error(`No se pudo actualizar stock de "${item.nombre_producto}".`);
            }

            insertarMovimientoInventario.run({
                id_producto: item.id_producto,
                id_usuario: datos.id_usuario,
                id_unidad_medida: item.id_unidad_medida || null,
                unidad_abreviatura: item.unidad_abreviatura || null,
                tipo_movimiento: 'anulacion_venta',
                cantidad,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                costo_unitario: item.precio_costo_unitario || 0,
                costo_total: item.costo_total || 0,
                motivo: `Anulación de venta ${venta.numero_venta}: ${datos.motivo_anulacion}`,
                referencia_tipo: 'anulacion_venta',
                referencia_id: idAnulacionVenta,
            });
        });

        const turnoActualizado = db
            .prepare(`
                UPDATE turnos_caja
                SET
                    total_ventas = total_ventas - @total_ventas,
                    total_efectivo = total_efectivo - @total_efectivo,
                    total_transferencia = total_transferencia - @total_transferencia,
                    total_tarjeta = total_tarjeta - @total_tarjeta,
                    total_otros = total_otros - @total_otros,
                    monto_esperado = monto_esperado - @monto_esperado,
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id_turno_caja = @id_turno_caja
                  AND estado = 'abierto'
            `)
            .run({
                id_turno_caja: venta.id_turno_caja,
                total_ventas: reversaCaja.total_ventas,
                total_efectivo: reversaCaja.total_efectivo,
                total_transferencia: reversaCaja.total_transferencia,
                total_tarjeta: reversaCaja.total_tarjeta,
                total_otros: reversaCaja.total_otros,
                monto_esperado: reversaCaja.monto_esperado,
            });

        if (turnoActualizado.changes === 0) {
            throw new Error('No se pudo ajustar el turno de caja.');
        }

        return {
            id_anulacion_venta: idAnulacionVenta,
            id_venta: venta.id_venta,
            numero_venta: venta.numero_venta,
            estado: 'anulada',
        };
    });

    return transaccion();
}

module.exports = {
    obtenerTurnoAbierto,
    obtenerConfiguracionNegocio,
    obtenerNumeracionDocumento,
    obtenerSiguienteNumeroDocumento,
    obtenerClienteConsumidorFinal,
    obtenerClientePorId,
    buscarClientesParaVenta,
    listarMediosPagoActivos,
    obtenerMedioPagoPorId,
    buscarProductosParaVenta,
    obtenerProductoParaVenta,
    listarVentasRecientes,
    listarHistorialVentas,
    contarHistorialVentas,
    listarCajerosConVentas,
    listarTurnosConVentas,
    registrarVentaPOS,

    obtenerVentaTicketPorId,
    listarDetalleVentaTicket,
    listarPagosVentaTicket,
    obtenerComprobanteVentaTicket,

    obtenerVentaDetallePorId,
    listarDetalleVentaPorId,
    listarPagosVentaPorId,
    obtenerComprobanteVentaPorId,

    obtenerVentaParaAnulacion,
    obtenerAnulacionVentaPorVenta,
    listarDetalleVentaParaAnulacion,
    listarPagosVentaParaAnulacion,
    listarMovimientosInventarioVenta,
    obtenerProductoBasicoParaAnulacion,
    anularVentaCompleta,
};