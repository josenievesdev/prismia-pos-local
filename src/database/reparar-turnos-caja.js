const db = require('../config/db');

function dinero(valor) {
    return `$ ${Number(valor || 0).toLocaleString('es-CO')}`;
}

function obtenerResumenMovimientosTurno(idTurnoCaja) {
    return db.prepare(`
        SELECT
            COALESCE(SUM(CASE WHEN tipo_movimiento = 'venta' THEN monto ELSE 0 END), 0) AS total_ventas,

            COALESCE(SUM(
                CASE
                    WHEN tipo_movimiento = 'venta' AND metodo_pago = 'efectivo'
                    THEN monto
                    ELSE 0
                END
            ), 0) AS total_efectivo,

            COALESCE(SUM(
                CASE
                    WHEN tipo_movimiento = 'venta' AND metodo_pago = 'transferencia'
                    THEN monto
                    ELSE 0
                END
            ), 0) AS total_transferencia,

            COALESCE(SUM(
                CASE
                    WHEN tipo_movimiento = 'venta' AND metodo_pago = 'tarjeta'
                    THEN monto
                    ELSE 0
                END
            ), 0) AS total_tarjeta,

            COALESCE(SUM(
                CASE
                    WHEN tipo_movimiento = 'venta'
                     AND metodo_pago NOT IN ('efectivo', 'transferencia', 'tarjeta')
                    THEN monto
                    ELSE 0
                END
            ), 0) AS total_otros
        FROM movimientos_caja
        WHERE id_turno_caja = ?
    `).get(idTurnoCaja);
}

function obtenerTurnosConDiferencias() {
    return db.prepare(`
        WITH movimientos AS (
            SELECT
                id_turno_caja,
                COALESCE(SUM(CASE WHEN tipo_movimiento = 'venta' THEN monto ELSE 0 END), 0) AS ventas_mov,
                COALESCE(SUM(CASE WHEN tipo_movimiento = 'venta' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END), 0) AS efectivo_mov,
                COALESCE(SUM(CASE WHEN tipo_movimiento = 'venta' AND metodo_pago = 'transferencia' THEN monto ELSE 0 END), 0) AS transferencia_mov,
                COALESCE(SUM(CASE WHEN tipo_movimiento = 'venta' AND metodo_pago = 'tarjeta' THEN monto ELSE 0 END), 0) AS tarjeta_mov,
                COALESCE(SUM(CASE WHEN tipo_movimiento = 'venta' AND metodo_pago NOT IN ('efectivo', 'transferencia', 'tarjeta') THEN monto ELSE 0 END), 0) AS otros_mov
            FROM movimientos_caja
            GROUP BY id_turno_caja
        )
        SELECT
            t.id_turno_caja,
            t.estado,
            t.total_ventas,
            COALESCE(m.ventas_mov, 0) AS ventas_mov,
            t.total_efectivo,
            COALESCE(m.efectivo_mov, 0) AS efectivo_mov,
            t.total_transferencia,
            COALESCE(m.transferencia_mov, 0) AS transferencia_mov,
            t.total_tarjeta,
            COALESCE(m.tarjeta_mov, 0) AS tarjeta_mov,
            t.total_otros,
            COALESCE(m.otros_mov, 0) AS otros_mov
        FROM turnos_caja t
        LEFT JOIN movimientos m ON m.id_turno_caja = t.id_turno_caja
        WHERE
            ABS(t.total_ventas - COALESCE(m.ventas_mov, 0)) > 1
            OR ABS(t.total_efectivo - COALESCE(m.efectivo_mov, 0)) > 1
            OR ABS(t.total_transferencia - COALESCE(m.transferencia_mov, 0)) > 1
            OR ABS(t.total_tarjeta - COALESCE(m.tarjeta_mov, 0)) > 1
            OR ABS(t.total_otros - COALESCE(m.otros_mov, 0)) > 1
        ORDER BY t.id_turno_caja;
    `).all();
}

function repararTurnos() {
    const turnos = obtenerTurnosConDiferencias();

    console.log('====================================');
    console.log('Reparación de turnos de caja');
    console.log('====================================');

    if (turnos.length === 0) {
        console.log('[OK] No hay turnos con acumuladores descuadrados.');
        return;
    }

    console.log(`Turnos a reparar: ${turnos.length}`);
    console.table(turnos);

    const actualizarTurno = db.prepare(`
        UPDATE turnos_caja
        SET
            total_ventas = ?,
            total_efectivo = ?,
            total_transferencia = ?,
            total_tarjeta = ?,
            total_otros = ?,
            actualizado_en = datetime('now', 'localtime')
        WHERE id_turno_caja = ?
    `);

    const transaccion = db.transaction(() => {
        for (const turno of turnos) {
            const resumen = obtenerResumenMovimientosTurno(turno.id_turno_caja);

            actualizarTurno.run(
                Number(resumen.total_ventas || 0),
                Number(resumen.total_efectivo || 0),
                Number(resumen.total_transferencia || 0),
                Number(resumen.total_tarjeta || 0),
                Number(resumen.total_otros || 0),
                turno.id_turno_caja
            );

            console.log(
                `[OK] Turno #${turno.id_turno_caja} reparado: ventas ${dinero(resumen.total_ventas)}, efectivo ${dinero(resumen.total_efectivo)}, transferencia ${dinero(resumen.total_transferencia)}, tarjeta ${dinero(resumen.total_tarjeta)}, otros ${dinero(resumen.total_otros)}`
            );
        }
    });

    transaccion();

    console.log('====================================');
    console.log('Reparación finalizada.');
    console.log('Ejecuta npm run db:audit:contable para verificar.');
    console.log('====================================');
}

try {
    repararTurnos();
} catch (error) {
    console.error('No se pudo reparar turnos de caja:', error);
    process.exitCode = 1;
} finally {
    db.close();
}