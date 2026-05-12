const comprasService = require('./compras.service');

const estilosCompras = ['/css/modules/compras.css'];

const estilosComprasPOS = [
    '/css/modules/ventas.css',
    '/css/modules/compras.css',
];


function mostrarFormularioNuevaCompra(req, res) {
    const datosFormulario = comprasService.obtenerDatosFormularioNuevaCompra();

    return res.render('compras/formulario', {
        titulo: 'Nueva compra',
        modo: 'crear',
        fechaCompra: datosFormulario.fecha_compra,
        numeroCompraSugerido: datosFormulario.numero_compra_sugerido,
        tiposSoporte: datosFormulario.tipos_soporte,
        proveedores: datosFormulario.proveedores,
        error: null,
        estilosModulo: estilosComprasPOS,
    });
}

function buscarProductosParaCompra(req, res) {
    const productos = comprasService.buscarProductosParaCompra({
        busqueda: req.query.busqueda || '',
        limite: 20,
    });

    return res.json({
        ok: true,
        productos,
    });
}

function validarCompra(req, res) {
    const resultado = comprasService.validarYCalcularCompra(req.body || {});

    return res.status(resultado.valido ? 200 : 422).json({
        ok: resultado.valido,
        errores: resultado.errores,
        compra: resultado.compra,
        lineas: resultado.lineas,
    });
}

function guardarCompra(req, res) {
    const resultado = comprasService.guardarCompra(req.body || {}, {
        usuario: req.session?.usuario || null,
        ip: req.ip || 'local',
        userAgent: req.get('user-agent') || '',
    });

    return res.status(resultado.ok ? 201 : resultado.codigoEstado || 400).json(resultado);
}

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
    mostrarFormularioNuevaCompra,
    buscarProductosParaCompra,
    validarCompra,
    guardarCompra,
};