const remisionesService = require('./remisiones.service');

const estilosRemisiones = ['/css/modules/remisiones.css'];
const estilosRemisionesPOS = [
    '/css/modules/ventas.css',
    '/css/modules/remisiones.css',
];

function obtenerIdUsuarioAutenticado(req) {
    return (
        req.session?.usuario?.id_usuario
        || req.session?.usuario?.id
        || req.session?.user?.id_usuario
        || req.user?.id_usuario
        || null
    );
}

function responderError(res, resultado) {
    return res.status(resultado.codigoEstado || 400).json({
        ok: false,
        mensaje: resultado.mensaje || 'No se pudo completar la solicitud.',
    });
}

function mostrarListadoRemisiones(req, res) {
    const resultado = remisionesService.obtenerListadoRemisiones({
        query: req.query || {},
    });

    return res.render('remisiones/index', {
        titulo: 'Remisiones',
        filtros: resultado.filtros,
        remisiones: resultado.remisiones,
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
        estilosModulo: estilosRemisiones,
    });
}

function mostrarDetalleRemision(req, res) {
    const resultado = remisionesService.obtenerDetalleRemision(req.params.id);

    if (!resultado.ok) {
        return res.redirect(
            '/remisiones?error=' + encodeURIComponent(resultado.mensaje)
        );
    }

    return res.render('remisiones/detalle', {
        titulo: resultado.remision.numero_remision || 'Detalle de remisión',
        remision: resultado.remision,
        detalle: resultado.detalle,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosRemisiones,
    });
}

function mostrarImprimirRemision(req, res) {
    const resultado = remisionesService.obtenerTicketRemision(req.params.id);

    if (!resultado.ok) {
        return res.status(resultado.codigoEstado || 404).send(resultado.mensaje);
    }

    return res.render('remisiones/imprimir', {
        layout: false,
        titulo: `Ticket ${resultado.ticket.remision.numero_remision}`,
        ticket: resultado.ticket,
    });
}

function mostrarNuevaRemision(req, res) {
    const siguienteRemision = remisionesService.obtenerSiguienteRemision();

    if (!siguienteRemision) {
        return res.redirect(
            '/remisiones?error=' + encodeURIComponent('No existe numeración activa para remisiones.')
        );
    }

    return res.render('remisiones/form', {
        titulo: 'Nueva remisión',
        siguienteRemision,
        mensajeExito: null,
        error: req.query.error || null,
        estilosModulo: estilosRemisionesPOS,
    });
}

function obtenerSiguienteRemision(req, res) {
    const siguienteRemision = remisionesService.obtenerSiguienteRemision();

    if (!siguienteRemision) {
        return res.status(404).json({
            ok: false,
            mensaje: 'No existe numeración activa para remisiones.',
        });
    }

    return res.json({
        ok: true,
        siguienteRemision,
    });
}

function buscarClientes(req, res) {
    const clientes = remisionesService.buscarClientes({
        busqueda: req.query.busqueda || '',
        limite: req.query.limite || 10,
    });

    return res.json({
        ok: true,
        clientes,
    });
}

function buscarProductos(req, res) {
    const productos = remisionesService.buscarProductos({
        busqueda: req.query.busqueda || '',
        limite: req.query.limite || 30,
    });

    return res.json({
        ok: true,
        productos,
    });
}

function obtenerProducto(req, res) {
    const resultado = remisionesService.obtenerProducto(req.params.id);

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.json({
        ok: true,
        producto: resultado.producto,
    });
}

function crearRemision(req, res) {
    const resultado = remisionesService.crearRemision({
        idUsuario: obtenerIdUsuarioAutenticado(req),
        payload: req.body || {},
    });

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.status(201).json(resultado);
}

function listarRemisiones(req, res) {
    const resultado = remisionesService.obtenerListadoRemisiones({
        query: req.query || {},
    });

    return res.json({
        ok: true,
        ...resultado,
    });
}

function obtenerDetalleRemision(req, res) {
    const resultado = remisionesService.obtenerDetalleRemision(req.params.id);

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.json(resultado);
}

function prepararConversionRemision(req, res) {
    const resultado = remisionesService.prepararConversionRemision(req.params.id);

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.json(resultado);
}

function convertirRemisionAVenta(req, res) {
    const resultado = remisionesService.convertirRemisionAVenta({
        idRemision: req.params.id,
        idUsuario: obtenerIdUsuarioAutenticado(req),
        payload: req.body || {},
    });

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.status(201).json(resultado);
}

module.exports = {
    mostrarListadoRemisiones,
    mostrarNuevaRemision,
    mostrarDetalleRemision,
    mostrarImprimirRemision,
    obtenerSiguienteRemision,
    buscarClientes,
    buscarProductos,
    obtenerProducto,
    crearRemision,
    listarRemisiones,
    obtenerDetalleRemision,
    prepararConversionRemision,
    convertirRemisionAVenta,
};