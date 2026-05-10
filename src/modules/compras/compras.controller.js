const comprasService = require('./compras.service');

const estilosCompras = ['/css/modules/compras.css'];

function listarCompras(req, res) {
    const resultado = comprasService.listarCompras(req.query || {});

    return res.render('compras/index', {
        titulo: 'Compras',
        filtros: resultado.filtros,
        compras: resultado.compras,
        totalResultados: resultado.total_resultados,
        limiteResultados: resultado.limite_resultados,
        paginaActual: resultado.pagina_actual,
        totalPaginas: resultado.total_paginas,
        tienePaginaAnterior: resultado.tiene_pagina_anterior,
        tienePaginaSiguiente: resultado.tiene_pagina_siguiente,
        paginaAnterior: resultado.pagina_anterior,
        paginaSiguiente: resultado.pagina_siguiente,
        queryPaginacion: new URLSearchParams({
            ...(resultado.filtros.busqueda ? { busqueda: resultado.filtros.busqueda } : {}),
            ...(resultado.filtros.estado ? { estado: resultado.filtros.estado } : {}),
        }).toString(),
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosCompras,
    });
}

module.exports = {
    listarCompras,
};