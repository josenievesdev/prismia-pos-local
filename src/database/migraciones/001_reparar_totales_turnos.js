/**
 * Migración 001 · Reparar totales guardados de los turnos de caja.
 *
 * Bug corregido: ventas.service tenía calcularTotalesTurno declarada dos
 * veces y cada venta del POS sumaba $0 al efectivo/tarjeta/transferencia/
 * monto_esperado de turnos_caja. Los cierres cuadraban porque el arqueo
 * recalcula desde movimientos_caja, pero lo guardado quedó mal (y negativo
 * tras anulaciones).
 *
 * Esta migración recalcula los totales de TODOS los turnos desde sus
 * movimientos. No toca monto_contado ni diferencia (son hechos del cierre).
 * La consulta está copiada aquí a propósito: una migración no debe cambiar
 * si mañana cambia el código de la aplicación.
 */

const { registrarAuditoriaMigracion } = require('./utilidades');

const SQL_TOTALES = `
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
        WHERE m.id_turno_caja = ?
    )
    SELECT
        COALESCE(SUM(signo_venta * monto), 0) AS total_ventas,
        COALESCE(SUM(CASE WHEN es_efectivo = 1 THEN signo_venta * monto ELSE 0 END), 0) AS total_efectivo,
        COALESCE(SUM(CASE WHEN es_efectivo = 0 AND tipo_medio = 'transferencia' THEN signo_venta * monto ELSE 0 END), 0) AS total_transferencia,
        COALESCE(SUM(CASE WHEN es_efectivo = 0 AND tipo_medio = 'tarjeta' THEN signo_venta * monto ELSE 0 END), 0) AS total_tarjeta,
        COALESCE(SUM(CASE WHEN es_efectivo = 0 AND COALESCE(tipo_medio, '') NOT IN ('transferencia', 'tarjeta') THEN signo_venta * monto ELSE 0 END), 0) AS total_otros,
        COALESCE(SUM(CASE WHEN es_efectivo = 1 AND tipo_movimiento = 'ingreso_manual' THEN monto ELSE 0 END), 0) AS total_ingresos_manuales,
        COALESCE(SUM(CASE WHEN es_efectivo = 1 AND tipo_movimiento = 'egreso_manual' THEN monto ELSE 0 END), 0) AS total_egresos_manuales
    FROM movimientos
`;

const CAMPOS = [
    'total_ventas',
    'total_efectivo',
    'total_transferencia',
    'total_tarjeta',
    'total_otros',
    'total_ingresos_manuales',
    'total_egresos_manuales',
    'monto_esperado',
];

function up(db) {
    const turnos = db.prepare('SELECT * FROM turnos_caja ORDER BY id_turno_caja').all();
    const calcular = db.prepare(SQL_TOTALES);
    const actualizar = db.prepare(`
        UPDATE turnos_caja
        SET
            total_ventas = @total_ventas,
            total_efectivo = @total_efectivo,
            total_transferencia = @total_transferencia,
            total_tarjeta = @total_tarjeta,
            total_otros = @total_otros,
            total_ingresos_manuales = @total_ingresos_manuales,
            total_egresos_manuales = @total_egresos_manuales,
            monto_esperado = @monto_esperado
        WHERE id_turno_caja = @id_turno_caja
    `);

    const antes = [];
    const despues = [];
    const advertencias = [];

    for (const turno of turnos) {
        const fila = calcular.get(turno.id_turno_caja);
        const totales = {};

        CAMPOS.slice(0, 7).forEach((campo) => {
            totales[campo] = Number(fila[campo] || 0);
        });

        totales.monto_esperado =
            Number(turno.monto_inicial || 0)
            + totales.total_efectivo
            + totales.total_ingresos_manuales
            - totales.total_egresos_manuales;

        const cambio = CAMPOS.some((campo) => Number(turno[campo] || 0) !== totales[campo]);

        if (!cambio) {
            continue;
        }

        antes.push({
            id_turno_caja: turno.id_turno_caja,
            ...Object.fromEntries(CAMPOS.map((campo) => [campo, turno[campo]])),
        });
        despues.push({ id_turno_caja: turno.id_turno_caja, ...totales });

        actualizar.run({ id_turno_caja: turno.id_turno_caja, ...totales });

        if (turno.estado === 'cerrado' && turno.monto_contado !== null && turno.diferencia !== null) {
            const diferenciaRecalculada = Number(turno.monto_contado) - totales.monto_esperado;

            if (diferenciaRecalculada !== Number(turno.diferencia)) {
                advertencias.push({
                    id_turno_caja: turno.id_turno_caja,
                    diferencia_guardada: turno.diferencia,
                    diferencia_recalculada: diferenciaRecalculada,
                });
            }
        }
    }

    if (antes.length > 0) {
        registrarAuditoriaMigracion(db, {
            accion: 'migracion_001_reparar_totales_turnos',
            tabla: 'turnos_caja',
            datosAnteriores: antes,
            datosNuevos: { turnos: despues, advertencias },
        });
    }
}

module.exports = {
    version: 1,
    nombre: 'Reparar totales guardados de los turnos de caja',
    up,
};
