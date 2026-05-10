const notasCreditoService = require('./notasCredito.service');
const configuracionService = require('../configuracion/configuracion.service');

const estilosNotasCredito = ['/css/modules/notas-credito.css'];

function responderError(res, resultado) {
    return res.status(resultado.codigoEstado || 400).json({
        ok: false,
        mensaje: resultado.mensaje || 'No se pudo completar la solicitud.',
    });
}

function mostrarListadoNotasCredito(req, res) {
    const resultado = notasCreditoService.obtenerListadoNotasCredito({
        query: req.query || {},
    });

    return res.render('notasCredito/index', {
        titulo: 'Notas crédito internas',
        filtros: resultado.filtros,
        notasCredito: resultado.notasCredito,
        totalResultados: resultado.total_resultados,
        limiteResultados: resultado.limite_resultados,
        paginaActual: resultado.pagina_actual,
        totalPaginas: resultado.total_paginas,
        tienePaginaAnterior: resultado.tiene_pagina_anterior,
        tienePaginaSiguiente: resultado.tiene_pagina_siguiente,
        paginaAnterior: resultado.pagina_anterior,
        paginaSiguiente: resultado.pagina_siguiente,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosNotasCredito,
    });
}

function mostrarDetalleNotaCredito(req, res) {
    const resultado = notasCreditoService.obtenerDetalleNotaCredito(req.params.id);

    if (!resultado.ok) {
        return res.redirect(
            '/notas-credito?error=' + encodeURIComponent(resultado.mensaje)
        );
    }

    return res.render('notasCredito/detalle', {
        titulo: resultado.notaCredito.numero_nota_credito || 'Detalle nota crédito',
        notaCredito: resultado.notaCredito,
        detalle: resultado.detalle,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosNotasCredito,
    });
}

function mostrarImprimirNotaCredito(req, res) {
    const resultado = notasCreditoService.obtenerDetalleNotaCredito(req.params.id);

    if (!resultado.ok) {
        return res.status(resultado.codigoEstado || 404).send(resultado.mensaje);
    }

    return res.render('notasCredito/imprimir', {
        layout: false,
        titulo: `Nota crédito ${resultado.notaCredito.numero_nota_credito}`,
        configuracionNegocio: configuracionService.obtenerConfiguracionNegocio(),
        notaCredito: resultado.notaCredito,
        detalle: resultado.detalle,
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

function listarNotasCredito(req, res) {
    const resultado = notasCreditoService.obtenerListadoNotasCredito({
        query: req.query || {},
    });

    return res.json(resultado);
}

function obtenerDetalleNotaCredito(req, res) {
    const resultado = notasCreditoService.obtenerDetalleNotaCredito(req.params.id);

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.json(resultado);
}

module.exports = {
    mostrarListadoNotasCredito,
    mostrarDetalleNotaCredito,
    mostrarImprimirNotaCredito,
    obtenerSiguienteNotaCredito,
    obtenerResumenNotasCredito,
    listarNotasCredito,
    obtenerDetalleNotaCredito,
};