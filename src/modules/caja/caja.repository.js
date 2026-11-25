const db = require('../../config/db');
const cajaTotales = require('./caja.totales');

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

function obtenerTurnoPorId(idTurnoCaja) {
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
            WHERE t.id_turno_caja = ?
            LIMIT 1
        `)
        .get(idTurnoCaja);
}

function crearTurnoCaja({ usuario, montoInicial, observacionesApertura, ip, userAgent }) {
    const transaccion = db.transaction(() => {
        const turnoAbiertoExistente = db
            .prepare(`SELECT id_turno_caja FROM turnos_caja WHERE estado = 'abierto' LIMIT 1`)
            .get();

        if (turnoAbiertoExistente) {
            throw new Error('Ya existe una caja abierta. Debes cerrarla antes de abrir otra.');
        }

        const resultado = db
            .prepare(`
                INSERT INTO turnos_caja (
                    id_usuario_apertura,
                    monto_inicial,
                    monto_esperado,
                    observaciones_apertura
                ) VALUES (
                    @id_usuario_apertura,
                    @monto_inicial,
                    @monto_esperado,
                    @observaciones_apertura
                )
            `)
            .run({
                id_usuario_apertura: usuario.id_usuario,
                monto_inicial: montoInicial,
                monto_esperado: montoInicial,
                observaciones_apertura: observacionesApertura || null,
            });

        const idTurnoCaja = resultado.lastInsertRowid;

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
                'abrir_caja',
                'turnos_caja',
                @id_registro_afectado,
                NULL,
                @datos_nuevos,
                @ip,
                @user_agent
            )
        `).run({
            id_usuario: usuario.id_usuario,
            id_registro_afectado: idTurnoCaja,
            datos_nuevos: JSON.stringify({
                id_turno_caja: idTurnoCaja,
                monto_inicial: montoInicial,
                monto_esperado: montoInicial,
                observaciones_apertura: observacionesApertura || null,
            }),
            ip: ip || 'local',
            user_agent: userAgent || '',
        });

        return idTurnoCaja;
    });

    return transaccion.immediate();
}

function listarMovimientosPorTurno(idTurnoCaja, limite = 50) {
    return db
        .prepare(`
            SELECT
                m.*,
                u.nombre AS usuario_nombre,
                mp.codigo AS codigo_medio_pago,
                mp.nombre AS nombre_medio_pago,
                mp.tipo AS tipo_medio_pago,
                mp.afecta_efectivo_caja
            FROM movimientos_caja m
            INNER JOIN usuarios u
                ON u.id_usuario = m.id_usuario
            LEFT JOIN medios_pago mp
                ON mp.id_medio_pago = m.id_medio_pago
            WHERE m.id_turno_caja = ?
            ORDER BY m.creado_en DESC, m.id_movimiento_caja DESC
            LIMIT ?
        `)
        .all(idTurnoCaja, limite);
}

function listarMovimientosCompletosPorTurno(idTurnoCaja) {
    return db
        .prepare(`
            SELECT
                m.*,
                u.nombre AS usuario_nombre,
                mp.codigo AS codigo_medio_pago,
                mp.nombre AS nombre_medio_pago,
                mp.tipo AS tipo_medio_pago,
                mp.afecta_efectivo_caja
            FROM movimientos_caja m
            INNER JOIN usuarios u
                ON u.id_usuario = m.id_usuario
            LEFT JOIN medios_pago mp
                ON mp.id_medio_pago = m.id_medio_pago
            WHERE m.id_turno_caja = ?
            ORDER BY m.creado_en ASC, m.id_movimiento_caja ASC
        `)
        .all(idTurnoCaja);
}

function listarTurnosRecientes(limite = 10) {
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
            ORDER BY t.fecha_apertura DESC, t.id_turno_caja DESC
            LIMIT ?
        `)
        .all(limite);
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

function listarResumenMovimientosPorMedio(idTurnoCaja) {
    return db
        .prepare(`
            SELECT
                mp.id_medio_pago,
                mp.codigo,
                mp.nombre,
                mp.tipo,
                mp.requiere_referencia,
                mp.afecta_efectivo_caja,
                mp.activo,
                mp.orden,

                COUNT(m.id_movimiento_caja) AS cantidad_operaciones,

                COALESCE(SUM(
                    CASE
                        WHEN m.tipo_movimiento IN ('ingreso_manual', 'venta', 'propina') THEN m.monto
                        ELSE 0
                    END
                ), 0) AS total_ingresos,

                COALESCE(SUM(
                    CASE
                        WHEN m.tipo_movimiento IN ('egreso_manual', 'devolucion', 'anulacion', 'anulacion_propina') THEN m.monto
                        ELSE 0
                    END
                ), 0) AS total_egresos,

                COALESCE(SUM(
                    CASE
                        WHEN m.tipo_movimiento IN ('ingreso_manual', 'venta', 'propina') THEN m.monto
                        WHEN m.tipo_movimiento IN ('egreso_manual', 'devolucion', 'anulacion', 'anulacion_propina') THEN -m.monto
                        ELSE 0
                    END
                ), 0) AS saldo_neto

            FROM medios_pago mp
            LEFT JOIN movimientos_caja m
                ON m.id_medio_pago = mp.id_medio_pago
               AND m.id_turno_caja = ?

            WHERE mp.activo = 1

            GROUP BY
                mp.id_medio_pago,
                mp.codigo,
                mp.nombre,
                mp.tipo,
                mp.requiere_referencia,
                mp.afecta_efectivo_caja,
                mp.activo,
                mp.orden

            ORDER BY mp.orden ASC, mp.nombre ASC
        `)
        .all(idTurnoCaja);
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
        .get(idMedioPago);
}

function listarCategoriasGastoActivas() {
    return db
        .prepare(`
            SELECT
                id_categoria_gasto,
                nombre,
                descripcion,
                estado
            FROM categorias_gasto
            WHERE estado = 'activo'
              AND eliminado_en IS NULL
            ORDER BY nombre ASC
        `)
        .all();
}

function obtenerCategoriaGastoPorId(idCategoriaGasto) {
    return db
        .prepare(`
            SELECT
                id_categoria_gasto,
                nombre,
                descripcion,
                estado
            FROM categorias_gasto
            WHERE id_categoria_gasto = ?
              AND eliminado_en IS NULL
            LIMIT 1
        `)
        .get(idCategoriaGasto);
}



function listarGastosPorTurno(idTurnoCaja) {
    return db
        .prepare(`
            SELECT
                g.id_gasto,
                g.id_categoria_gasto,
                cg.nombre AS categoria_nombre,
                g.id_usuario,
                u.nombre AS usuario_nombre,
                g.fecha_gasto,
                g.descripcion,
                g.monto,
                g.metodo_pago,
                g.comprobante_url,
                g.afecta_caja,
                g.id_turno_caja,
                g.estado,
                g.id_medio_pago,
                mp.codigo AS codigo_medio_pago,
                mp.nombre AS nombre_medio_pago,
                mp.tipo AS tipo_medio_pago,
                mp.afecta_efectivo_caja,
                g.referencia_pago,
                g.entidad_pago,
                g.creado_en,
                g.actualizado_en,
                g.anulado_en,
                g.anulado_por,
                ua.nombre AS usuario_anulacion_nombre,
                g.motivo_anulacion
            FROM gastos g
            LEFT JOIN categorias_gasto cg
                ON cg.id_categoria_gasto = g.id_categoria_gasto
            LEFT JOIN usuarios u
                ON u.id_usuario = g.id_usuario
            LEFT JOIN usuarios ua
                ON ua.id_usuario = g.anulado_por
            LEFT JOIN medios_pago mp
                ON mp.id_medio_pago = g.id_medio_pago
            WHERE g.id_turno_caja = ?
            ORDER BY g.fecha_gasto ASC, g.id_gasto ASC
        `)
        .all(idTurnoCaja);
}

function crearMovimientoManual({
    turno,
    usuario,
    medioPago,
    tipoMovimiento,
    monto,
    descripcion,
    referenciaPago,
    entidadPago,
    ip,
    userAgent,
}) {
    const transaccion = db.transaction(() => {
        cajaTotales.exigirTurnoAbierto(db, turno.id_turno_caja);

        const resultado = db
            .prepare(`
                INSERT INTO movimientos_caja (
                    id_turno_caja,
                    id_usuario,
                    tipo_movimiento,
                    metodo_pago,
                    id_medio_pago,
                    monto,
                    descripcion,
                    referencia_tipo,
                    referencia_id,
                    referencia_pago,
                    entidad_pago
                ) VALUES (
                    @id_turno_caja,
                    @id_usuario,
                    @tipo_movimiento,
                    @metodo_pago,
                    @id_medio_pago,
                    @monto,
                    @descripcion,
                    NULL,
                    NULL,
                    @referencia_pago,
                    @entidad_pago
                )
            `)
            .run({
                id_turno_caja: turno.id_turno_caja,
                id_usuario: usuario.id_usuario,
                tipo_movimiento: tipoMovimiento,
                metodo_pago: medioPago.tipo,
                id_medio_pago: medioPago.id_medio_pago,
                monto,
                descripcion,
                referencia_pago: referenciaPago || null,
                entidad_pago: entidadPago || null,
            });

        const idMovimientoCaja = resultado.lastInsertRowid;

        cajaTotales.sincronizarTotalesTurno(db, turno.id_turno_caja);

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
                'crear_movimiento_caja',
                'movimientos_caja',
                @id_registro_afectado,
                NULL,
                @datos_nuevos,
                @ip,
                @user_agent
            )
        `).run({
            id_usuario: usuario.id_usuario,
            id_registro_afectado: idMovimientoCaja,
            datos_nuevos: JSON.stringify({
                id_movimiento_caja: idMovimientoCaja,
                id_turno_caja: turno.id_turno_caja,
                tipo_movimiento: tipoMovimiento,
                metodo_pago: medioPago.tipo,
                id_medio_pago: medioPago.id_medio_pago,
                medio_pago: medioPago.nombre,
                afecta_efectivo_caja: medioPago.afecta_efectivo_caja,
                monto,
                descripcion,
                referencia_pago: referenciaPago || null,
                entidad_pago: entidadPago || null,
            }),
            ip: ip || 'local',
            user_agent: userAgent || '',
        });

        return idMovimientoCaja;
    });

    return transaccion.immediate();
}

function cerrarTurnoCaja({
    turno,
    usuario,
    montoContado,
    observacionesCierre,
    ip,
    userAgent,
}) {
    const transaccion = db.transaction(() => {
        const turnoAnterior = obtenerTurnoPorId(turno.id_turno_caja);

        if (!turnoAnterior || turnoAnterior.estado !== 'abierto') {
            throw new Error('No existe un turno abierto válido para cerrar.');
        }

        // Foto final de los totales: lo guardado queda igual a lo calculado
        // desde los movimientos en el instante del cierre.
        const totales = cajaTotales.sincronizarTotalesTurno(db, turno.id_turno_caja);
        const diferencia = Number(montoContado) - totales.monto_esperado;

        const resultado = db
            .prepare(`
                UPDATE turnos_caja
                SET
                    id_usuario_cierre = @id_usuario_cierre,
                    fecha_cierre = CURRENT_TIMESTAMP,
                    monto_contado = @monto_contado,
                    diferencia = @diferencia,
                    observaciones_cierre = @observaciones_cierre,
                    estado = 'cerrado',
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id_turno_caja = @id_turno_caja
                  AND estado = 'abierto'
            `)
            .run({
                id_turno_caja: turno.id_turno_caja,
                id_usuario_cierre: usuario.id_usuario,
                monto_contado: montoContado,
                diferencia,
                observaciones_cierre: observacionesCierre || null,
            });

        if (resultado.changes === 0) {
            throw new Error('No se pudo cerrar el turno. Es posible que ya esté cerrado.');
        }

        const turnoCerrado = obtenerTurnoPorId(turno.id_turno_caja);

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
                'cerrar_caja',
                'turnos_caja',
                @id_registro_afectado,
                @datos_anteriores,
                @datos_nuevos,
                @ip,
                @user_agent
            )
        `).run({
            id_usuario: usuario.id_usuario,
            id_registro_afectado: turno.id_turno_caja,
            datos_anteriores: JSON.stringify(turnoAnterior),
            datos_nuevos: JSON.stringify(turnoCerrado),
            ip: ip || 'local',
            user_agent: userAgent || '',
        });

        return turnoCerrado;
    });

    return transaccion.immediate();
}

function listarFacturasVentasPorTurno(idTurnoCaja) {
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
                v.total_pagado,
                v.saldo_pendiente,
                v.cambio_entregado,
                v.origen,
                v.tipo_venta,
                v.creado_en,

                c.nombre AS cliente_nombre,
                c.tipo_documento AS cliente_tipo_documento,
                c.documento AS cliente_documento,

                u.nombre AS cajero_nombre,

                comp.id_comprobante,
                comp.numero AS comprobante_numero,
                comp.estado AS comprobante_estado,
                comp.fecha_emision AS comprobante_fecha_emision,

                pagos.medios_pago_nombre,
                pagos.medios_pago_tipo,
                pagos.metodos_pago,
                pagos.estados_pago,
                pagos.total_pagado_calculado,

                detalle.cantidad_items,
                detalle.total_unidades
            FROM ventas v
            LEFT JOIN clientes c
                ON c.id_cliente = v.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = v.id_usuario
            LEFT JOIN comprobantes comp
                ON comp.id_venta = v.id_venta
            LEFT JOIN (
                SELECT
                    pv.id_venta,
                    GROUP_CONCAT(DISTINCT COALESCE(mp.nombre, pv.entidad, pv.metodo_pago)) AS medios_pago_nombre,
                    GROUP_CONCAT(DISTINCT COALESCE(mp.tipo, pv.metodo_pago)) AS medios_pago_tipo,
                    GROUP_CONCAT(DISTINCT pv.metodo_pago) AS metodos_pago,
                    GROUP_CONCAT(DISTINCT pv.estado) AS estados_pago,
                    COALESCE(SUM(pv.monto), 0) AS total_pagado_calculado
                FROM pagos_venta pv
                LEFT JOIN medios_pago mp
                    ON mp.id_medio_pago = pv.id_medio_pago
                WHERE pv.estado IN ('registrado', 'anulado')
                GROUP BY pv.id_venta
            ) pagos
                ON pagos.id_venta = v.id_venta
            LEFT JOIN (
                SELECT
                    dv.id_venta,
                    COUNT(*) AS cantidad_items,
                    COALESCE(SUM(dv.cantidad), 0) AS total_unidades
                FROM detalle_ventas dv
                GROUP BY dv.id_venta
            ) detalle
                ON detalle.id_venta = v.id_venta
            WHERE v.id_turno_caja = ?
            ORDER BY datetime(v.fecha_venta) ASC, v.id_venta ASC
        `)
        .all(idTurnoCaja);
}

function crearGastoDesdeCaja({
    turno,
    usuario,
    categoriaGasto,
    medioPago,
    monto,
    descripcion,
    referenciaPago,
    entidadPago,
    comprobanteUrl,
    ip,
    userAgent,
}) {
    const transaccion = db.transaction(() => {
        cajaTotales.exigirTurnoAbierto(db, turno.id_turno_caja);

        const resultadoGasto = db
            .prepare(`
                INSERT INTO gastos (
                    id_categoria_gasto,
                    id_usuario,
                    fecha_gasto,
                    descripcion,
                    monto,
                    metodo_pago,
                    comprobante_url,
                    afecta_caja,
                    id_turno_caja,
                    estado,
                    id_medio_pago,
                    referencia_pago,
                    entidad_pago
                ) VALUES (
                    @id_categoria_gasto,
                    @id_usuario,
                    CURRENT_TIMESTAMP,
                    @descripcion,
                    @monto,
                    @metodo_pago,
                    @comprobante_url,
                    1,
                    @id_turno_caja,
                    'registrado',
                    @id_medio_pago,
                    @referencia_pago,
                    @entidad_pago
                )
            `)
            .run({
                id_categoria_gasto: categoriaGasto.id_categoria_gasto,
                id_usuario: usuario.id_usuario,
                descripcion,
                monto,
                metodo_pago: medioPago.tipo,
                comprobante_url: comprobanteUrl || null,
                id_turno_caja: turno.id_turno_caja,
                id_medio_pago: medioPago.id_medio_pago,
                referencia_pago: referenciaPago || null,
                entidad_pago: entidadPago || null,
            });

        const idGasto = resultadoGasto.lastInsertRowid;

        const resultadoMovimiento = db
            .prepare(`
                INSERT INTO movimientos_caja (
                    id_turno_caja,
                    id_usuario,
                    tipo_movimiento,
                    metodo_pago,
                    id_medio_pago,
                    monto,
                    descripcion,
                    referencia_tipo,
                    referencia_id,
                    referencia_pago,
                    entidad_pago
                ) VALUES (
                    @id_turno_caja,
                    @id_usuario,
                    'egreso_manual',
                    @metodo_pago,
                    @id_medio_pago,
                    @monto,
                    @descripcion,
                    'gasto',
                    @referencia_id,
                    @referencia_pago,
                    @entidad_pago
                )
            `)
            .run({
                id_turno_caja: turno.id_turno_caja,
                id_usuario: usuario.id_usuario,
                metodo_pago: medioPago.tipo,
                id_medio_pago: medioPago.id_medio_pago,
                monto,
                descripcion: `Gasto: ${descripcion}`,
                referencia_id: idGasto,
                referencia_pago: referenciaPago || null,
                entidad_pago: entidadPago || null,
            });

        const idMovimientoCaja = resultadoMovimiento.lastInsertRowid;

        cajaTotales.sincronizarTotalesTurno(db, turno.id_turno_caja);

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
                'crear_gasto_desde_caja',
                'gastos',
                @id_registro_afectado,
                NULL,
                @datos_nuevos,
                @ip,
                @user_agent
            )
        `).run({
            id_usuario: usuario.id_usuario,
            id_registro_afectado: idGasto,
            datos_nuevos: JSON.stringify({
                id_gasto: idGasto,
                id_movimiento_caja: idMovimientoCaja,
                id_turno_caja: turno.id_turno_caja,
                categoria: categoriaGasto.nombre,
                metodo_pago: medioPago.tipo,
                id_medio_pago: medioPago.id_medio_pago,
                medio_pago: medioPago.nombre,
                afecta_efectivo_caja: medioPago.afecta_efectivo_caja,
                monto,
                descripcion,
                referencia_pago: referenciaPago || null,
                entidad_pago: entidadPago || null,
                comprobante_url: comprobanteUrl || null,
            }),
            ip: ip || 'local',
            user_agent: userAgent || '',
        });

        return {
            idGasto,
            idMovimientoCaja,
        };
    });

    return transaccion.immediate();
}

/**
 * Propinas del turno por mesero (perfil comidas y bares). Solo ventas pagadas:
 * la propina de una venta anulada se revirtió y no es de nadie.
 */
function listarPropinasPorMeseroTurno(idTurnoCaja) {
    return db
        .prepare(`
            SELECT
                ms.id_mesero,
                ms.nombre,
                COUNT(v.id_venta) AS ventas_atendidas,
                COALESCE(SUM(v.total), 0) AS total_vendido,
                COALESCE(SUM(v.propina), 0) AS total_propinas
            FROM ventas v
            INNER JOIN meseros ms
                ON ms.id_mesero = v.id_mesero
            WHERE v.id_turno_caja = ?
              AND v.estado = 'pagada'
            GROUP BY ms.id_mesero, ms.nombre
            ORDER BY total_propinas DESC, ms.nombre COLLATE NOCASE ASC
        `)
        .all(idTurnoCaja);
}

module.exports = {
    listarPropinasPorMeseroTurno,
    obtenerTurnoAbierto,
    obtenerTurnoPorId,
    crearTurnoCaja,
    listarMovimientosPorTurno,
    listarMovimientosCompletosPorTurno,
    listarTurnosRecientes,
    listarMediosPagoActivos,
    listarResumenMovimientosPorMedio,
    obtenerMedioPagoPorId,
    listarCategoriasGastoActivas,
    obtenerCategoriaGastoPorId,
    listarGastosPorTurno,
    listarFacturasVentasPorTurno,
    crearMovimientoManual,
    crearGastoDesdeCaja,
    cerrarTurnoCaja,
};