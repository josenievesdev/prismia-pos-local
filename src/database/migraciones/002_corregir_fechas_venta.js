/**
 * Migración 002 · Corregir fechas de venta desfasadas por zona horaria.
 *
 * Bugs corregidos:
 *  (a) El POS tomaba "hoy" en UTC y el servidor le pegaba la hora local:
 *      las ventas después de las 7 p. m. (Colombia) quedaban con fecha del
 *      día siguiente. Firma: fecha_venta = hora local real + 24 h.
 *  (b) Las conversiones de cotización/remisión guardaban la fecha en UTC.
 *      Firma: fecha_venta = creado_en (que SQLite guarda en UTC).
 *
 * La hora real de cada venta es creado_en (UTC, asignado por SQLite al
 * insertar) convertido a hora local. Solo se corrigen las filas con una de
 * las dos firmas exactas (tolerancia 2 minutos); el resto no se toca.
 * Debe ejecutarse en el equipo donde se registraron las ventas (usa la zona
 * horaria del sistema operativo).
 */

const { registrarAuditoriaMigracion } = require('./utilidades');

const TOLERANCIA_DIAS = 2 / 1440; // 2 minutos

function up(db) {
    const filas = db.prepare(`
        SELECT
            id_venta,
            numero_venta,
            fecha_venta,
            datetime(creado_en, 'localtime') AS fecha_real,
            julianday(fecha_venta) - julianday(datetime(creado_en, 'localtime')) AS dif_contra_real,
            julianday(fecha_venta) - julianday(creado_en) AS dif_contra_utc,
            julianday(datetime(creado_en, 'localtime')) - julianday(creado_en) AS desfase_local
        FROM ventas
        WHERE fecha_venta IS NOT NULL
          AND creado_en IS NOT NULL
    `).all();

    const corregir = db.prepare(`UPDATE ventas SET fecha_venta = ? WHERE id_venta = ?`);
    const cambios = [];

    for (const fila of filas) {
        if (fila.dif_contra_real === null || fila.dif_contra_utc === null) {
            continue;
        }

        const firmaUtcMasHoraLocal = Math.abs(fila.dif_contra_real - 1) < TOLERANCIA_DIAS;
        const firmaGuardadaEnUtc =
            Math.abs(fila.desfase_local) > TOLERANCIA_DIAS
            && Math.abs(fila.dif_contra_utc) < TOLERANCIA_DIAS;

        if (!firmaUtcMasHoraLocal && !firmaGuardadaEnUtc) {
            continue;
        }

        corregir.run(fila.fecha_real, fila.id_venta);
        cambios.push({
            id_venta: fila.id_venta,
            numero_venta: fila.numero_venta,
            antes: fila.fecha_venta,
            despues: fila.fecha_real,
            causa: firmaUtcMasHoraLocal ? 'utc_mas_hora_local' : 'guardada_en_utc',
        });
    }

    if (cambios.length > 0) {
        registrarAuditoriaMigracion(db, {
            accion: 'migracion_002_corregir_fechas_venta',
            tabla: 'ventas',
            datosAnteriores: cambios.map(({ id_venta, antes }) => ({ id_venta, fecha_venta: antes })),
            datosNuevos: cambios,
        });
    }
}

module.exports = {
    version: 2,
    nombre: 'Corregir fechas de venta desfasadas por zona horaria',
    up,
};
