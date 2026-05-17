const db = require('../../config/db');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarNumero(valor, defecto = 0) {
    const numero = Number(String(valor ?? '').replace(',', '.'));

    if (!Number.isFinite(numero)) {
        return defecto;
    }

    return Math.max(0, numero);
}

function normalizarEntero(valor, defecto = 0) {
    return Math.max(0, Math.round(normalizarNumero(valor, defecto)));
}

function formatearNumeroDocumento(prefijo, consecutivo, longitudConsecutivo = 6) {
    const prefijoSeguro = limpiarTexto(prefijo) || 'CP';
    const consecutivoSeguro = Number(consecutivo || 0);
    const longitudSegura = Number(longitudConsecutivo || 6);

    return `${prefijoSeguro}-${String(consecutivoSeguro).padStart(longitudSegura, '0')}`;
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

    const condicionPago = limpiarTexto(filtros.condicion_pago);

    if (['contado', 'credito'].includes(condicionPago)) {
        condiciones.push('c.condicion_pago = ?');
        parametros.push(condicionPago);
    }

    const estadoPago = limpiarTexto(filtros.estado_pago);
    const fechaActual = limpiarTexto(filtros.fecha_actual);

    if (estadoPago === 'pagada') {
        condiciones.push(`c.estado_pago = 'pagada'`);
    }

    if (estadoPago === 'pendiente') {
        condiciones.push(`
        c.estado = 'registrada'
        AND c.estado_pago IN ('pendiente', 'parcial')
        AND c.saldo_pendiente > 0
        AND (
            c.fecha_vencimiento IS NULL
            OR c.fecha_vencimiento = ''
            OR c.fecha_vencimiento > date(?, '+7 day')
        )
    `);
        parametros.push(fechaActual);
    }

    if (estadoPago === 'proxima') {
        condiciones.push(`
        c.estado = 'registrada'
        AND c.estado_pago IN ('pendiente', 'parcial')
        AND c.saldo_pendiente > 0
        AND c.fecha_vencimiento IS NOT NULL
        AND c.fecha_vencimiento != ''
        AND c.fecha_vencimiento >= ?
        AND c.fecha_vencimiento <= date(?, '+7 day')
    `);
        parametros.push(fechaActual, fechaActual);
    }

    if (estadoPago === 'vencida') {
        condiciones.push(`
        c.estado = 'registrada'
        AND c.estado_pago IN ('pendiente', 'parcial')
        AND c.saldo_pendiente > 0
        AND c.fecha_vencimiento IS NOT NULL
        AND c.fecha_vencimiento != ''
        AND c.fecha_vencimiento < ?
    `);
        parametros.push(fechaActual);
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
                c.condicion_pago,
                c.dias_plazo,
                c.fecha_vencimiento,
                c.estado_pago,
                c.fecha_pago,
                c.total_pagado,
                c.saldo_pendiente,
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



function obtenerResumenCuentasPorPagar({ fechaActual } = {}) {
    const fecha = limpiarTexto(fechaActual);

    return db
        .prepare(`
            SELECT
                COALESCE(SUM(
                    CASE
                        WHEN c.estado = 'registrada'
                         AND c.estado_pago IN ('pendiente', 'parcial')
                         AND c.saldo_pendiente > 0
                        THEN c.saldo_pendiente
                        ELSE 0
                    END
                ), 0) AS total_pendiente,

                COUNT(
                    CASE
                        WHEN c.estado = 'registrada'
                         AND c.estado_pago IN ('pendiente', 'parcial')
                         AND c.saldo_pendiente > 0
                        THEN 1
                    END
                ) AS compras_pendientes,

                COALESCE(SUM(
                    CASE
                        WHEN c.estado = 'registrada'
                         AND c.estado_pago IN ('pendiente', 'parcial')
                         AND c.saldo_pendiente > 0
                         AND c.fecha_vencimiento IS NOT NULL
                         AND c.fecha_vencimiento != ''
                         AND c.fecha_vencimiento < @fecha_actual
                        THEN c.saldo_pendiente
                        ELSE 0
                    END
                ), 0) AS total_vencido,

                COUNT(
                    CASE
                        WHEN c.estado = 'registrada'
                         AND c.estado_pago IN ('pendiente', 'parcial')
                         AND c.saldo_pendiente > 0
                         AND c.fecha_vencimiento IS NOT NULL
                         AND c.fecha_vencimiento != ''
                         AND c.fecha_vencimiento < @fecha_actual
                        THEN 1
                    END
                ) AS compras_vencidas,

                COALESCE(SUM(
                    CASE
                        WHEN c.estado = 'registrada'
                         AND c.estado_pago IN ('pendiente', 'parcial')
                         AND c.saldo_pendiente > 0
                         AND c.fecha_vencimiento IS NOT NULL
                         AND c.fecha_vencimiento != ''
                         AND c.fecha_vencimiento >= @fecha_actual
                         AND c.fecha_vencimiento <= date(@fecha_actual, '+7 day')
                        THEN c.saldo_pendiente
                        ELSE 0
                    END
                ), 0) AS total_proximo,

                COUNT(
                    CASE
                        WHEN c.estado = 'registrada'
                         AND c.estado_pago IN ('pendiente', 'parcial')
                         AND c.saldo_pendiente > 0
                         AND c.fecha_vencimiento IS NOT NULL
                         AND c.fecha_vencimiento != ''
                         AND c.fecha_vencimiento >= @fecha_actual
                         AND c.fecha_vencimiento <= date(@fecha_actual, '+7 day')
                        THEN 1
                    END
                ) AS compras_proximas,

                COALESCE(SUM(
                    CASE
                        WHEN c.estado = 'registrada'
                         AND c.condicion_pago = 'credito'
                         AND c.estado_pago IN ('pendiente', 'parcial')
                         AND c.saldo_pendiente > 0
                        THEN c.saldo_pendiente
                        ELSE 0
                    END
                ), 0) AS total_credito_pendiente,

                COUNT(
                    CASE
                        WHEN c.estado = 'registrada'
                         AND c.condicion_pago = 'credito'
                         AND c.estado_pago IN ('pendiente', 'parcial')
                         AND c.saldo_pendiente > 0
                        THEN 1
                    END
                ) AS compras_credito_pendientes

            FROM compras c
        `)
        .get({
            fecha_actual: fecha,
        });
}

function listarCuentasPorPagar() {
    return db
        .prepare(`
            SELECT
                c.id_compra,
                c.numero_compra,
                c.fecha_compra,
                c.fecha_registro,
                c.tipo_soporte,
                c.numero_soporte,
                c.subtotal,
                c.iva_total,
                c.total,
                c.estado,
                c.observaciones,
                c.condicion_pago,
                c.dias_plazo,
                c.fecha_vencimiento,
                c.estado_pago,
                c.fecha_pago,
                c.total_pagado,
                c.saldo_pendiente,

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
            WHERE c.estado = 'registrada'
  AND c.estado_pago IN ('pendiente', 'parcial')
  AND c.saldo_pendiente > 0
            ORDER BY
                CASE
                    WHEN c.fecha_vencimiento IS NULL OR c.fecha_vencimiento = '' THEN 1
                    ELSE 0
                END ASC,
                c.fecha_vencimiento ASC,
                c.id_compra ASC
        `)
        .all();
}

function listarPagosCompraProveedor(idCompra) {
    return db
        .prepare(`
            SELECT
                pc.id_pago_compra_proveedor,
                pc.id_compra,
                pc.id_proveedor,
                pc.id_usuario,
                pc.id_medio_pago,
                pc.id_turno_caja,
                pc.id_movimiento_caja,
                pc.fecha_pago,
                pc.monto_pagado,
                pc.referencia_pago,
                pc.entidad_pago,
                pc.observaciones,
                pc.estado,
                pc.creado_en,

                mp.codigo AS medio_pago_codigo,
                mp.nombre AS medio_pago_nombre,
                mp.tipo AS medio_pago_tipo,

                u.nombre AS usuario_nombre
            FROM pagos_compras_proveedores pc
            LEFT JOIN medios_pago mp
                ON mp.id_medio_pago = pc.id_medio_pago
            LEFT JOIN usuarios u
                ON u.id_usuario = pc.id_usuario
            WHERE pc.id_compra = ?
              AND pc.estado = 'registrado'
            ORDER BY
                pc.fecha_pago DESC,
                pc.id_pago_compra_proveedor DESC
        `)
        .all(Number(idCompra));
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
            LIMIT 1
        `)
        .get(Number(idMedioPago));
}

function obtenerCompraParaPagoProveedor(idCompra) {
    return db
        .prepare(`
            SELECT
                c.id_compra,
                c.numero_compra,
                c.fecha_compra,
                c.tipo_soporte,
                c.numero_soporte,
                c.subtotal,
                c.iva_total,
                c.total,
                c.estado,
                c.condicion_pago,
                c.dias_plazo,
                c.fecha_vencimiento,
                c.estado_pago,
                c.fecha_pago,
                c.total_pagado,
                c.saldo_pendiente,

                p.id_proveedor,
                p.nombre_comercial AS proveedor_nombre_comercial,
                p.razon_social AS proveedor_razon_social,
                p.tipo_documento AS proveedor_tipo_documento,
                p.documento AS proveedor_documento
            FROM compras c
            INNER JOIN proveedores p
                ON p.id_proveedor = c.id_proveedor
            WHERE c.id_compra = ?
            LIMIT 1
        `)
        .get(Number(idCompra));
}

function tablaExiste(nombreTabla) {
    const resultado = db
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
            LIMIT 1
        `)
        .get(nombreTabla);

    return Boolean(resultado);
}

function registrarAuditoriaPagoProveedor({ usuario, idPago, compraAntes, compraDespues, pago, ip, userAgent }) {
    if (!tablaExiste('auditoria')) {
        return;
    }

    db.prepare(`
        INSERT INTO auditoria (
            id_usuario,
            accion,
            tabla_afectada,
            id_registro_afectado,
            datos_anteriores,
            datos_nuevos,
            ip,
            user_agent
        ) VALUES (
            @id_usuario,
            'registrar_pago_compra_proveedor',
            'pagos_compras_proveedores',
            @id_registro_afectado,
            @datos_anteriores,
            @datos_nuevos,
            @ip,
            @user_agent
        )
    `).run({
        id_usuario: usuario.id_usuario,
        id_registro_afectado: idPago,
        datos_anteriores: JSON.stringify({
            id_compra: compraAntes.id_compra,
            numero_compra: compraAntes.numero_compra,
            estado_pago: compraAntes.estado_pago,
            total_pagado: compraAntes.total_pagado,
            saldo_pendiente: compraAntes.saldo_pendiente,
        }),
        datos_nuevos: JSON.stringify({
            id_pago_compra_proveedor: idPago,
            id_compra: compraDespues.id_compra,
            numero_compra: compraDespues.numero_compra,
            monto_pagado: pago.monto_pagado,
            fecha_pago: pago.fecha_pago,
            id_medio_pago: pago.id_medio_pago,
            referencia_pago: pago.referencia_pago || null,
            entidad_pago: pago.entidad_pago || null,
            estado_pago: compraDespues.estado_pago,
            total_pagado: compraDespues.total_pagado,
            saldo_pendiente: compraDespues.saldo_pendiente,
        }),
        ip: ip || 'local',
        user_agent: userAgent || '',
    });
}

function registrarPagoCompraProveedor({ idCompra, pago, usuario, ip, userAgent }) {
    const transaccion = db.transaction(() => {
        const compraActual = obtenerCompraParaPagoProveedor(idCompra);

        if (!compraActual) {
            throw new Error('No se encontró la compra seleccionada.');
        }

        if (compraActual.estado !== 'registrada') {
            throw new Error('Solo se pueden registrar pagos sobre compras registradas.');
        }

        const saldoActual = normalizarEntero(compraActual.saldo_pendiente, 0);
        const totalCompra = normalizarEntero(compraActual.total, 0);
        const totalPagadoActual = normalizarEntero(compraActual.total_pagado, 0);
        const montoPagado = normalizarEntero(pago.monto_pagado, 0);

        if (saldoActual <= 0 || compraActual.estado_pago === 'pagada') {
            throw new Error('La compra seleccionada no tiene saldo pendiente.');
        }

        if (montoPagado <= 0) {
            throw new Error('El monto del pago debe ser mayor a cero.');
        }

        if (montoPagado > saldoActual) {
            throw new Error('El monto del pago no puede superar el saldo pendiente.');
        }

        const medioPago = obtenerMedioPagoPorId(pago.id_medio_pago);

        if (!medioPago || Number(medioPago.activo || 0) !== 1) {
            throw new Error('Selecciona un medio de pago activo.');
        }

        const resultadoPago = db
            .prepare(`
                INSERT INTO pagos_compras_proveedores (
                    id_compra,
                    id_proveedor,
                    id_usuario,
                    id_medio_pago,
                    id_turno_caja,
                    id_movimiento_caja,
                    fecha_pago,
                    monto_pagado,
                    referencia_pago,
                    entidad_pago,
                    observaciones,
                    estado
                ) VALUES (
                    @id_compra,
                    @id_proveedor,
                    @id_usuario,
                    @id_medio_pago,
                    NULL,
                    NULL,
                    @fecha_pago,
                    @monto_pagado,
                    @referencia_pago,
                    @entidad_pago,
                    @observaciones,
                    'registrado'
                )
            `)
            .run({
                id_compra: compraActual.id_compra,
                id_proveedor: compraActual.id_proveedor,
                id_usuario: usuario.id_usuario,
                id_medio_pago: medioPago.id_medio_pago,
                fecha_pago: pago.fecha_pago,
                monto_pagado: montoPagado,
                referencia_pago: pago.referencia_pago || null,
                entidad_pago: pago.entidad_pago || null,
                observaciones: pago.observaciones || null,
            });

        const idPago = Number(resultadoPago.lastInsertRowid);
        const totalPagadoNuevo = Math.min(totalCompra, totalPagadoActual + montoPagado);
        const saldoPendienteNuevo = Math.max(0, totalCompra - totalPagadoNuevo);
        const estadoPagoNuevo = saldoPendienteNuevo === 0 ? 'pagada' : 'parcial';
        const fechaPagoCompra = saldoPendienteNuevo === 0 ? pago.fecha_pago : null;

        db.prepare(`
            UPDATE compras
            SET total_pagado = @total_pagado,
                saldo_pendiente = @saldo_pendiente,
                estado_pago = @estado_pago,
                fecha_pago = @fecha_pago,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_compra = @id_compra
        `).run({
            id_compra: compraActual.id_compra,
            total_pagado: totalPagadoNuevo,
            saldo_pendiente: saldoPendienteNuevo,
            estado_pago: estadoPagoNuevo,
            fecha_pago: fechaPagoCompra,
        });

        const compraDespues = {
            ...compraActual,
            total_pagado: totalPagadoNuevo,
            saldo_pendiente: saldoPendienteNuevo,
            estado_pago: estadoPagoNuevo,
            fecha_pago: fechaPagoCompra,
        };

        registrarAuditoriaPagoProveedor({
            usuario,
            idPago,
            compraAntes: compraActual,
            compraDespues,
            pago: {
                ...pago,
                monto_pagado: montoPagado,
                id_medio_pago: medioPago.id_medio_pago,
            },
            ip,
            userAgent,
        });

        return {
            id_pago_compra_proveedor: idPago,
            compra: compraDespues,
        };
    });

    return transaccion();
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

function obtenerNumeracionCompra() {
    return db
        .prepare(`
            SELECT
                id_numeracion,
                codigo_documento,
                nombre_documento,
                prefijo,
                longitud_consecutivo,
                ultimo_consecutivo,
                activo
            FROM numeraciones_documentos
            WHERE codigo_documento = 'compra_proveedor'
              AND activo = 1
            LIMIT 1
        `)
        .get();
}

function obtenerUltimoConsecutivoCompra(prefijo) {
    const resultado = db
        .prepare(`
            SELECT COALESCE(
                MAX(CAST(SUBSTR(numero_compra, LENGTH(@prefijo) + 2) AS INTEGER)),
                0
            ) AS ultimo_consecutivo
            FROM compras
            WHERE numero_compra LIKE @patron
        `)
        .get({
            prefijo,
            patron: `${prefijo}-%`,
        });

    return Number(resultado?.ultimo_consecutivo || 0);
}

function obtenerSiguienteNumeroCompra() {
    const numeracion = obtenerNumeracionCompra();

    if (!numeracion) {
        return {
            numero_compra: 'CP-BORRADOR',
            prefijo: 'CP',
            consecutivo: 0,
        };
    }

    const prefijo = limpiarTexto(numeracion.prefijo) || 'CP';
    const longitudConsecutivo = normalizarEntero(numeracion.longitud_consecutivo, 6);
    const ultimoDocumento = obtenerUltimoConsecutivoCompra(prefijo);

    const consecutivo = Math.max(
        normalizarEntero(numeracion.ultimo_consecutivo),
        ultimoDocumento
    ) + 1;

    return {
        numero_compra: formatearNumeroDocumento(prefijo, consecutivo, longitudConsecutivo),
        prefijo,
        consecutivo,
    };
}

function existeSoporteProveedorActivo(idProveedor, numeroSoporte) {
    const soporte = limpiarTexto(numeroSoporte);

    if (!Number(idProveedor) || !soporte) {
        return false;
    }

    const resultado = db
        .prepare(`
            SELECT id_compra
            FROM compras
            WHERE id_proveedor = ?
              AND numero_soporte = ?
              AND estado <> 'anulada'
            LIMIT 1
        `)
        .get(Number(idProveedor), soporte);

    return Boolean(resultado);
}

function obtenerConfiguracionNegocio() {
    return db
        .prepare(`
            SELECT
                id_configuracion,
                nombre_negocio,
                nombre_comercial,
                tipo_documento,
                documento,
                direccion,
                telefono,
                correo,
                moneda,
                mensaje_recibo,
                logo_url
            FROM configuracion_negocio
            WHERE estado = 'activo'
            ORDER BY id_configuracion ASC
            LIMIT 1
        `)
        .get();
}

function obtenerCompraPorId(idCompra) {
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
                c.condicion_pago,
                c.dias_plazo,
                c.fecha_vencimiento,
                c.estado_pago,
                c.fecha_pago,
                c.total_pagado,
                c.saldo_pendiente,

                p.id_proveedor,
                p.nombre_comercial AS proveedor_nombre_comercial,
                p.razon_social AS proveedor_razon_social,
                p.tipo_documento AS proveedor_tipo_documento,
                p.documento AS proveedor_documento,
                p.telefono AS proveedor_telefono,
                p.celular AS proveedor_celular,
                p.correo AS proveedor_correo,
                p.contacto_nombre AS proveedor_contacto_nombre,

                u.nombre AS usuario_nombre
            FROM compras c
            INNER JOIN proveedores p
                ON p.id_proveedor = c.id_proveedor
            LEFT JOIN usuarios u
                ON u.id_usuario = c.id_usuario
            WHERE c.id_compra = ?
            LIMIT 1
        `)
        .get(Number(idCompra));
}

function listarDetalleCompra(idCompra) {
    return db
        .prepare(`
            SELECT
                cd.id_compra_detalle,
                cd.id_compra,
                cd.id_producto,
                cd.cantidad,
                cd.costo_unitario,
                cd.porcentaje_iva,
                cd.subtotal_linea,
                cd.iva_linea,
                cd.total_linea,
                cd.stock_anterior,
                cd.stock_nuevo,
                cd.ultimo_costo_anterior,
                cd.costo_promedio_anterior,
                cd.costo_promedio_nuevo,
                cd.descuento_porcentaje,
                cd.descuento_linea,
                cd.costo_unitario_neto,
                cd.iva_unitario,
                cd.costo_unitario_final,
                cd.precio_venta_anterior,
                cd.ganancia_sobre_costo_porcentaje,
                cd.precio_venta_sugerido,
                cd.actualizar_precio_venta,
                cd.precio_venta_nuevo,

                p.nombre AS producto_nombre,
                p.codigo_interno AS producto_codigo,
                u.abreviatura AS unidad_abreviatura
            FROM compras_detalle cd
            INNER JOIN productos p
                ON p.id_producto = cd.id_producto
            LEFT JOIN unidades_medida u
                ON u.id_unidad_medida = p.id_unidad_medida
            WHERE cd.id_compra = ?
            ORDER BY cd.id_compra_detalle ASC
        `)
        .all(Number(idCompra));
}

function registrarCompraConInventario({ compra, lineas, usuario, ip, userAgent }) {
    const transaccion = db.transaction(() => {
        const numeracion = obtenerNumeracionCompra();

        if (!numeracion) {
            throw new Error('No existe numeración activa para compras a proveedores.');
        }

        const prefijo = limpiarTexto(numeracion.prefijo) || 'CP';
        const longitudConsecutivo = normalizarEntero(numeracion.longitud_consecutivo, 6);
        const ultimoDocumento = obtenerUltimoConsecutivoCompra(prefijo);

        const consecutivo = Math.max(
            normalizarEntero(numeracion.ultimo_consecutivo),
            ultimoDocumento
        ) + 1;

        const numeroCompra = formatearNumeroDocumento(
            prefijo,
            consecutivo,
            longitudConsecutivo
        );

        const resultadoCompra = db
            .prepare(`
                INSERT INTO compras (
                    numero_compra,
                    id_proveedor,
                    id_usuario,
                    numero_soporte,
                    tipo_soporte,
                    fecha_compra,
                    subtotal,
                    iva_total,
                    total,
                    estado,
                    observaciones,
                    condicion_pago,
                    dias_plazo,
                    fecha_vencimiento,
                    estado_pago,
                    fecha_pago,
                    total_pagado,
                    saldo_pendiente
                ) VALUES (
                    @numero_compra,
                    @id_proveedor,
                    @id_usuario,
                    @numero_soporte,
                    @tipo_soporte,
                    @fecha_compra,
                    @subtotal,
                    @iva_total,
                    @total,
                    'registrada',
                    @observaciones,
                    @condicion_pago,
                    @dias_plazo,
                    @fecha_vencimiento,
                    @estado_pago,
                    @fecha_pago,
                    @total_pagado,
                    @saldo_pendiente
                )
            `)
            .run({
                numero_compra: numeroCompra,
                id_proveedor: compra.id_proveedor,
                id_usuario: usuario?.id_usuario || null,
                numero_soporte: compra.numero_soporte || null,
                tipo_soporte: compra.tipo_soporte,
                fecha_compra: compra.fecha_compra,
                subtotal: compra.subtotal,
                iva_total: compra.iva_total,
                total: compra.total,
                observaciones: compra.observaciones || null,
                condicion_pago: compra.condicion_pago || 'contado',
                dias_plazo: compra.dias_plazo || 0,
                fecha_vencimiento: compra.fecha_vencimiento || compra.fecha_compra,
                estado_pago: compra.estado_pago || 'pagada',
                fecha_pago: compra.fecha_pago || null,
                total_pagado: compra.total_pagado || 0,
                saldo_pendiente: compra.saldo_pendiente || 0,
            });

        const idCompra = Number(resultadoCompra.lastInsertRowid);

        const obtenerProducto = db.prepare(`
            SELECT
                p.id_producto,
                p.id_unidad_medida,
                p.codigo_interno,
                p.codigo_barras,
                p.nombre,
                p.precio_costo,
                p.precio_venta,
                p.costo_promedio,
                p.ultimo_costo,
                p.stock_actual,
                p.controla_inventario,
                p.estado,
                p.eliminado_en,
                u.abreviatura AS unidad_abreviatura
            FROM productos p
            LEFT JOIN unidades_medida u
                ON u.id_unidad_medida = p.id_unidad_medida
            WHERE p.id_producto = ?
              AND p.estado = 'activo'
              AND p.eliminado_en IS NULL
            LIMIT 1
        `);

        const insertarDetalle = db.prepare(`
            INSERT INTO compras_detalle (
                id_compra,
                id_producto,
                cantidad,
                costo_unitario,
                porcentaje_iva,
                subtotal_linea,
                iva_linea,
                total_linea,
                stock_anterior,
                stock_nuevo,
                ultimo_costo_anterior,
                costo_promedio_anterior,
                costo_promedio_nuevo,
                descuento_porcentaje,
                descuento_linea,
                costo_unitario_neto,
                iva_unitario,
                costo_unitario_final,
                precio_venta_anterior,
                ganancia_sobre_costo_porcentaje,
                precio_venta_sugerido,
                actualizar_precio_venta,
                precio_venta_nuevo
            ) VALUES (
                @id_compra,
                @id_producto,
                @cantidad,
                @costo_unitario,
                @porcentaje_iva,
                @subtotal_linea,
                @iva_linea,
                @total_linea,
                @stock_anterior,
                @stock_nuevo,
                @ultimo_costo_anterior,
                @costo_promedio_anterior,
                @costo_promedio_nuevo,
                @descuento_porcentaje,
                @descuento_linea,
                @costo_unitario_neto,
                @iva_unitario,
                @costo_unitario_final,
                @precio_venta_anterior,
                @ganancia_sobre_costo_porcentaje,
                @precio_venta_sugerido,
                @actualizar_precio_venta,
                @precio_venta_nuevo
            )
        `);

        const actualizarProductoConPrecio = db.prepare(`
            UPDATE productos
            SET
                stock_actual = @stock_nuevo,
                ultimo_costo = @ultimo_costo,
                costo_promedio = @costo_promedio,
                precio_venta = @precio_venta,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_producto = @id_producto
              AND eliminado_en IS NULL
        `);

        const actualizarProductoSinPrecio = db.prepare(`
            UPDATE productos
            SET
                stock_actual = @stock_nuevo,
                ultimo_costo = @ultimo_costo,
                costo_promedio = @costo_promedio,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_producto = @id_producto
              AND eliminado_en IS NULL
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
                'compra',
                @cantidad,
                @stock_anterior,
                @stock_nuevo,
                @costo_unitario,
                @costo_total,
                @motivo,
                'compra',
                @referencia_id
            )
        `);

        const insertarAuditoria = db.prepare(`
            INSERT INTO auditoria (
                id_usuario,
                accion,
                tabla_afectada,
                id_registro_afectado,
                datos_anteriores,
                datos_nuevos,
                ip,
                user_agent
            ) VALUES (
                @id_usuario,
                @accion,
                @tabla_afectada,
                @id_registro_afectado,
                @datos_anteriores,
                @datos_nuevos,
                @ip,
                @user_agent
            )
        `);

        for (const linea of lineas) {
            const producto = obtenerProducto.get(linea.id_producto);

            if (!producto) {
                throw new Error(`No se encontró el producto de la línea ${linea.id_producto}.`);
            }

            const stockAnterior = normalizarNumero(producto.stock_actual);
            const controlaInventario = Number(producto.controla_inventario || 0) === 1;
            const cantidad = normalizarNumero(linea.cantidad);

            const stockNuevo = controlaInventario
                ? stockAnterior + cantidad
                : stockAnterior;

            const ultimoCostoAnterior = normalizarEntero(producto.ultimo_costo);
            const costoPromedioAnterior =
                normalizarEntero(producto.costo_promedio) ||
                normalizarEntero(producto.ultimo_costo) ||
                normalizarEntero(producto.precio_costo);

            const valorInventarioAnterior = stockAnterior * costoPromedioAnterior;
            const valorCompra = cantidad * normalizarEntero(linea.costo_unitario_final);

            const costoPromedioNuevo = controlaInventario && stockNuevo > 0
                ? normalizarEntero((valorInventarioAnterior + valorCompra) / stockNuevo)
                : normalizarEntero(linea.costo_unitario_final);

            const precioVentaAnterior = normalizarEntero(producto.precio_venta);
            const debeActualizarPrecio = Number(linea.actualizar_precio_venta || 0) === 1;
            const precioVentaNuevo = debeActualizarPrecio
                ? normalizarEntero(linea.precio_venta_nuevo || linea.precio_venta_sugerido)
                : precioVentaAnterior;

            insertarDetalle.run({
                id_compra: idCompra,
                id_producto: producto.id_producto,
                cantidad,
                costo_unitario: linea.costo_unitario,
                porcentaje_iva: linea.porcentaje_iva,
                subtotal_linea: linea.subtotal_linea,
                iva_linea: linea.iva_linea,
                total_linea: linea.total_linea,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                ultimo_costo_anterior: ultimoCostoAnterior,
                costo_promedio_anterior: costoPromedioAnterior,
                costo_promedio_nuevo: costoPromedioNuevo,
                descuento_porcentaje: linea.descuento_porcentaje,
                descuento_linea: linea.descuento_linea,
                costo_unitario_neto: linea.costo_unitario_neto,
                iva_unitario: linea.iva_unitario,
                costo_unitario_final: linea.costo_unitario_final,
                precio_venta_anterior: precioVentaAnterior,
                ganancia_sobre_costo_porcentaje: linea.ganancia_sobre_costo_porcentaje,
                precio_venta_sugerido: linea.precio_venta_sugerido,
                actualizar_precio_venta: debeActualizarPrecio ? 1 : 0,
                precio_venta_nuevo: precioVentaNuevo,
            });

            const actualizacion = debeActualizarPrecio
                ? actualizarProductoConPrecio.run({
                    id_producto: producto.id_producto,
                    stock_nuevo: stockNuevo,
                    ultimo_costo: linea.costo_unitario_final,
                    costo_promedio: costoPromedioNuevo,
                    precio_venta: precioVentaNuevo,
                })
                : actualizarProductoSinPrecio.run({
                    id_producto: producto.id_producto,
                    stock_nuevo: stockNuevo,
                    ultimo_costo: linea.costo_unitario_final,
                    costo_promedio: costoPromedioNuevo,
                });

            if (actualizacion.changes === 0) {
                throw new Error(`No se pudo actualizar el producto ${producto.nombre}.`);
            }

            if (controlaInventario) {
                insertarMovimientoInventario.run({
                    id_producto: producto.id_producto,
                    id_usuario: usuario?.id_usuario || 1,
                    id_unidad_medida: producto.id_unidad_medida,
                    unidad_abreviatura: producto.unidad_abreviatura || null,
                    cantidad,
                    stock_anterior: stockAnterior,
                    stock_nuevo: stockNuevo,
                    costo_unitario: linea.costo_unitario_final,
                    costo_total: linea.total_linea,
                    motivo: `Compra ${numeroCompra}`,
                    referencia_id: idCompra,
                });
            }

            insertarAuditoria.run({
                id_usuario: usuario?.id_usuario || null,
                accion: 'registrar_compra_producto',
                tabla_afectada: 'productos',
                id_registro_afectado: producto.id_producto,
                datos_anteriores: JSON.stringify({
                    stock_actual: stockAnterior,
                    ultimo_costo: ultimoCostoAnterior,
                    costo_promedio: costoPromedioAnterior,
                    precio_venta: precioVentaAnterior,
                }),
                datos_nuevos: JSON.stringify({
                    id_compra: idCompra,
                    numero_compra: numeroCompra,
                    stock_actual: stockNuevo,
                    ultimo_costo: linea.costo_unitario_final,
                    costo_promedio: costoPromedioNuevo,
                    precio_venta: precioVentaNuevo,
                    actualizar_precio_venta: debeActualizarPrecio ? 1 : 0,
                }),
                ip: ip || 'local',
                user_agent: userAgent || '',
            });
        }

        db.prepare(`
            UPDATE numeraciones_documentos
            SET ultimo_consecutivo = @consecutivo,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_numeracion = @id_numeracion
        `).run({
            id_numeracion: numeracion.id_numeracion,
            consecutivo,
        });

        insertarAuditoria.run({
            id_usuario: usuario?.id_usuario || null,
            accion: 'registrar_compra',
            tabla_afectada: 'compras',
            id_registro_afectado: idCompra,
            datos_anteriores: null,
            datos_nuevos: JSON.stringify({
                id_compra: idCompra,
                numero_compra: numeroCompra,
                total: compra.total,
                condicion_pago: compra.condicion_pago,
                fecha_vencimiento: compra.fecha_vencimiento,
                estado_pago: compra.estado_pago,
                saldo_pendiente: compra.saldo_pendiente,
                lineas: lineas.length,
            }),
            ip: ip || 'local',
            user_agent: userAgent || '',
        });

        return {
            id_compra: idCompra,
            numero_compra: numeroCompra,
        };
    });

    return transaccion();
}

module.exports = {
    listarCompras,
    contarCompras,
    obtenerResumenCuentasPorPagar,
    listarCuentasPorPagar,
    listarProveedoresActivos,
    buscarProductosParaCompra,
    obtenerSiguienteNumeroCompra,
    existeSoporteProveedorActivo,
    obtenerConfiguracionNegocio,
    obtenerCompraPorId,
    obtenerCompraParaPagoProveedor,
    listarDetalleCompra,
    listarPagosCompraProveedor,
    listarMediosPagoActivos,
    obtenerMedioPagoPorId,
    registrarPagoCompraProveedor,
    registrarCompraConInventario,
};