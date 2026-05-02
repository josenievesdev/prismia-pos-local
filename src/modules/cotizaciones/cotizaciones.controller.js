const cotizacionesService = require('./cotizaciones.service');

const estilosCotizaciones = ['/css/modules/cotizaciones.css'];
const estilosCotizacionesPOS = [
    '/css/modules/ventas.css',
    '/css/modules/cotizaciones.css',
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

function mostrarListadoCotizaciones(req, res) {
    const resultado = cotizacionesService.obtenerListadoCotizaciones({
        query: req.query || {},
    });

    return res.render('cotizaciones/index', {
        titulo: 'Cotizaciones',
        filtros: resultado.filtros,
        cotizaciones: resultado.cotizaciones,
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
        estilosModulo: estilosCotizaciones,
    });
}

function mostrarDetalleCotizacion(req, res) {
    const resultado = cotizacionesService.obtenerDetalleCotizacion(req.params.id);

    if (!resultado.ok) {
        return res.redirect(
            '/cotizaciones?error=' + encodeURIComponent(resultado.mensaje)
        );
    }

    return res.render('cotizaciones/detalle', {
        titulo: resultado.cotizacion.numero_cotizacion || 'Detalle de cotización',
        cotizacion: resultado.cotizacion,
        detalle: resultado.detalle,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosCotizaciones,
    });
}

function mostrarImprimirCotizacion(req, res) {
    const resultado = cotizacionesService.obtenerTicketCotizacion(req.params.id);

    if (!resultado.ok) {
        return res.status(resultado.codigoEstado || 404).send(resultado.mensaje);
    }

    return res.render('cotizaciones/imprimir', {
        layout: false,
        titulo: `Ticket ${resultado.ticket.cotizacion.numero_cotizacion}`,
        ticket: resultado.ticket,
    });
}
function mostrarNuevaCotizacion(req, res) {
    const siguienteCotizacion = cotizacionesService.obtenerSiguienteCotizacion();

    if (!siguienteCotizacion) {
        return res.redirect(
            '/cotizaciones?error=' + encodeURIComponent('No existe numeración activa para cotizaciones.')
        );
    }

    return res.render('cotizaciones/form', {
        titulo: 'Nueva cotización',
        siguienteCotizacion,
        mensajeExito: null,
        error: req.query.error || null,
        estilosModulo: estilosCotizacionesPOS,
    });
}

function obtenerSiguienteCotizacion(req, res) {
    const siguienteCotizacion = cotizacionesService.obtenerSiguienteCotizacion();

    if (!siguienteCotizacion) {
        return res.status(404).json({
            ok: false,
            mensaje: 'No existe numeración activa para cotizaciones.',
        });
    }

    return res.json({
        ok: true,
        siguienteCotizacion,
    });
}

function buscarClientes(req, res) {
    const clientes = cotizacionesService.buscarClientes({
        busqueda: req.query.busqueda || '',
        limite: req.query.limite || 10,
    });

    return res.json({
        ok: true,
        clientes,
    });
}

function buscarProductos(req, res) {
    const productos = cotizacionesService.buscarProductos({
        busqueda: req.query.busqueda || '',
        limite: req.query.limite || 30,
    });

    return res.json({
        ok: true,
        productos,
    });
}

function obtenerProducto(req, res) {
    const resultado = cotizacionesService.obtenerProducto(req.params.id);

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.json({
        ok: true,
        producto: resultado.producto,
    });
}

function crearCotizacion(req, res) {
    const resultado = cotizacionesService.crearCotizacion({
        idUsuario: obtenerIdUsuarioAutenticado(req),
        payload: req.body || {},
    });

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.status(201).json(resultado);
}

function listarCotizaciones(req, res) {
    const resultado = cotizacionesService.obtenerListadoCotizaciones({
        query: req.query || {},
    });

    return res.json({
        ok: true,
        ...resultado,
    });
}

function obtenerDetalleCotizacion(req, res) {
    const resultado = cotizacionesService.obtenerDetalleCotizacion(req.params.id);

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.json(resultado);
}

function prepararConversionCotizacion(req, res) {
    const resultado = cotizacionesService.prepararConversionCotizacion(req.params.id);

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.json(resultado);
}

function convertirCotizacionAVenta(req, res) {
    const resultado = cotizacionesService.convertirCotizacionAVenta({
        idCotizacion: req.params.id,
        idUsuario: obtenerIdUsuarioAutenticado(req),
        payload: req.body || {},
    });

    if (!resultado.ok) {
        return responderError(res, resultado);
    }

    return res.status(201).json(resultado);
}

module.exports = {
    mostrarListadoCotizaciones,
    mostrarNuevaCotizacion,
    mostrarDetalleCotizacion,
    mostrarImprimirCotizacion,
    obtenerSiguienteCotizacion,
    buscarClientes,
    buscarProductos,
    obtenerProducto,
    crearCotizacion,
    listarCotizaciones,
    obtenerDetalleCotizacion,
    prepararConversionCotizacion,
    convertirCotizacionAVenta,
};