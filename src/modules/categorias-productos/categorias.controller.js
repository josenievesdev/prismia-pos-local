const categoriasService = require('./categorias.service');

function listarCategorias(req, res) {
    const categorias = categoriasService.listarCategorias();

    return res.render('categorias-productos/index', {
        titulo: 'Categorías',
        categorias,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
    });
}

function mostrarFormularioCrear(req, res) {
    return res.render('categorias-productos/formulario', {
        titulo: 'Nueva categoría',
        modo: 'crear',
        categoria: {
            nombre: '',
            descripcion: '',
        },
        error: null,
    });
}

function crearCategoria(req, res) {
    const resultado = categoriasService.crearCategoria({
        datosFormulario: req.body,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        return res.status(400).render('categorias-productos/formulario', {
            titulo: 'Nueva categoría',
            modo: 'crear',
            categoria: {
                nombre: req.body.nombre || '',
                descripcion: req.body.descripcion || '',
            },
            error: resultado.mensaje,
        });
    }

    return res.redirect(
        `/categorias-productos?exito=${encodeURIComponent(resultado.mensaje)}`
    );
}

function mostrarFormularioEditar(req, res) {
    const categoria = categoriasService.obtenerCategoriaPorId(req.params.id);

    if (!categoria) {
        return res.redirect(
            `/categorias-productos?error=${encodeURIComponent(
                'La categoría no existe.'
            )}`
        );
    }

    return res.render('categorias-productos/formulario', {
        titulo: 'Editar categoría',
        modo: 'editar',
        categoria,
        error: null,
    });
}

function actualizarCategoria(req, res) {
    const categoria = categoriasService.obtenerCategoriaPorId(req.params.id);

    if (!categoria) {
        return res.redirect(
            `/categorias-productos?error=${encodeURIComponent(
                'La categoría no existe.'
            )}`
        );
    }

    const resultado = categoriasService.actualizarCategoria({
        idCategoria: req.params.id,
        datosFormulario: req.body,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        return res.status(400).render('categorias-productos/formulario', {
            titulo: 'Editar categoría',
            modo: 'editar',
            categoria: {
                ...categoria,
                nombre: req.body.nombre || '',
                descripcion: req.body.descripcion || '',
            },
            error: resultado.mensaje,
        });
    }

    return res.redirect(
        `/categorias-productos?exito=${encodeURIComponent(resultado.mensaje)}`
    );
}

function activarCategoria(req, res) {
    const resultado = categoriasService.cambiarEstadoCategoria({
        idCategoria: req.params.id,
        nuevoEstado: 'activo',
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    const tipo = resultado.ok ? 'exito' : 'error';

    return res.redirect(
        `/categorias-productos?${tipo}=${encodeURIComponent(resultado.mensaje)}`
    );
}

function desactivarCategoria(req, res) {
    const resultado = categoriasService.cambiarEstadoCategoria({
        idCategoria: req.params.id,
        nuevoEstado: 'inactivo',
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    const tipo = resultado.ok ? 'exito' : 'error';

    return res.redirect(
        `/categorias-productos?${tipo}=${encodeURIComponent(resultado.mensaje)}`
    );
}

module.exports = {
    listarCategorias,
    mostrarFormularioCrear,
    crearCategoria,
    mostrarFormularioEditar,
    actualizarCategoria,
    activarCategoria,
    desactivarCategoria,
};