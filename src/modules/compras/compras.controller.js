const comprasService = require('./compras.service');

const estilosCompras = ['/css/modules/compras.css'];

const estilosComprasPOS = [
    '/css/modules/ventas.css',
    '/css/modules/compras.css',
];


function mostrarImprimirCompra(req, res) {
    const documento = comprasService.obtenerDocumentoCompraImprimible(req.params.id);

    if (!documento) {
        return res.status(404).render('errors/404', {
            titulo: 'Compra no encontrada',
            mensaje: 'No se encontró la compra solicitada.',
        });
    }

    return res.render('compras/imprimir', {
        titulo: `Imprimir ${documento.compra.numero_compra}`,
        documento,
        layout: false,
    });
}

function mostrarDetalleCompra(req, res) {
    const resultado = comprasService.obtenerDetalleCompra(req.params.id);

    if (!resultado) {
        return res.status(404).render('errors/404', {
            titulo: 'Compra no encontrada',
            mensaje: 'No se encontró la compra solicitada.',
        });
    }

    return res.render('compras/detalle', {
        titulo: `Compra ${resultado.compra.numero_compra}`,
        compra: resultado.compra,
        detalle: resultado.detalle,
        pagosProveedor: resultado.pagosProveedor || [],
        estilosModulo: estilosComprasPOS,
    });
}

function mostrarFormularioNuevaCompra(req, res) {
    const datosFormulario = comprasService.obtenerDatosFormularioNuevaCompra();

    return res.render('compras/formulario', {
        titulo: 'Nueva compra',
        modo: 'crear',
        fechaCompra: datosFormulario.fecha_compra,
        numeroCompraSugerido: datosFormulario.numero_compra_sugerido,
        tiposSoporte: datosFormulario.tipos_soporte,
        condicionesPago: datosFormulario.condiciones_pago,
        proveedores: datosFormulario.proveedores,
        error: null,
        estilosModulo: estilosComprasPOS,
    });
}

function mostrarFormularioPagoProveedor(req, res) {
    const formulario = comprasService.obtenerFormularioPagoProveedor(req.params.id);

    if (!formulario) {
        return res.status(404).render('errors/404', {
            titulo: 'Compra no encontrada',
            mensaje: 'No se encontró la compra solicitada para registrar el pago.',
        });
    }

    return res.render('compras/pago-proveedor', {
        titulo: `Registrar pago ${formulario.compra.numero_compra}`,
        compra: formulario.compra,
        mediosPago: formulario.medios_pago,
        valores: formulario.valores,
        errores: formulario.errores,
        estilosModulo: estilosCompras,
    });
}

function registrarPagoProveedor(req, res) {
    const resultado = comprasService.registrarPagoProveedor(req.params.id, req.body || {}, {
        usuario: req.session?.usuario || null,
        ip: req.ip || 'local',
        userAgent: req.get('user-agent') || '',
    });

    if (!resultado.ok) {
        const formulario = resultado.formulario;

        if (!formulario) {
            return res.redirect('/compras/cuentas-por-pagar?error=pago_no_registrado');
        }

        return res.status(resultado.codigoEstado || 400).render('compras/pago-proveedor', {
            titulo: `Registrar pago ${formulario.compra.numero_compra}`,
            compra: formulario.compra,
            mediosPago: formulario.medios_pago,
            valores: formulario.valores,
            errores: formulario.errores,
            estilosModulo: estilosCompras,
        });
    }

    return res.redirect('/compras/cuentas-por-pagar?exito=pago_registrado');
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
        resumenCuentasPorPagar: resultado.resumen_cuentas_por_pagar,
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
            ...(resultado.filtros.condicion_pago ? { condicion_pago: resultado.filtros.condicion_pago } : {}),
            ...(resultado.filtros.estado_pago ? { estado_pago: resultado.filtros.estado_pago } : {}),
        }).toString(),
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosCompras,
    });
}

function mostrarCuentasPorPagar(req, res) {
    const resultado = comprasService.listarCuentasPorPagar();

    return res.render('compras/cuentas-por-pagar', {
        titulo: 'Cuentas por pagar',
        cuentas: resultado.cuentas,
        resumenCuentasPorPagar: resultado.resumen,
        fechaActual: resultado.fecha_actual,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosCompras,
    });
}

module.exports = {
    listarCompras,
    mostrarCuentasPorPagar,
    mostrarDetalleCompra,
    mostrarFormularioPagoProveedor,
    registrarPagoProveedor,
    mostrarImprimirCompra,
    mostrarFormularioNuevaCompra,
    buscarProductosParaCompra,
    validarCompra,
    guardarCompra,
};