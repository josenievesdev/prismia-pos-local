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

module.exports = {
    obtenerTurnoAbierto,
    obtenerTurnoPorId,
    crearTurnoCaja,
    listarMovimientosPorTurno,
    listarTurnosRecientes,
    listarMediosPagoActivos,
};