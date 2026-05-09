const usuariosService = require('./usuarios.service');

const estilosUsuarios = ['/css/modules/usuarios.css'];

function listarUsuarios(req, res) {
    const usuarios = usuariosService.listarUsuarios();

    return res.render('usuarios/index', {
        titulo: 'Usuarios',
        usuarios,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosUsuarios,
    });
}

function mostrarFormularioCrear(req, res) {
    return res.render('usuarios/formulario', {
        titulo: 'Nuevo usuario',
        modo: 'crear',
        action: '/usuarios/nuevo',
        usuarioFormulario: usuariosService.prepararUsuarioFormulario({
            rol_principal: 'cajero',
            estado: 'activo',
        }),
        roles: usuariosService.obtenerRolesFormulario(),
        error: null,
        estilosModulo: estilosUsuarios,
    });
}

function crearUsuario(req, res) {
    const resultado = usuariosService.crearUsuario(req.body || {});

    if (!resultado.ok) {
        return res.status(400).render('usuarios/formulario', {
            titulo: 'Nuevo usuario',
            modo: 'crear',
            action: '/usuarios/nuevo',
            usuarioFormulario: resultado.valores,
            roles: usuariosService.obtenerRolesFormulario(),
            error: resultado.mensaje,
            estilosModulo: estilosUsuarios,
        });
    }

    return res.redirect(`/usuarios?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function mostrarFormularioEditar(req, res) {
    const usuario = usuariosService.obtenerUsuarioParaEdicion(req.params.id);

    if (!usuario) {
        return res.redirect('/usuarios?error=No se encontró el usuario.');
    }

    return res.render('usuarios/formulario', {
        titulo: 'Editar usuario',
        modo: 'editar',
        action: `/usuarios/${usuario.id_usuario}/editar`,
        usuarioFormulario: usuariosService.prepararUsuarioFormulario(usuario),
        roles: usuariosService.obtenerRolesFormulario(),
        error: null,
        estilosModulo: estilosUsuarios,
    });
}

function actualizarUsuario(req, res) {
    const resultado = usuariosService.actualizarUsuario(
        req.params.id,
        req.body || {},
        req.session?.usuario
    );

    if (!resultado.ok) {
        const usuario = usuariosService.obtenerUsuarioParaEdicion(req.params.id);

        return res.status(400).render('usuarios/formulario', {
            titulo: 'Editar usuario',
            modo: 'editar',
            action: `/usuarios/${req.params.id}/editar`,
            usuarioFormulario: resultado.valores || usuariosService.prepararUsuarioFormulario(usuario || {}),
            roles: usuariosService.obtenerRolesFormulario(),
            error: resultado.mensaje,
            estilosModulo: estilosUsuarios,
        });
    }

    return res.redirect(`/usuarios?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function activarUsuario(req, res) {
    const resultado = usuariosService.cambiarEstadoUsuario(
        req.params.id,
        'activo',
        req.session?.usuario
    );

    if (!resultado.ok) {
        return res.redirect(`/usuarios?error=${encodeURIComponent(resultado.mensaje)}`);
    }

    return res.redirect(`/usuarios?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function desactivarUsuario(req, res) {
    const resultado = usuariosService.cambiarEstadoUsuario(
        req.params.id,
        'inactivo',
        req.session?.usuario
    );

    if (!resultado.ok) {
        return res.redirect(`/usuarios?error=${encodeURIComponent(resultado.mensaje)}`);
    }

    return res.redirect(`/usuarios?exito=${encodeURIComponent(resultado.mensaje)}`);
}

module.exports = {
    listarUsuarios,
    mostrarFormularioCrear,
    crearUsuario,
    mostrarFormularioEditar,
    actualizarUsuario,
    activarUsuario,
    desactivarUsuario,
};