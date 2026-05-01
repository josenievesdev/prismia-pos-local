const clientesService = require('./clientes.service');

const estilosClientes = ['/css/modules/clientes.css'];

function listarClientes(req, res) {
    const resultado = clientesService.obtenerListadoClientes({
        query: req.query || {},
    });

    return res.render('clientes/index', {
        titulo: 'Clientes',
        clientes: resultado.clientes,
        filtros: resultado.filtros,
        catalogos: resultado.catalogos,
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
        estilosModulo: estilosClientes,
    });
}

function mostrarCrearCliente(req, res) {
    return res.render('clientes/form', {
        titulo: 'Nuevo cliente',
        modo: 'crear',
        cliente: {},
        catalogos: clientesService.obtenerCatalogosFormulario(),
        error: null,
        estilosModulo: estilosClientes,
    });
}

function crearCliente(req, res) {
    const resultado = clientesService.crearCliente(req.body || {});

    if (!resultado.ok) {
        return res.status(400).render('clientes/form', {
            titulo: 'Nuevo cliente',
            modo: 'crear',
            cliente: resultado.datos || {},
            catalogos: resultado.catalogos,
            error: resultado.mensaje,
            estilosModulo: estilosClientes,
        });
    }

    return res.redirect('/clientes?exito=' + encodeURIComponent(resultado.mensaje));
}

function mostrarEditarCliente(req, res) {
    const resultado = clientesService.obtenerClienteParaFormulario(req.params.id);

    if (!resultado.ok) {
        return res.redirect('/clientes?error=' + encodeURIComponent(resultado.mensaje));
    }

    return res.render('clientes/form', {
        titulo: 'Editar cliente',
        modo: 'editar',
        cliente: resultado.cliente,
        catalogos: resultado.catalogos,
        error: null,
        estilosModulo: estilosClientes,
    });
}

function actualizarCliente(req, res) {
    const resultado = clientesService.actualizarCliente(req.params.id, req.body || {});

    if (!resultado.ok) {
        return res.status(400).render('clientes/form', {
            titulo: 'Editar cliente',
            modo: 'editar',
            cliente: resultado.cliente || {},
            catalogos: resultado.catalogos,
            error: resultado.mensaje,
            estilosModulo: estilosClientes,
        });
    }

    return res.redirect('/clientes?exito=' + encodeURIComponent(resultado.mensaje));
}

function cambiarEstadoCliente(req, res) {
    const resultado = clientesService.cambiarEstadoCliente(req.params.id);

    if (!resultado.ok) {
        return res.redirect('/clientes?error=' + encodeURIComponent(resultado.mensaje));
    }

    return res.redirect('/clientes?exito=' + encodeURIComponent(resultado.mensaje));
}

module.exports = {
    listarClientes,
    mostrarCrearCliente,
    crearCliente,
    mostrarEditarCliente,
    actualizarCliente,
    cambiarEstadoCliente,
};