const notasCreditoRepository = require('./notasCredito.repository');

function crearError(mensaje, codigoEstado = 400) {
    return {
        ok: false,
        mensaje,
        codigoEstado,
    };
}

function obtenerSiguienteNotaCredito() {
    const siguienteNotaCredito = notasCreditoRepository.obtenerNumeracionNotaCredito();

    if (!siguienteNotaCredito) {
        return crearError('No existe numeración activa para notas crédito internas.', 404);
    }

    return {
        ok: true,
        siguienteNotaCredito,
    };
}

function obtenerResumenNotasCredito() {
    const siguienteNotaCredito = notasCreditoRepository.obtenerNumeracionNotaCredito();

    return {
        ok: true,
        siguienteNotaCredito,
        totales: {
            ...notasCreditoRepository.contarNotasCredito(),
            ...notasCreditoRepository.contarDetalleNotasCredito(),
        },
        ultimasNotasCredito: notasCreditoRepository.listarUltimasNotasCredito(10),
    };
}

module.exports = {
    obtenerSiguienteNotaCredito,
    obtenerResumenNotasCredito,
};