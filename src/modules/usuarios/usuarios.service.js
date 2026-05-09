const bcrypt = require('bcryptjs');
const usuariosRepository = require('./usuarios.repository');

const ROLES_PERMITIDOS = ['administrador', 'cajero'];
const ESTADOS_PERMITIDOS = ['activo', 'inactivo', 'bloqueado'];

function normalizarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarCorreo(correo) {
    return String(correo || '').trim().toLowerCase();
}

function normalizarId(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

function correoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function obtenerRolesFormulario() {
    const roles = usuariosRepository.listarRolesOperacion();

    return roles.map((rol) => ({
        ...rol,
        etiqueta: rol.nombre === 'administrador'
            ? 'Administrador'
            : 'Cajero',
    }));
}

function prepararUsuarioFormulario(datos = {}) {
    return {
        id_usuario: datos.id_usuario || '',
        nombre: datos.nombre || '',
        correo: datos.correo || '',
        telefono: datos.telefono || '',
        estado: datos.estado || 'activo',
        rol_principal: datos.rol_principal || datos.rol || 'cajero',
    };
}

function listarUsuarios() {
    return usuariosRepository.listarUsuarios().map((usuario) => ({
        ...usuario,
        rol_etiqueta: usuario.rol_principal === 'administrador'
            ? 'Administrador'
            : usuario.rol_principal === 'cajero'
                ? 'Cajero'
                : usuario.rol_principal || 'Sin rol',
        estado_etiqueta: usuario.estado === 'activo'
            ? 'Activo'
            : usuario.estado === 'bloqueado'
                ? 'Bloqueado'
                : 'Inactivo',
    }));
}

function obtenerUsuarioParaEdicion(idUsuario) {
    const id = normalizarId(idUsuario);

    if (!id) {
        return null;
    }

    return usuariosRepository.obtenerUsuarioPorId(id);
}

function validarDatosUsuario(datos, opciones = {}) {
    const errores = [];
    const nombre = normalizarTexto(datos.nombre);
    const correo = normalizarCorreo(datos.correo);
    const telefono = normalizarTexto(datos.telefono);
    const rol = normalizarTexto(datos.rol || datos.rol_principal || 'cajero');
    const estado = normalizarTexto(datos.estado || 'activo');
    const contrasena = String(datos.contrasena || '');
    const repetirContrasena = String(datos.repetir_contrasena || '');

    if (!nombre) {
        errores.push('El nombre del usuario es obligatorio.');
    }

    if (!correo) {
        errores.push('El correo es obligatorio.');
    } else if (!correoValido(correo)) {
        errores.push('Ingresa un correo válido.');
    }

    if (!ROLES_PERMITIDOS.includes(rol)) {
        errores.push('Selecciona un rol válido.');
    }

    if (!ESTADOS_PERMITIDOS.includes(estado)) {
        errores.push('Selecciona un estado válido.');
    }

    if (opciones.requiereContrasena && !contrasena) {
        errores.push('La contraseña es obligatoria.');
    }

    if (contrasena && contrasena.length < 6) {
        errores.push('La contraseña debe tener al menos 6 caracteres.');
    }

    if (contrasena && contrasena !== repetirContrasena) {
        errores.push('Las contraseñas no coinciden.');
    }

    return {
        errores,
        datosNormalizados: {
            nombre,
            correo,
            telefono,
            rol,
            estado,
            contrasena,
        },
    };
}

function crearUsuario(datos) {
    const validacion = validarDatosUsuario(datos, {
        requiereContrasena: true,
    });

    if (validacion.errores.length > 0) {
        return {
            ok: false,
            mensaje: validacion.errores[0],
            valores: prepararUsuarioFormulario({
                ...datos,
                correo: normalizarCorreo(datos.correo),
            }),
        };
    }

    const { datosNormalizados } = validacion;
    const existeCorreo = usuariosRepository.buscarUsuarioPorCorreo(
        datosNormalizados.correo
    );

    if (existeCorreo) {
        return {
            ok: false,
            mensaje: 'Ya existe un usuario con ese correo.',
            valores: prepararUsuarioFormulario(datosNormalizados),
        };
    }

    const contrasenaHash = bcrypt.hashSync(datosNormalizados.contrasena, 10);

    usuariosRepository.crearUsuario({
        nombre: datosNormalizados.nombre,
        correo: datosNormalizados.correo,
        telefono: datosNormalizados.telefono,
        estado: datosNormalizados.estado,
        rol: datosNormalizados.rol,
        contrasenaHash,
    });

    return {
        ok: true,
        mensaje: 'Usuario creado correctamente.',
    };
}

function actualizarUsuario(idUsuario, datos, usuarioSesion = {}) {
    const id = normalizarId(idUsuario);

    if (!id) {
        return {
            ok: false,
            mensaje: 'Usuario no válido.',
        };
    }

    const usuarioActual = usuariosRepository.obtenerUsuarioPorId(id);

    if (!usuarioActual) {
        return {
            ok: false,
            mensaje: 'No se encontró el usuario.',
        };
    }

    const validacion = validarDatosUsuario(datos, {
        requiereContrasena: false,
    });

    if (validacion.errores.length > 0) {
        return {
            ok: false,
            mensaje: validacion.errores[0],
            valores: prepararUsuarioFormulario({
                ...usuarioActual,
                ...datos,
                correo: normalizarCorreo(datos.correo),
            }),
        };
    }

    const { datosNormalizados } = validacion;

    const usuarioMismoCorreo = usuariosRepository.buscarUsuarioPorCorreo(
        datosNormalizados.correo
    );

    if (
        usuarioMismoCorreo &&
        Number(usuarioMismoCorreo.id_usuario) !== Number(id)
    ) {
        return {
            ok: false,
            mensaje: 'Ya existe otro usuario con ese correo.',
            valores: prepararUsuarioFormulario({
                ...usuarioActual,
                ...datosNormalizados,
            }),
        };
    }

    const idUsuarioSesion = Number(usuarioSesion?.id_usuario || 0);
    const seEditaASiMismo = idUsuarioSesion === Number(id);

    if (
        seEditaASiMismo &&
        (
            datosNormalizados.rol !== 'administrador' ||
            datosNormalizados.estado !== 'activo'
        )
    ) {
        return {
            ok: false,
            mensaje: 'No puedes quitarte el rol administrador ni desactivarte desde tu propia sesión.',
            valores: prepararUsuarioFormulario({
                ...usuarioActual,
                ...datosNormalizados,
            }),
        };
    }

    const eraAdministrador = usuariosRepository.usuarioTieneRol(
        id,
        'administrador'
    );

    if (
        eraAdministrador &&
        (
            datosNormalizados.rol !== 'administrador' ||
            datosNormalizados.estado !== 'activo'
        )
    ) {
        const totalAdmins = usuariosRepository.contarAdministradoresActivos();

        if (totalAdmins <= 1) {
            return {
                ok: false,
                mensaje: 'Debe existir al menos un administrador activo.',
                valores: prepararUsuarioFormulario({
                    ...usuarioActual,
                    ...datosNormalizados,
                }),
            };
        }
    }

    const contrasenaHash = datosNormalizados.contrasena
        ? bcrypt.hashSync(datosNormalizados.contrasena, 10)
        : null;

    usuariosRepository.actualizarUsuario({
        idUsuario: id,
        nombre: datosNormalizados.nombre,
        correo: datosNormalizados.correo,
        telefono: datosNormalizados.telefono,
        estado: datosNormalizados.estado,
        rol: datosNormalizados.rol,
        contrasenaHash,
    });

    return {
        ok: true,
        mensaje: 'Usuario actualizado correctamente.',
    };
}

function cambiarEstadoUsuario(idUsuario, estado, usuarioSesion = {}) {
    const id = normalizarId(idUsuario);
    const nuevoEstado = normalizarTexto(estado);

    if (!id) {
        return {
            ok: false,
            mensaje: 'Usuario no válido.',
        };
    }

    if (!['activo', 'inactivo'].includes(nuevoEstado)) {
        return {
            ok: false,
            mensaje: 'Estado no válido.',
        };
    }

    const usuario = usuariosRepository.obtenerUsuarioPorId(id);

    if (!usuario) {
        return {
            ok: false,
            mensaje: 'No se encontró el usuario.',
        };
    }

    if (Number(usuarioSesion?.id_usuario || 0) === Number(id) && nuevoEstado !== 'activo') {
        return {
            ok: false,
            mensaje: 'No puedes desactivar tu propio usuario.',
        };
    }

    const esAdministrador = usuariosRepository.usuarioTieneRol(
        id,
        'administrador'
    );

    if (esAdministrador && nuevoEstado !== 'activo') {
        const totalAdmins = usuariosRepository.contarAdministradoresActivos();

        if (totalAdmins <= 1) {
            return {
                ok: false,
                mensaje: 'Debe existir al menos un administrador activo.',
            };
        }
    }

    usuariosRepository.cambiarEstadoUsuario(id, nuevoEstado);

    return {
        ok: true,
        mensaje: nuevoEstado === 'activo'
            ? 'Usuario activado correctamente.'
            : 'Usuario desactivado correctamente.',
    };
}

module.exports = {
    listarUsuarios,
    obtenerRolesFormulario,
    prepararUsuarioFormulario,
    obtenerUsuarioParaEdicion,
    crearUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
};