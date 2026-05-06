const fs = require('fs');
const path = require('path');

const productosService = require('./productos.service');

const carpetaUploadsProductos = path.join(
    __dirname,
    '../../public/uploads/productos'
);

const prefijoPublicoImagenesProducto = '/uploads/productos/';

const estilosProductos = ['/css/modules/productos.css'];

function prepararProductoParaFormulario(producto) {
    return {
        ...producto,
        porcentaje_iva_visual:
            typeof producto.porcentaje_iva_visual !== 'undefined'
                ? producto.porcentaje_iva_visual
                : Number(producto.porcentaje_iva || 0) / 100,
    };
}

function obtenerRutaFisicaImagenProducto(imagenUrl) {
    const valor = String(imagenUrl || '').trim();

    if (!valor.startsWith(prefijoPublicoImagenesProducto)) {
        return null;
    }

    const nombreArchivo = path.basename(valor);

    if (!nombreArchivo || nombreArchivo === '.' || nombreArchivo === '..') {
        return null;
    }

    const carpetaSegura = path.resolve(carpetaUploadsProductos);
    const rutaFisica = path.resolve(carpetaSegura, nombreArchivo);

    if (!rutaFisica.startsWith(`${carpetaSegura}${path.sep}`)) {
        return null;
    }

    return rutaFisica;
}

function eliminarImagenProductoSegura(imagenUrl) {
    const rutaFisica = obtenerRutaFisicaImagenProducto(imagenUrl);

    if (!rutaFisica) {
        return;
    }

    try {
        if (fs.existsSync(rutaFisica)) {
            fs.unlinkSync(rutaFisica);
        }
    } catch (error) {
        console.warn('No se pudo eliminar la imagen del producto:', error.message);
    }
}

function eliminarImagenSubidaTemporal(req) {
    if (!req.file?.filename) {
        return;
    }

    eliminarImagenProductoSegura(`${prefijoPublicoImagenesProducto}${req.file.filename}`);
}

function prepararBodyConImagen(req) {
    const datos = { ...req.body };

    if (req.file) {
        datos.imagen_url = `${prefijoPublicoImagenesProducto}${req.file.filename}`;
        return datos;
    }

    if (datos.quitar_imagen_producto) {
        datos.imagen_url = '';
    }

    return datos;
}
function listarProductos(req, res) {
    const resultado = productosService.listarProductos({
        busqueda: req.query.busqueda,
        idCategoriaProducto: req.query.categoria,
        estado: req.query.estado,
        stock: req.query.stock,
        pagina: req.query.pagina,
        limite: req.query.limite,
    });

    const categorias = productosService.listarCategoriasDisponibles();

    function crearUrlPagina(pagina) {
        const parametros = new URLSearchParams();

        if (resultado.filtros.busqueda) {
            parametros.set('busqueda', resultado.filtros.busqueda);
        }

        if (resultado.filtros.idCategoriaProducto) {
            parametros.set('categoria', resultado.filtros.idCategoriaProducto);
        }

        if (resultado.filtros.estado) {
            parametros.set('estado', resultado.filtros.estado);
        }

        if (resultado.filtros.stock) {
            parametros.set('stock', resultado.filtros.stock);
        }

        parametros.set('limite', String(resultado.paginacion.limite));
        parametros.set('pagina', String(pagina));

        return `/productos?${parametros.toString()}`;
    }

    return res.render('productos/index', {
        titulo: 'Productos',
        productos: resultado.productos,
        categorias,
        filtros: resultado.filtros,
        paginacion: resultado.paginacion,
        crearUrlPagina,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosProductos,
    });
}
function mostrarFormularioCrear(req, res) {
    const categorias = productosService.listarCategoriasDisponibles();
    const unidades = productosService.listarUnidadesMedida();
    const unidadPredeterminada = productosService.obtenerUnidadPredeterminada();

    return res.render('productos/formulario', {
        titulo: 'Nuevo producto',
        modo: 'crear',
        categorias,
        unidades,
        producto: {
            id_categoria_producto: '',
            id_unidad_medida: unidadPredeterminada?.id_unidad_medida || '',
            codigo_interno: productosService.generarCodigoProducto(),
            codigo_barras: '',
            nombre: '',
            descripcion: '',
            precio_costo: 0,
            precio_venta: 0,
            stock_inicial: 0,
            stock_minimo: 0,
            controla_inventario: 1,
            permite_venta_sin_stock: 0,
            maneja_iva: 0,
            porcentaje_iva_visual: 0,
            precio_incluye_iva: 0,
            imagen_url: '',
            mostrar_en_pos_tactil: 0,
            orden_pos_tactil: '',
        },
        error: null,
        estilosModulo: estilosProductos,
    });
}

function crearProducto(req, res) {
    const categorias = productosService.listarCategoriasDisponibles();
    const unidades = productosService.listarUnidadesMedida();

    const datosFormulario = prepararBodyConImagen(req);

    const resultado = productosService.crearProducto({
        datosFormulario,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
    if (!resultado.ok) {
        eliminarImagenSubidaTemporal(req);

        return res.status(400).render('productos/formulario', {
            titulo: 'Nuevo producto',
            modo: 'crear',
            categorias,
            unidades,
            producto: prepararProductoParaFormulario({
                ...datosFormulario,
                imagen_url: '',
                controla_inventario: req.body.controla_inventario ? 1 : 0,
                permite_venta_sin_stock: req.body.permite_venta_sin_stock ? 1 : 0,
                maneja_iva: req.body.maneja_iva ? 1 : 0,
                precio_incluye_iva: req.body.precio_incluye_iva ? 1 : 0,
            }),
            error: resultado.mensaje,
            estilosModulo: estilosProductos,
        });
    }

    return res.redirect(
        `/productos?exito=${encodeURIComponent(resultado.mensaje)}`
    );
}

function mostrarFormularioEditar(req, res) {
    const producto = productosService.obtenerProductoPorId(req.params.id);

    if (!producto) {
        return res.redirect(
            `/productos?error=${encodeURIComponent('El producto no existe.')}`
        );
    }

    const categorias = productosService.listarCategoriasDisponibles();
    const unidades = productosService.listarUnidadesMedida();

    return res.render('productos/formulario', {
        titulo: 'Editar producto',
        modo: 'editar',
        categorias,
        unidades,
        producto: prepararProductoParaFormulario(producto),
        error: null,
        estilosModulo: estilosProductos,
    });
}

function actualizarProducto(req, res) {
    const productoActual = productosService.obtenerProductoPorId(req.params.id);

    if (!productoActual) {
        return res.redirect(
            `/productos?error=${encodeURIComponent('El producto no existe.')}`
        );
    }

    const categorias = productosService.listarCategoriasDisponibles();
    const unidades = productosService.listarUnidadesMedida();

    const datosFormulario = prepararBodyConImagen(req);

    const resultado = productosService.actualizarProducto({
        idProducto: req.params.id,
        datosFormulario,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        eliminarImagenSubidaTemporal(req);

        const imagenFormulario = req.file
            ? productoActual.imagen_url
            : datosFormulario.imagen_url;

        return res.status(400).render('productos/formulario', {
            titulo: 'Editar producto',
            modo: 'editar',
            categorias,
            unidades,
            producto: prepararProductoParaFormulario({
                ...productoActual,
                ...datosFormulario,
                imagen_url: imagenFormulario,
                controla_inventario: req.body.controla_inventario ? 1 : 0,
                permite_venta_sin_stock: req.body.permite_venta_sin_stock ? 1 : 0,
                maneja_iva: req.body.maneja_iva ? 1 : 0,
                precio_incluye_iva: req.body.precio_incluye_iva ? 1 : 0,
            }),
            error: resultado.mensaje,
            estilosModulo: estilosProductos,
        });
    }

    if (
        productoActual.imagen_url &&
        productoActual.imagen_url !== datosFormulario.imagen_url
    ) {
        eliminarImagenProductoSegura(productoActual.imagen_url);
    }

    return res.redirect(
        `/productos?exito=${encodeURIComponent(resultado.mensaje)}`
    );
}

function activarProducto(req, res) {
    const resultado = productosService.cambiarEstadoProducto({
        idProducto: req.params.id,
        nuevoEstado: 'activo',
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    const tipo = resultado.ok ? 'exito' : 'error';

    return res.redirect(
        `/productos?${tipo}=${encodeURIComponent(resultado.mensaje)}`
    );
}

function desactivarProducto(req, res) {
    const resultado = productosService.cambiarEstadoProducto({
        idProducto: req.params.id,
        nuevoEstado: 'inactivo',
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    const tipo = resultado.ok ? 'exito' : 'error';

    return res.redirect(
        `/productos?${tipo}=${encodeURIComponent(resultado.mensaje)}`
    );
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
        `/inventario/conteos/${resultado.idConteo}?exito=${encodeURIComponent(resultado.mensaje)}`
    );
}

function verConteo(req, res) {
    const resultado = inventarioService.obtenerConteoConDetalle(req.params.id);

    if (!resultado) {
        return res.redirect(
            `/inventario/conteos?error=${encodeURIComponent('El conteo físico no existe.')}`
        );
    }

    return res.render('inventario/conteos/detalle', {
        titulo: `Conteo ${resultado.conteo.numero_conteo}`,
        conteo: {
            ...resultado.conteo,
            estado_texto: inventarioService.traducirEstadoConteo(resultado.conteo.estado),
        },
        detalles: resultado.detalles,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosInventario,
    });
}



module.exports = {
    listarProductos,
    mostrarFormularioCrear,
    crearProducto,
    mostrarFormularioEditar,
    actualizarProducto,
    activarProducto,
    desactivarProducto,

    listarConteos,
    mostrarFormularioNuevoConteo,
    crearConteo,
    verConteo,
};