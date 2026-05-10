const proveedoresService = require('./proveedores.service');

const estilosProveedores = ['/css/modules/proveedores.css'];

function listarProveedores(req, res) {
    const resultado = proveedoresService.listarProveedores(req.query || {});

    return res.render('proveedores/index', {
        titulo: 'Proveedores',
        filtros: resultado.filtros,
        proveedores: resultado.proveedores,
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
        estilosModulo: estilosProveedores,
    });
}

function mostrarFormularioCrear(req, res) {
    return res.render('proveedores/formulario', {
        titulo: 'Nuevo proveedor',
        modo: 'crear',
        action: '/proveedores/nuevo',
        proveedorFormulario: proveedoresService.prepararProveedorFormulario(),
        error: null,
        estilosModulo: estilosProveedores,
    });
}

function crearProveedor(req, res) {
    const resultado = proveedoresService.crearProveedor(req.body || {});

    if (!resultado.ok) {
        return res.status(400).render('proveedores/formulario', {
            titulo: 'Nuevo proveedor',
            modo: 'crear',
            action: '/proveedores/nuevo',
            proveedorFormulario: resultado.valores,
            error: resultado.mensaje,
            estilosModulo: estilosProveedores,
        });
    }

    return res.redirect(`/proveedores?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function mostrarFormularioEditar(req, res) {
    const proveedor = proveedoresService.obtenerProveedorParaEdicion(req.params.id);

    if (!proveedor) {
        return res.redirect('/proveedores?error=No se encontró el proveedor.');
    }

    return res.render('proveedores/formulario', {
        titulo: 'Editar proveedor',
        modo: 'editar',
        action: `/proveedores/${proveedor.id_proveedor}/editar`,
        proveedorFormulario: proveedoresService.prepararProveedorFormulario(proveedor),
        error: null,
        estilosModulo: estilosProveedores,
    });
}

function actualizarProveedor(req, res) {
    const resultado = proveedoresService.actualizarProveedor(
        req.params.id,
        req.body || {}
    );

    if (!resultado.ok) {
        const proveedor = proveedoresService.obtenerProveedorParaEdicion(req.params.id);

        return res.status(400).render('proveedores/formulario', {
            titulo: 'Editar proveedor',
            modo: 'editar',
            action: `/proveedores/${req.params.id}/editar`,
            proveedorFormulario:
                resultado.valores ||
                proveedoresService.prepararProveedorFormulario(proveedor || {}),
            error: resultado.mensaje,
            estilosModulo: estilosProveedores,
        });
    }

    return res.redirect(`/proveedores?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function activarProveedor(req, res) {
    const resultado = proveedoresService.cambiarEstadoProveedor(
        req.params.id,
        'activo'
    );

    if (!resultado.ok) {
        return res.redirect(`/proveedores?error=${encodeURIComponent(resultado.mensaje)}`);
    }

    return res.redirect(`/proveedores?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function desactivarProveedor(req, res) {
    const resultado = proveedoresService.cambiarEstadoProveedor(
        req.params.id,
        'inactivo'
    );

    if (!resultado.ok) {
        return res.redirect(`/proveedores?error=${encodeURIComponent(resultado.mensaje)}`);
    }

    return res.redirect(`/proveedores?exito=${encodeURIComponent(resultado.mensaje)}`);
}

module.exports = {
    listarProveedores,
    mostrarFormularioCrear,
    crearProveedor,
    mostrarFormularioEditar,
    actualizarProveedor,
    activarProveedor,
    desactivarProveedor,
};