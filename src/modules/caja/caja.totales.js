/**
 * Totales de un turno de caja derivados de movimientos_caja.
 *
 * Es la única fuente de verdad de los totales del turno. Las columnas
 * total_* y monto_esperado de turnos_caja son una copia (caché) que se
 * sincroniza con estas funciones dentro de la misma transacción que crea
 * cada movimiento. Así lo guardado nunca puede divergir de lo real.
 *
 * Reglas (iguales a las del arqueo de caja):
 * - Un movimiento es de efectivo si su medio de pago afecta el efectivo
 *   de la caja, o si su tipo/método es "efectivo".
 * - "anulacion" y "devolucion" reversan ventas.
 * - Ingresos y egresos manuales solo cuentan en efectivo.
 * - "propina" suma y "anulacion_propina" resta propinas (NO son ventas).
 * - monto_esperado = base inicial + ventas efectivo netas + propinas en efectivo
 *   + ingresos - egresos (las propinas en efectivo están en el cajón).
 */

const SQL_TOTALES_TURNO = `
    WITH movimientos AS (
        SELECT
            m.tipo_movimiento,
            m.monto,
            COALESCE(mp.tipo, m.metodo_pago) AS tipo_medio,
            CASE
                WHEN COALESCE(mp.afecta_efectivo_caja, 0) = 1
                  OR mp.tipo = 'efectivo'
                  OR m.metodo_pago = 'efectivo'
                THEN 1 ELSE 0
            END AS es_efectivo,
            CASE
                WHEN m.tipo_movimiento = 'venta' THEN 1
                WHEN m.tipo_movimiento IN ('anulacion', 'devolucion') THEN -1
                ELSE 0
            END AS signo_venta
        FROM movimientos_caja m
        LEFT JOIN medios_pago mp
            ON mp.id_medio_pago = m.id_medio_pago
        WHERE m.id_turno_caja = @id_turno_caja
    )
    SELECT
        COALESCE(SUM(signo_venta * monto), 0) AS total_ventas,
        COALESCE(SUM(CASE WHEN es_efectivo = 1 THEN signo_venta * monto ELSE 0 END), 0) AS total_efectivo,
        COALESCE(SUM(CASE WHEN es_efectivo = 0 AND tipo_medio = 'transferencia' THEN signo_venta * monto ELSE 0 END), 0) AS total_transferencia,
        COALESCE(SUM(CASE WHEN es_efectivo = 0 AND tipo_medio = 'tarjeta' THEN signo_venta * monto ELSE 0 END), 0) AS total_tarjeta,
        COALESCE(SUM(CASE WHEN es_efectivo = 0 AND COALESCE(tipo_medio, '') NOT IN ('transferencia', 'tarjeta') THEN signo_venta * monto ELSE 0 END), 0) AS total_otros,
        COALESCE(SUM(CASE WHEN es_efectivo = 1 AND tipo_movimiento = 'ingreso_manual' THEN monto ELSE 0 END), 0) AS total_ingresos_manuales,
        COALESCE(SUM(CASE WHEN es_efectivo = 1 AND tipo_movimiento = 'egreso_manual' THEN monto ELSE 0 END), 0) AS total_egresos_manuales,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'propina' THEN monto WHEN tipo_movimiento = 'anulacion_propina' THEN -monto ELSE 0 END), 0) AS total_propinas,
        COALESCE(SUM(CASE WHEN es_efectivo = 1 AND tipo_movimiento = 'propina' THEN monto WHEN es_efectivo = 1 AND tipo_movimiento = 'anulacion_propina' THEN -monto ELSE 0 END), 0) AS total_propinas_efectivo
    FROM movimientos
`;

function calcularTotalesTurno(db, idTurnoCaja) {
    const turno = db
        .prepare('SELECT id_turno_caja, monto_inicial FROM turnos_caja WHERE id_turno_caja = ?')
        .get(idTurnoCaja);

    if (!turno) {
        throw new Error(`No existe el turno de caja ${idTurnoCaja}.`);
    }

    const fila = db.prepare(SQL_TOTALES_TURNO).get({ id_turno_caja: idTurnoCaja });

    const totales = {
        total_ventas: Number(fila.total_ventas || 0),
        total_efectivo: Number(fila.total_efectivo || 0),
        total_transferencia: Number(fila.total_transferencia || 0),
        total_tarjeta: Number(fila.total_tarjeta || 0),
        total_otros: Number(fila.total_otros || 0),
        total_ingresos_manuales: Number(fila.total_ingresos_manuales || 0),
        total_egresos_manuales: Number(fila.total_egresos_manuales || 0),
        total_propinas: Number(fila.total_propinas || 0),
        total_propinas_efectivo: Number(fila.total_propinas_efectivo || 0),
    };

    totales.monto_esperado =
        Number(turno.monto_inicial || 0)
        + totales.total_efectivo
        + totales.total_propinas_efectivo
        + totales.total_ingresos_manuales
        - totales.total_egresos_manuales;

    return totales;
}

/**
 * Recalcula y guarda los totales del turno. Debe llamarse dentro de la
 * misma transacción que inserta el movimiento.
 */
function sincronizarTotalesTurno(db, idTurnoCaja) {
    const totales = calcularTotalesTurno(db, idTurnoCaja);

    db.prepare(`
        UPDATE turnos_caja
        SET
            total_ventas = @total_ventas,
            total_efectivo = @total_efectivo,
            total_transferencia = @total_transferencia,
            total_tarjeta = @total_tarjeta,
            total_otros = @total_otros,
            total_ingresos_manuales = @total_ingresos_manuales,
            total_egresos_manuales = @total_egresos_manuales,
            total_propinas = @total_propinas,
            total_propinas_efectivo = @total_propinas_efectivo,
            monto_esperado = @monto_esperado,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_turno_caja = @id_turno_caja
    `).run({
        id_turno_caja: idTurnoCaja,
        ...totales,
    });

    return totales;
}

/**
 * Lanza error si el turno no existe o no está abierto. Se usa al inicio de
 * las transacciones que mueven dinero.
 */
function exigirTurnoAbierto(db, idTurnoCaja) {
    const turno = db
        .prepare('SELECT id_turno_caja, estado FROM turnos_caja WHERE id_turno_caja = ?')
        .get(idTurnoCaja);

    if (!turno || turno.estado !== 'abierto') {
        throw new Error('El turno de caja no está abierto.');
    }

    return turno;
}

module.exports = {
    SQL_TOTALES_TURNO,
    calcularTotalesTurno,
    sincronizarTotalesTurno,
    exigirTurnoAbierto,
};
