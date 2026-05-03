const notasCreditoService = require('./notasCredito.service');

function responderError(res, resultado) {
    return res.status(resultado.codigoEstado || 400).json({
        ok: false,
        mensaje: resultado.mensaje || 'No se pudo completar la solicitud.',
    });
}

function obtenerSiguienteNotaCredito(req, res) {
    const resultado = notasCreditoService.obtenerSiguienteNotaCredito();

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.json(resultado);
}

function obtenerResumenNotasCredito(req, res) {
    const resultado = notasCreditoService.obtenerResumenNotasCredito();

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.json(resultado);
}

module.exports = {
    obtenerSiguienteNotaCredito,
    obtenerResumenNotasCredito,
};