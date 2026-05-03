const db = require('../../config/db');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarEntero(valor, defecto = 0) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return defecto;
    }

    return Math.round(numero);
}

function normalizarNumero(valor, defecto = 0) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return defecto;
    }

    return numero;
}

function formatearNumeroDocumento(prefijo, consecutivo, longitudConsecutivo = 6) {
    const prefijoSeguro = limpiarTexto(prefijo) || 'DOC';
    const consecutivoSeguro = normalizarEntero(consecutivo);
    const longitudSegura = normalizarEntero(longitudConsecutivo, 6);

    return `${prefijoSeguro}-${String(consecutivoSeguro).padStart(longitudSegura, '0')}`;
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

function obtenerNumeracionRemision() {
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
            WHERE codigo_documento = 'remision'
              AND activo = 1
            LIMIT 1
        `)
        .get();
}

function obtenerSiguienteNumeroRemision() {
    const numeracion = obtenerNumeracionRemision();

    if (!numeracion) {
        return null;
    }

    const siguienteConsecutivo = normalizarEntero(numeracion.ultimo_consecutivo) + 1;

    return {
        ...numeracion,
        longitud_consecutivo: normalizarEntero(numeracion.longitud_consecutivo, 6),
        ultimo_consecutivo: normalizarEntero(numeracion.ultimo_consecutivo),
        siguiente_consecutivo: siguienteConsecutivo,
        siguiente_numero: formatearNumeroDocumento(
            numeracion.prefijo,
            siguienteConsecutivo,
            numeracion.longitud_consecutivo
        ),
        activo: normalizarEntero(numeracion.activo),
    };
}

function buscarClientesParaRemision({ busqueda = '', limite = 10 } = {}) {
    const termino = limpiarTexto(busqueda);

    if (!termino) {
        return [];
    }

    const patron = `%${termino}%`;
    const inicio = `${termino}%`;

    return db
        .prepare(`
            SELECT
                c.id_cliente,
                c.tipo_cliente,
                c.tipo_documento,
                c.documento,
                c.digito_verificacion,
                c.nombre,
                c.razon_social,
                c.nombre_comercial,
                c.primer_nombre,
                c.primer_apellido,
                c.telefono,
                c.celular,
                c.correo,
                c.correo_facturacion,
                c.direccion,
                c.departamento,
                c.codigo_departamento,
                c.municipio,
                c.codigo_municipio,
                c.es_consumidor_final,
                c.estado
            FROM clientes c
            WHERE c.estado = 'activo'
              AND c.eliminado_en IS NULL
              AND (
                    c.nombre LIKE @patron
                 OR c.razon_social LIKE @patron
                 OR c.nombre_comercial LIKE @patron
                 OR c.documento LIKE @patron
                 OR c.telefono LIKE @patron
                 OR c.celular LIKE @patron
                 OR c.correo LIKE @patron
                 OR c.correo_facturacion LIKE @patron
              )
            ORDER BY
                CASE
                    WHEN c.documento = @termino THEN 1
                    WHEN c.telefono = @termino THEN 2
                    WHEN c.celular = @termino THEN 3
                    WHEN c.nombre LIKE @inicio THEN 4
                    WHEN c.razon_social LIKE @inicio THEN 5
                    WHEN c.nombre_comercial LIKE @inicio THEN 6
                    ELSE 7
                END,
                c.es_consumidor_final DESC,
                c.nombre COLLATE NOCASE ASC
            LIMIT @limite
        `)
        .all({
            termino,
            patron,
            inicio,
            limite: normalizarEntero(limite, 10),
        });
}

function obtenerClientePorId(idCliente) {
    return db
        .prepare(`
            SELECT
                c.*
            FROM clientes c
            WHERE c.id_cliente = ?
              AND c.estado = 'activo'
              AND c.eliminado_en IS NULL
            LIMIT 1
        `)
        .get(idCliente);
}

function buscarProductosParaRemision({ busqueda = '', limite = 30 } = {}) {
    const termino = limpiarTexto(busqueda);
    const limiteSeguro = normalizarEntero(limite, 30);

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
                ORDER BY p.nombre COLLATE NOCASE ASC
                LIMIT ?
            `)
            .all(limiteSeguro);
    }

    const patron = `%${termino}%`;
    const inicio = `${termino}%`;

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
                    WHEN p.nombre LIKE @inicio THEN 3
                    ELSE 4
                END,
                p.nombre COLLATE NOCASE ASC
            LIMIT @limite
        `)
        .all({
            termino,
            patron,
            inicio,
            limite: limiteSeguro,
        });
}

function obtenerProductoPorId(idProducto) {
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

function construirFiltrosRemisiones(filtros = {}) {
    const condiciones = [];

    const params = {
        busqueda: null,
        estado: limpiarTexto(filtros.estado) || null,
        fecha_desde: limpiarTexto(filtros.fecha_desde) || null,
        fecha_hasta: limpiarTexto(filtros.fecha_hasta) || null,
        id_cliente: filtros.id_cliente ? normalizarEntero(filtros.id_cliente) : null,
        id_usuario: filtros.id_usuario ? normalizarEntero(filtros.id_usuario) : null,
        limite: normalizarEntero(filtros.limite, 20),
        offset: normalizarEntero(filtros.offset, 0),
    };

    const busqueda = limpiarTexto(filtros.busqueda);

    if (busqueda) {
        params.busqueda = `%${busqueda}%`;

        condiciones.push(`
            (
                r.numero_remision LIKE @busqueda
                OR c.nombre LIKE @busqueda
                OR c.razon_social LIKE @busqueda
                OR c.nombre_comercial LIKE @busqueda
                OR c.documento LIKE @busqueda
                OR u.nombre LIKE @busqueda
            )
        `);
    }

    if (params.estado) {
        condiciones.push('r.estado = @estado');
    }

    if (params.fecha_desde) {
        condiciones.push('date(r.fecha_remision) >= date(@fecha_desde)');
    }

    if (params.fecha_hasta) {
        condiciones.push('date(r.fecha_remision) <= date(@fecha_hasta)');
    }

    if (params.id_cliente) {
        condiciones.push('r.id_cliente = @id_cliente');
    }

    if (params.id_usuario) {
        condiciones.push('r.id_usuario = @id_usuario');
    }

    const where = condiciones.length > 0
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    return {
        where,
        params,
    };
}

function contarRemisiones(filtros = {}) {
    const { where, params } = construirFiltrosRemisiones(filtros);

    const resultado = db
        .prepare(`
            SELECT COUNT(*) AS total
            FROM remisiones r
            LEFT JOIN clientes c
                ON c.id_cliente = r.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = r.id_usuario
            ${where}
        `)
        .get(params);

    return normalizarEntero(resultado?.total);
}

function listarRemisiones(filtros = {}) {
    const { where, params } = construirFiltrosRemisiones(filtros);

    return db
        .prepare(`
            SELECT
                r.id_remision,
                r.id_cliente,
                r.id_usuario,
                r.id_cotizacion_origen,
                r.id_venta_convertida,

                r.numero_remision,
                r.prefijo,
                r.consecutivo,
                r.fecha_remision,
                r.fecha_entrega_estimada,
                r.fecha_entregada,

                r.direccion_entrega,
                r.contacto_entrega,
                r.telefono_entrega,

                r.subtotal,
                r.descuento_total,
                r.impuesto_total,
                r.total,
                r.total_costo,
                r.utilidad_bruta,

                r.afecta_inventario,
                r.inventario_afectado_en,

                r.estado,
                r.origen,
                r.observaciones,
                r.condiciones_entrega,

                r.convertida_en,
                r.creado_en,
                r.actualizado_en,

                c.tipo_documento AS cliente_tipo_documento,
                c.documento AS cliente_documento,
                c.nombre AS cliente_nombre,
                c.razon_social AS cliente_razon_social,
                c.nombre_comercial AS cliente_nombre_comercial,
                c.telefono AS cliente_telefono,
                c.celular AS cliente_celular,
                c.correo AS cliente_correo,
                c.correo_facturacion AS cliente_correo_facturacion,

                u.nombre AS usuario_nombre,

                cot.numero_cotizacion AS cotizacion_origen_numero,
                v.numero_venta AS venta_convertida_numero
            FROM remisiones r
            LEFT JOIN clientes c
                ON c.id_cliente = r.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = r.id_usuario
            LEFT JOIN cotizaciones cot
                ON cot.id_cotizacion = r.id_cotizacion_origen
            LEFT JOIN ventas v
                ON v.id_venta = r.id_venta_convertida
            ${where}
            ORDER BY datetime(r.fecha_remision) DESC, r.id_remision DESC
            LIMIT @limite OFFSET @offset
        `)
        .all(params);
}

function obtenerRemisionPorId(idRemision) {
    return db
        .prepare(`
            SELECT
                r.*,

                c.tipo_cliente AS cliente_tipo_cliente,
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

                u.nombre AS usuario_nombre,

                cot.numero_cotizacion AS cotizacion_origen_numero,
                v.numero_venta AS venta_convertida_numero
            FROM remisiones r
            LEFT JOIN clientes c
                ON c.id_cliente = r.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = r.id_usuario
            LEFT JOIN cotizaciones cot
                ON cot.id_cotizacion = r.id_cotizacion_origen
            LEFT JOIN ventas v
                ON v.id_venta = r.id_venta_convertida
            WHERE r.id_remision = ?
            LIMIT 1
        `)
        .get(idRemision);
}

function listarDetalleRemision(idRemision) {
    return db
        .prepare(`
            SELECT
                id_detalle_remision,
                id_remision,
                id_producto,
                id_unidad_medida,
                unidad_abreviatura,
                codigo_interno,
                codigo_barras,
                nombre_producto,
                descripcion_producto,
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
                utilidad_bruta,
                afecta_inventario,
                stock_anterior,
                stock_nuevo,
                orden,
                creado_en
            FROM detalle_remisiones
            WHERE id_remision = ?
            ORDER BY orden ASC, id_detalle_remision ASC
        `)
        .all(idRemision);
}

function marcarRemisionConvertida({ id_remision, id_venta_convertida }) {
    const resultado = db
        .prepare(`
            UPDATE remisiones
            SET
                estado = 'convertida',
                id_venta_convertida = @id_venta_convertida,
                convertida_en = CURRENT_TIMESTAMP,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_remision = @id_remision
              AND estado IN ('emitida', 'entregada')
              AND id_venta_convertida IS NULL
        `)
        .run({
            id_remision,
            id_venta_convertida,
        });

    return resultado.changes;
}

function crearRemision(datos) {
    const transaccion = db.transaction(() => {
        const numeracion = obtenerNumeracionRemision();

        if (!numeracion) {
            throw new Error('No existe una numeración activa para remisiones.');
        }

        const prefijo = limpiarTexto(numeracion.prefijo) || 'RM';
        const longitudConsecutivo = normalizarEntero(numeracion.longitud_consecutivo, 6);

        const ultimoDocumento = db
            .prepare(`
                SELECT COALESCE(MAX(consecutivo), 0) AS ultimo_consecutivo
                FROM remisiones
                WHERE prefijo = ?
            `)
            .get(prefijo);

        const ultimoConsecutivo = Math.max(
            normalizarEntero(numeracion.ultimo_consecutivo),
            normalizarEntero(ultimoDocumento?.ultimo_consecutivo)
        );

        const consecutivo = ultimoConsecutivo + 1;

        const numeroRemision = formatearNumeroDocumento(
            prefijo,
            consecutivo,
            longitudConsecutivo
        );

        const remisionInsertada = db
            .prepare(`
                INSERT INTO remisiones (
                    id_cliente,
                    id_usuario,
                    id_cotizacion_origen,
                    id_venta_convertida,

                    numero_remision,
                    prefijo,
                    consecutivo,

                    fecha_remision,
                    fecha_entrega_estimada,
                    fecha_entregada,

                    direccion_entrega,
                    contacto_entrega,
                    telefono_entrega,

                    subtotal,
                    descuento_total,
                    impuesto_total,
                    total,
                    total_costo,
                    utilidad_bruta,

                    afecta_inventario,
                    inventario_afectado_en,

                    estado,
                    origen,
                    observaciones,
                    condiciones_entrega
                ) VALUES (
                    @id_cliente,
                    @id_usuario,
                    @id_cotizacion_origen,
                    @id_venta_convertida,

                    @numero_remision,
                    @prefijo,
                    @consecutivo,

                    COALESCE(@fecha_remision, CURRENT_TIMESTAMP),
                    @fecha_entrega_estimada,
                    @fecha_entregada,

                    @direccion_entrega,
                    @contacto_entrega,
                    @telefono_entrega,

                    @subtotal,
                    @descuento_total,
                    @impuesto_total,
                    @total,
                    @total_costo,
                    @utilidad_bruta,

                    @afecta_inventario,
                    @inventario_afectado_en,

                    @estado,
                    @origen,
                    @observaciones,
                    @condiciones_entrega
                )
            `)
            .run({
                id_cliente: datos.id_cliente || null,
                id_usuario: datos.id_usuario,
                id_cotizacion_origen: datos.id_cotizacion_origen || null,
                id_venta_convertida: datos.id_venta_convertida || null,

                numero_remision: numeroRemision,
                prefijo,
                consecutivo,

                fecha_remision: datos.fecha_remision || null,
                fecha_entrega_estimada: datos.fecha_entrega_estimada || null,
                fecha_entregada: datos.fecha_entregada || null,

                direccion_entrega: limpiarTexto(datos.direccion_entrega) || null,
                contacto_entrega: limpiarTexto(datos.contacto_entrega) || null,
                telefono_entrega: limpiarTexto(datos.telefono_entrega) || null,

                subtotal: normalizarEntero(datos.subtotal),
                descuento_total: normalizarEntero(datos.descuento_total),
                impuesto_total: normalizarEntero(datos.impuesto_total),
                total: normalizarEntero(datos.total),
                total_costo: normalizarEntero(datos.total_costo),
                utilidad_bruta: normalizarEntero(datos.utilidad_bruta),

                afecta_inventario: normalizarEntero(datos.afecta_inventario),
                inventario_afectado_en: datos.inventario_afectado_en || null,

                estado: limpiarTexto(datos.estado) || 'emitida',
                origen: limpiarTexto(datos.origen) || 'manual',
                observaciones: limpiarTexto(datos.observaciones) || null,
                condiciones_entrega: limpiarTexto(datos.condiciones_entrega) || null,
            });

        const idRemision = Number(remisionInsertada.lastInsertRowid);

        const insertarDetalle = db.prepare(`
            INSERT INTO detalle_remisiones (
                id_remision,
                id_producto,
                id_unidad_medida,
                unidad_abreviatura,
                codigo_interno,
                codigo_barras,
                nombre_producto,
                descripcion_producto,
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
                utilidad_bruta,
                afecta_inventario,
                stock_anterior,
                stock_nuevo,
                orden
            ) VALUES (
                @id_remision,
                @id_producto,
                @id_unidad_medida,
                @unidad_abreviatura,
                @codigo_interno,
                @codigo_barras,
                @nombre_producto,
                @descripcion_producto,
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
                @utilidad_bruta,
                @afecta_inventario,
                @stock_anterior,
                @stock_nuevo,
                @orden
            )
        `);

        datos.items.forEach((item, indice) => {
            insertarDetalle.run({
                id_remision: idRemision,
                id_producto: item.id_producto || null,
                id_unidad_medida: item.id_unidad_medida || null,
                unidad_abreviatura: limpiarTexto(item.unidad_abreviatura) || null,
                codigo_interno: limpiarTexto(item.codigo_interno) || null,
                codigo_barras: limpiarTexto(item.codigo_barras) || null,
                nombre_producto: limpiarTexto(item.nombre_producto),
                descripcion_producto: limpiarTexto(item.descripcion_producto) || null,
                cantidad: normalizarNumero(item.cantidad),
                precio_unitario: normalizarEntero(item.precio_unitario),
                precio_costo_unitario: normalizarEntero(item.precio_costo_unitario),
                descuento_unitario: normalizarEntero(item.descuento_unitario),
                porcentaje_iva: normalizarEntero(item.porcentaje_iva),
                impuesto_unitario: normalizarEntero(item.impuesto_unitario),
                impuesto_total: normalizarEntero(item.impuesto_total),
                subtotal: normalizarEntero(item.subtotal),
                total_linea: normalizarEntero(item.total_linea),
                costo_total: normalizarEntero(item.costo_total),
                utilidad_bruta: normalizarEntero(item.utilidad_bruta),
                afecta_inventario: normalizarEntero(item.afecta_inventario),
                stock_anterior: item.stock_anterior ?? null,
                stock_nuevo: item.stock_nuevo ?? null,
                orden: normalizarEntero(item.orden, indice + 1),
            });
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

        return {
            id_remision: idRemision,
            numero_remision: numeroRemision,
            prefijo,
            consecutivo,
        };
    });

    return transaccion();
}

module.exports = {
    formatearNumeroDocumento,
    obtenerConfiguracionNegocio,
    obtenerNumeracionRemision,
    obtenerSiguienteNumeroRemision,
    buscarClientesParaRemision,
    obtenerClientePorId,
    buscarProductosParaRemision,
    obtenerProductoPorId,
    contarRemisiones,
    listarRemisiones,
    obtenerRemisionPorId,
    listarDetalleRemision,
    marcarRemisionConvertida,
    crearRemision,
};