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

    return transaccion();
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
                        WHEN m.tipo_movimiento IN ('ingreso_manual', 'venta') THEN m.monto
                        ELSE 0
                    END
                ), 0) AS total_ingresos,

                COALESCE(SUM(
                    CASE
                        WHEN m.tipo_movimiento IN ('egreso_manual', 'devolucion', 'anulacion') THEN m.monto
                        ELSE 0
                    END
                ), 0) AS total_egresos,

                COALESCE(SUM(
                    CASE
                        WHEN m.tipo_movimiento IN ('ingreso_manual', 'venta') THEN m.monto
                        WHEN m.tipo_movimiento IN ('egreso_manual', 'devolucion', 'anulacion') THEN -m.monto
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

function actualizarTotalesTurnoPorMovimiento({ idTurnoCaja, tipoMovimiento, monto, medioPago }) {
    const afectaEfectivo = Number(medioPago.afecta_efectivo_caja || 0) === 1;

    if (!afectaEfectivo) {
        db.prepare(`
            UPDATE turnos_caja
            SET actualizado_en = CURRENT_TIMESTAMP
            WHERE id_turno_caja = ?
        `).run(idTurnoCaja);

        return;
    }

    if (tipoMovimiento === 'ingreso_manual') {
        db.prepare(`
            UPDATE turnos_caja
            SET
                total_ingresos_manuales = total_ingresos_manuales + @monto,
                monto_esperado = monto_esperado + @monto,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_turno_caja = @id_turno_caja
              AND estado = 'abierto'
        `).run({
            id_turno_caja: idTurnoCaja,
            monto,
        });

        return;
    }

    if (tipoMovimiento === 'egreso_manual') {
        db.prepare(`
            UPDATE turnos_caja
            SET
                total_egresos_manuales = total_egresos_manuales + @monto,
                monto_esperado = monto_esperado - @monto,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_turno_caja = @id_turno_caja
              AND estado = 'abierto'
        `).run({
            id_turno_caja: idTurnoCaja,
            monto,
        });
    }
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

        actualizarTotalesTurnoPorMovimiento({
            idTurnoCaja: turno.id_turno_caja,
            tipoMovimiento,
            monto,
            medioPago,
        });

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

    return transaccion();
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

        actualizarTotalesTurnoPorMovimiento({
            idTurnoCaja: turno.id_turno_caja,
            tipoMovimiento: 'egreso_manual',
            monto,
            medioPago,
        });

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

    return transaccion();
}

module.exports = {
    obtenerTurnoAbierto,
    obtenerTurnoPorId,
    crearTurnoCaja,
    listarMovimientosPorTurno,
    listarTurnosRecientes,
    listarMediosPagoActivos,
    listarResumenMovimientosPorMedio,
    obtenerMedioPagoPorId,
    listarCategoriasGastoActivas,
    obtenerCategoriaGastoPorId,
    crearMovimientoManual,
    crearGastoDesdeCaja,
};