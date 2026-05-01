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

function obtenerNumeracionCotizacion() {
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
            WHERE codigo_documento = 'cotizacion'
              AND activo = 1
            LIMIT 1
        `)
        .get();
}

function obtenerSiguienteNumeroCotizacion() {
    const numeracion = obtenerNumeracionCotizacion();

    if (!numeracion) {
        return null;
    }

    const siguienteConsecutivo = normalizarEntero(numeracion.ultimo_consecutivo) + 1;
    const siguienteNumero = formatearNumeroDocumento(
        numeracion.prefijo,
        siguienteConsecutivo,
        numeracion.longitud_consecutivo
    );

    return {
        ...numeracion,
        longitud_consecutivo: normalizarEntero(numeracion.longitud_consecutivo, 6),
        ultimo_consecutivo: normalizarEntero(numeracion.ultimo_consecutivo),
        siguiente_consecutivo: siguienteConsecutivo,
        siguiente_numero: siguienteNumero,
        activo: normalizarEntero(numeracion.activo),
    };
}

function buscarClientesParaCotizacion({ busqueda = '', limite = 10 } = {}) {
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
                c.regimen_fiscal,
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

function buscarProductosParaCotizacion({ busqueda = '', limite = 30 } = {}) {
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
                p.nombre COLLATE NOCASE ASC
            LIMIT @limite
        `)
        .all({
            termino,
            patron,
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

function construirFiltrosCotizaciones(filtros = {}) {
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
                cot.numero_cotizacion LIKE @busqueda
                OR c.nombre LIKE @busqueda
                OR c.razon_social LIKE @busqueda
                OR c.nombre_comercial LIKE @busqueda
                OR c.documento LIKE @busqueda
                OR u.nombre LIKE @busqueda
            )
        `);
    }

    if (params.estado) {
        condiciones.push('cot.estado = @estado');
    }

    if (params.fecha_desde) {
        condiciones.push('date(cot.fecha_cotizacion) >= date(@fecha_desde)');
    }

    if (params.fecha_hasta) {
        condiciones.push('date(cot.fecha_cotizacion) <= date(@fecha_hasta)');
    }

    if (params.id_cliente) {
        condiciones.push('cot.id_cliente = @id_cliente');
    }

    if (params.id_usuario) {
        condiciones.push('cot.id_usuario = @id_usuario');
    }

    const where = condiciones.length > 0
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    return {
        where,
        params,
    };
}

function contarCotizaciones(filtros = {}) {
    const { where, params } = construirFiltrosCotizaciones(filtros);

    const resultado = db
        .prepare(`
            SELECT COUNT(*) AS total
            FROM cotizaciones cot
            LEFT JOIN clientes c
                ON c.id_cliente = cot.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = cot.id_usuario
            ${where}
        `)
        .get(params);

    return normalizarEntero(resultado?.total);
}

function listarCotizaciones(filtros = {}) {
    const { where, params } = construirFiltrosCotizaciones(filtros);

    return db
        .prepare(`
            SELECT
                cot.id_cotizacion,
                cot.id_cliente,
                cot.id_usuario,
                cot.numero_cotizacion,
                cot.prefijo,
                cot.consecutivo,
                cot.fecha_cotizacion,
                cot.fecha_vencimiento,
                cot.validez_dias,
                cot.subtotal,
                cot.descuento_total,
                cot.impuesto_total,
                cot.total,
                cot.total_costo,
                cot.utilidad_bruta,
                cot.estado,
                cot.origen,
                cot.observaciones,
                cot.condiciones_comerciales,
                cot.id_venta_convertida,
                cot.convertida_en,
                cot.creado_en,
                cot.actualizado_en,

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

                v.numero_venta AS venta_convertida_numero
            FROM cotizaciones cot
            LEFT JOIN clientes c
                ON c.id_cliente = cot.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = cot.id_usuario
            LEFT JOIN ventas v
                ON v.id_venta = cot.id_venta_convertida
            ${where}
            ORDER BY datetime(cot.fecha_cotizacion) DESC, cot.id_cotizacion DESC
            LIMIT @limite OFFSET @offset
        `)
        .all(params);
}

function obtenerCotizacionPorId(idCotizacion) {
    return db
        .prepare(`
            SELECT
                cot.*,

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
                c.regimen_fiscal AS cliente_regimen_fiscal,

                u.nombre AS usuario_nombre,

                v.numero_venta AS venta_convertida_numero
            FROM cotizaciones cot
            LEFT JOIN clientes c
                ON c.id_cliente = cot.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = cot.id_usuario
            LEFT JOIN ventas v
                ON v.id_venta = cot.id_venta_convertida
            WHERE cot.id_cotizacion = ?
            LIMIT 1
        `)
        .get(idCotizacion);
}

function listarDetalleCotizacion(idCotizacion) {
    return db
        .prepare(`
            SELECT
                id_detalle_cotizacion,
                id_cotizacion,
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
                orden,
                creado_en
            FROM detalle_cotizaciones
            WHERE id_cotizacion = ?
            ORDER BY orden ASC, id_detalle_cotizacion ASC
        `)
        .all(idCotizacion);
}

function crearCotizacion(datos) {
    const transaccion = db.transaction(() => {
        const numeracion = obtenerNumeracionCotizacion();

        if (!numeracion) {
            throw new Error('No existe una numeración activa para cotizaciones.');
        }

        const prefijo = limpiarTexto(numeracion.prefijo) || 'COT';
        const longitudConsecutivo = normalizarEntero(numeracion.longitud_consecutivo, 6);

        const ultimoDocumento = db
            .prepare(`
                SELECT COALESCE(MAX(consecutivo), 0) AS ultimo_consecutivo
                FROM cotizaciones
                WHERE prefijo = ?
            `)
            .get(prefijo);

        const ultimoConsecutivo = Math.max(
            normalizarEntero(numeracion.ultimo_consecutivo),
            normalizarEntero(ultimoDocumento?.ultimo_consecutivo)
        );

        const consecutivo = ultimoConsecutivo + 1;
        const numeroCotizacion = formatearNumeroDocumento(
            prefijo,
            consecutivo,
            longitudConsecutivo
        );

        const cotizacionInsertada = db
            .prepare(`
                INSERT INTO cotizaciones (
                    id_cliente,
                    id_usuario,
                    numero_cotizacion,
                    prefijo,
                    consecutivo,
                    fecha_cotizacion,
                    fecha_vencimiento,
                    validez_dias,
                    subtotal,
                    descuento_total,
                    impuesto_total,
                    total,
                    total_costo,
                    utilidad_bruta,
                    estado,
                    origen,
                    observaciones,
                    condiciones_comerciales
                ) VALUES (
                    @id_cliente,
                    @id_usuario,
                    @numero_cotizacion,
                    @prefijo,
                    @consecutivo,
                    COALESCE(@fecha_cotizacion, CURRENT_TIMESTAMP),
                    @fecha_vencimiento,
                    @validez_dias,
                    @subtotal,
                    @descuento_total,
                    @impuesto_total,
                    @total,
                    @total_costo,
                    @utilidad_bruta,
                    @estado,
                    @origen,
                    @observaciones,
                    @condiciones_comerciales
                )
            `)
            .run({
                id_cliente: datos.id_cliente || null,
                id_usuario: datos.id_usuario,
                numero_cotizacion: numeroCotizacion,
                prefijo,
                consecutivo,
                fecha_cotizacion: datos.fecha_cotizacion || null,
                fecha_vencimiento: datos.fecha_vencimiento || null,
                validez_dias: normalizarEntero(datos.validez_dias, 15),
                subtotal: normalizarEntero(datos.subtotal),
                descuento_total: normalizarEntero(datos.descuento_total),
                impuesto_total: normalizarEntero(datos.impuesto_total),
                total: normalizarEntero(datos.total),
                total_costo: normalizarEntero(datos.total_costo),
                utilidad_bruta: normalizarEntero(datos.utilidad_bruta),
                estado: limpiarTexto(datos.estado) || 'emitida',
                origen: limpiarTexto(datos.origen) || 'manual',
                observaciones: limpiarTexto(datos.observaciones) || null,
                condiciones_comerciales: limpiarTexto(datos.condiciones_comerciales) || null,
            });

        const idCotizacion = Number(cotizacionInsertada.lastInsertRowid);

        const insertarDetalle = db.prepare(`
            INSERT INTO detalle_cotizaciones (
                id_cotizacion,
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
                orden
            ) VALUES (
                @id_cotizacion,
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
                @orden
            )
        `);

        datos.items.forEach((item, indice) => {
            insertarDetalle.run({
                id_cotizacion: idCotizacion,
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
            id_cotizacion: idCotizacion,
            numero_cotizacion: numeroCotizacion,
            prefijo,
            consecutivo,
        };
    });

    return transaccion();
}

module.exports = {
    formatearNumeroDocumento,
    obtenerNumeracionCotizacion,
    obtenerSiguienteNumeroCotizacion,
    buscarClientesParaCotizacion,
    obtenerClientePorId,
    buscarProductosParaCotizacion,
    obtenerProductoPorId,
    contarCotizaciones,
    listarCotizaciones,
    obtenerCotizacionPorId,
    listarDetalleCotizacion,
    crearCotizacion,
};