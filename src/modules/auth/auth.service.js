const bcrypt = require('bcryptjs');
const authRepository = require('./auth.repository');

function normalizarCorreo(correo) {
    return String(correo || '').trim().toLowerCase();
}

function validarCredencialesEntrada({ correo, contrasena }) {
    const errores = [];

    if (!correo || !String(correo).trim()) {
        errores.push('El correo es obligatorio.');
    }

    if (!contrasena || !String(contrasena).trim()) {
        errores.push('La contraseña es obligatoria.');
    }

    return errores;
}

function iniciarSesion({ correo, contrasena }) {
    const errores = validarCredencialesEntrada({ correo, contrasena });

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
        };
    }

    const correoNormalizado = normalizarCorreo(correo);
    const usuario = authRepository.buscarUsuarioPorCorreo(correoNormalizado);

    if (!usuario) {
        return {
            ok: false,
            mensaje: 'Correo o contraseña incorrectos.',
        };
    }

    if (usuario.estado !== 'activo') {
        return {
            ok: false,
            mensaje: 'El usuario no se encuentra activo.',
        };
    }

    const contrasenaCorrecta = bcrypt.compareSync(
        String(contrasena),
        usuario.contrasena_hash
    );

    if (!contrasenaCorrecta) {
        return {
            ok: false,
            mensaje: 'Correo o contraseña incorrectos.',
        };
    }

    const roles = authRepository.obtenerRolesPorUsuario(usuario.id_usuario);

    authRepository.actualizarUltimoAcceso(usuario.id_usuario);

    return {
        ok: true,
        usuario: {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            correo: usuario.correo,
            roles,
            rol_principal: roles[0] || null,
        },
    };
}

module.exports = {
    iniciarSesion,
};