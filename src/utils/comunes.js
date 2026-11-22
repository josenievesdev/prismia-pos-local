/**
 * Utilidades compartidas por los módulos (antes había 19 copias de
 * limpiarTexto, 7 de normalizarId y 4 de crearError, todas idénticas).
 *
 * Ojo: normalizarNumero/normalizarEntero NO están aquí a propósito. Los
 * módulos tienen variantes con reglas distintas (coma decimal, redondeo vs.
 * truncado, valores por defecto) y unificarlas cambiaría cálculos.
 */

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarId(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

function crearError(mensaje, codigoEstado = 400) {
    return {
        ok: false,
        mensaje,
        codigoEstado,
    };
}

module.exports = {
    limpiarTexto,
    normalizarId,
    crearError,
};
