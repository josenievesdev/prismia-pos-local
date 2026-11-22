/**
 * Fechas en hora LOCAL del equipo donde corre Prismia.
 *
 * Regla del sistema: las fechas de negocio (fecha_venta, vencimientos, "hoy")
 * se manejan en hora local. No usar toISOString() para obtener "hoy":
 * devuelve la fecha UTC y en Colombia (UTC-5) cambia de día a las 7 p. m.
 */

function dosDigitos(valor) {
    return String(valor).padStart(2, '0');
}

/** 'YYYY-MM-DD' en hora local. */
function fechaLocalISO(fecha = new Date()) {
    return [
        fecha.getFullYear(),
        dosDigitos(fecha.getMonth() + 1),
        dosDigitos(fecha.getDate()),
    ].join('-');
}

/** 'YYYY-MM-DD HH:MM:SS' en hora local (formato que usa SQLite). */
function fechaHoraLocalSQL(fecha = new Date()) {
    const hora = [
        dosDigitos(fecha.getHours()),
        dosDigitos(fecha.getMinutes()),
        dosDigitos(fecha.getSeconds()),
    ].join(':');

    return `${fechaLocalISO(fecha)} ${hora}`;
}

/** 'YYYY-MM-DD' local desplazado N días (negativo para días anteriores). */
function sumarDiasLocalISO(dias, desde = new Date()) {
    const fecha = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
    fecha.setDate(fecha.getDate() + Number(dias || 0));

    return fechaLocalISO(fecha);
}

module.exports = {
    fechaLocalISO,
    fechaHoraLocalSQL,
    sumarDiasLocalISO,
};
