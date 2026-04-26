const inventarioService = require('./inventario.service');

const estilosInventario = ['/css/modules/inventario.css'];

function construirUrl(base, filtros, pagina) {
    const parametros = new URLSearchParams();

    if (filtros.busqueda) {
        parametros.set('busqueda', filtros.busqueda);
    }

    if (filtros.idCategoriaProducto) {
        parametros.set('categoria', filtros.idCategoriaProducto);
    }

    if (filtros.estadoStock) {
        parametros.set('estado_stock', filtros.estadoStock);
    }

    if (filtros.tipoMovimiento) {
        parametros.set('tipo', filtros.tipoMovimiento);
    }

    if (filtros.idProducto) {
        parametros.set('producto', filtros.idProducto);
    }

    parametros.set('limite', String(filtros.limite || 10));
    parametros.set('pagina', String(pagina));

    return `${base}?${parametros.toString()}`;
}

function mostrarInventario(req, res) {
    const resultado = inventarioService.listarResumenInventario({
        busqueda: req.query.busqueda,
        idCategoriaProducto: req.query.categoria,
        estadoStock: req.query.estado_stock,
        pagina: req.query.pagina,
        limite: req.query.limite,
    });

    const categorias = inventarioService.listarCategoriasDisponibles();

    return res.render('inventario/index', {
        titulo: 'Inventario',
        productos: resultado.productos,
        categorias,
        filtros: resultado.filtros,
        paginacion: resultado.paginacion,
        crearUrlPagina: (pagina) =>
            construirUrl('/inventario', resultado.filtros, pagina),
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosInventario,
    });
}

function mostrarFormularioAjuste(req, res) {
    const producto = inventarioService.obtenerProductoInventarioPorId(
        req.params.id
    );

    if (!producto) {
        return res.redirect(
            `/inventario?error=${encodeURIComponent('El producto no existe.')}`
        );
    }

    return res.render('inventario/ajuste', {
        titulo: 'Ajuste de inventario',
        producto,
        valores: {
            tipo_ajuste: 'entrada',
            cantidad: '',
            motivo: '',
        },
        error: null,
        estilosModulo: estilosInventario,
    });
}

function procesarAjuste(req, res) {
    const producto = inventarioService.obtenerProductoInventarioPorId(
        req.params.id
    );

    if (!producto) {
        return res.redirect(
            `/inventario?error=${encodeURIComponent('El producto no existe.')}`
        );
    }

    const resultado = inventarioService.registrarAjusteManual({
        idProducto: req.params.id,
        datosFormulario: req.body,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        return res.status(400).render('inventario/ajuste', {
            titulo: 'Ajuste de inventario',
            producto,
            valores: {
                tipo_ajuste: req.body.tipo_ajuste || 'entrada',
                cantidad: req.body.cantidad || '',
                motivo: req.body.motivo || '',
            },
            error: resultado.mensaje,
            estilosModulo: estilosInventario,
        });
    }

    return res.redirect(
        `/inventario?exito=${encodeURIComponent(resultado.mensaje)}`
    );
}

function mostrarHistorial(req, res) {
    const resultado = inventarioService.listarHistorialMovimientos({
        busqueda: req.query.busqueda,
        tipoMovimiento: req.query.tipo,
        idProducto: req.query.producto,
        pagina: req.query.pagina,
        limite: req.query.limite,
    });

    return res.render('inventario/historial', {
        titulo: 'Historial de inventario',
        movimientos: resultado.movimientos,
        filtros: resultado.filtros,
        paginacion: resultado.paginacion,
        crearUrlPagina: (pagina) =>
            construirUrl('/inventario/historial', resultado.filtros, pagina),
        estilosModulo: estilosInventario,
    });
}

function listarConteos(req, res) {
    const conteos = inventarioService.listarConteosInventario().map((conteo) => ({
        ...conteo,
        estado_texto: inventarioService.traducirEstadoConteo(conteo.estado),
    }));

    return res.render('inventario/conteos/index', {
        titulo: 'Conteos físicos',
        conteos,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosInventario,
    });
}

function mostrarFormularioNuevoConteo(req, res) {
    const categorias = inventarioService.listarCategoriasDisponibles();

    return res.render('inventario/conteos/nuevo', {
        titulo: 'Nuevo conteo físico',
        categorias,
        valores: {
            tipo_conteo: 'total',
            id_categoria_producto: '',
            observaciones: '',
        },
        error: null,
        estilosModulo: estilosInventario,
    });
}

function crearConteo(req, res) {
    const categorias = inventarioService.listarCategoriasDisponibles();

    const resultado = inventarioService.crearConteoInventario({
        datosFormulario: req.body,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        return res.status(400).render('inventario/conteos/nuevo', {
            titulo: 'Nuevo conteo físico',
            categorias,
            valores: {
                tipo_conteo: req.body.tipo_conteo || 'total',
                id_categoria_producto: req.body.id_categoria_producto || '',
                observaciones: req.body.observaciones || '',
            },
            error: resultado.mensaje,
            estilosModulo: estilosInventario,
        });
    }

    return res.redirect(
        `/inventario/conteos/${resultado.idConteo}?exito=${encodeURIComponent(
            resultado.mensaje
        )}`
    );
}

function verConteo(req, res) {
    const resultado = inventarioService.obtenerConteoConDetalle(req.params.id);

    if (!resultado) {
        return res.redirect(
            `/inventario/conteos?error=${encodeURIComponent(
                'El conteo físico no existe.'
            )}`
        );
    }

    return res.render('inventario/conteos/detalle', {
        titulo: `Conteo ${resultado.conteo.numero_conteo}`,
        conteo: {
            ...resultado.conteo,
            estado_texto: inventarioService.traducirEstadoConteo(resultado.conteo.estado),
        },
        detalles: resultado.detalles,
        resumen: resultado.resumen,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosInventario,
    });
}

function guardarCantidadesConteo(req, res) {
    const resultado = inventarioService.guardarCantidadesConteo({
        idConteo: req.params.id,
        datosFormulario: req.body,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        const conteoConDetalle = inventarioService.obtenerConteoConDetalle(req.params.id);

        if (!conteoConDetalle) {
            return res.redirect(
                `/inventario/conteos?error=${encodeURIComponent('El conteo físico no existe.')}`
            );
        }

        return res.status(400).render('inventario/conteos/detalle', {
            titulo: `Conteo ${conteoConDetalle.conteo.numero_conteo}`,
            conteo: {
                ...conteoConDetalle.conteo,
                estado_texto: inventarioService.traducirEstadoConteo(
                    conteoConDetalle.conteo.estado
                ),
            },
            detalles: conteoConDetalle.detalles,
            resumen: conteoConDetalle.resumen,
            mensajeExito: null,
            error: resultado.mensaje,
            estilosModulo: estilosInventario,
        });
    }

    return res.redirect(
        `/inventario/conteos/${req.params.id}?exito=${encodeURIComponent(
            resultado.mensaje
        )}`
    );
}

function aplicarConteo(req, res) {
    const resultado = inventarioService.aplicarConteoInventario({
        idConteo: req.params.id,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        return res.redirect(
            `/inventario/conteos/${req.params.id}?error=${encodeURIComponent(
                resultado.mensaje
            )}`
        );
    }

    return res.redirect(
        `/inventario/conteos/${req.params.id}?exito=${encodeURIComponent(
            resultado.mensaje
        )}`
    );
}

function verDiferenciasConteo(req, res) {
    const reporte = inventarioService.obtenerReporteDiferenciasConteo(req.params.id);

    if (!reporte) {
        return res.redirect(
            `/inventario/conteos?error=${encodeURIComponent(
                'El conteo físico no existe.'
            )}`
        );
    }

    return res.render('inventario/conteos/diferencias', {
        titulo: `Diferencias ${reporte.conteo.numero_conteo}`,
        conteo: reporte.conteo,
        resumen: reporte.resumen,
        detalles: reporte.detalles,
        diferencias: reporte.diferencias,
        estilosModulo: estilosInventario,
    });
}

function enviarArchivoExcel(res, archivo) {
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${archivo.nombreArchivo}"`
    );

    return res.send(archivo.buffer);
}

function exportarDiferenciasConteo(req, res) {
    const archivo = inventarioService.generarExcelDiferenciasConteo(req.params.id);

    if (!archivo) {
        return res.redirect(
            `/inventario/conteos?error=${encodeURIComponent(
                'No fue posible generar el Excel del conteo.'
            )}`
        );
    }

    return enviarArchivoExcel(res, archivo);
}

function exportarPlantillaConteo(req, res) {
    const archivo = inventarioService.generarExcelPlantillaConteo(req.params.id);

    if (!archivo) {
        return res.redirect(
            `/inventario/conteos?error=${encodeURIComponent(
                'No fue posible generar la plantilla del conteo.'
            )}`
        );
    }

    return enviarArchivoExcel(res, archivo);
}

function importarPlantillaConteo(req, res) {
    const resultado = inventarioService.importarPlantillaConteo({
        idConteo: req.params.id,
        archivo: req.file,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        return res.redirect(
            `/inventario/conteos/${req.params.id}?error=${encodeURIComponent(
                resultado.mensaje
            )}`
        );
    }

    return res.redirect(
        `/inventario/conteos/${req.params.id}?exito=${encodeURIComponent(
            resultado.mensaje
        )}`
    );
}

function mostrarReportesInventario(req, res) {
    const reporte = inventarioService.obtenerReporteOperativoInventario();

    return res.render('inventario/reportes', {
        titulo: 'Reportes de inventario',
        reporte,
        estilosModulo: estilosInventario,
    });
}

function exportarReporteOperativoInventario(req, res) {
    const archivo = inventarioService.generarExcelReporteOperativoInventario();

    if (!archivo) {
        return res.redirect(
            `/inventario/reportes?error=${encodeURIComponent(
                'No fue posible generar el reporte operativo de inventario.'
            )}`
        );
    }

    return enviarArchivoExcel(res, archivo);
}

module.exports = {
    mostrarInventario,
    mostrarFormularioAjuste,
    procesarAjuste,
    mostrarHistorial,

    listarConteos,
    mostrarFormularioNuevoConteo,
    crearConteo,
    verConteo,
    guardarCantidadesConteo,
    aplicarConteo,
    verDiferenciasConteo,
    exportarDiferenciasConteo,
    exportarPlantillaConteo,
    importarPlantillaConteo,

    mostrarReportesInventario,
    exportarReporteOperativoInventario,
};