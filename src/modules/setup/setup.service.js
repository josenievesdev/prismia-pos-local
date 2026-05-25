const bcrypt = require('bcryptjs');
const setupRepository = require('./setup.repository');

function normalizarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarCorreo(correo) {
    return normalizarTexto(correo).toLowerCase();
}

function correoEsValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function requiereConfiguracionInicial() {
    return !setupRepository.existeAdministradorActivo();
}

function validarDatosAdministrador({ nombre, correo, contrasena, confirmar_contrasena }) {
    const errores = [];
    const correoNormalizado = normalizarCorreo(correo);
    const contrasenaTexto = String(contrasena || '');
    const confirmarTexto = String(confirmar_contrasena || '');

    if (!normalizarTexto(nombre)) {
        errores.push('El nombre del administrador es obligatorio.');
    }

    if (!correoNormalizado) {
        errores.push('El correo del administrador es obligatorio.');
    } else if (!correoEsValido(correoNormalizado)) {
        errores.push('Ingresa un correo válido.');
    }

    if (!contrasenaTexto) {
        errores.push('La contraseña es obligatoria.');
    } else if (contrasenaTexto.length < 10) {
        errores.push('La contraseña debe tener mínimo 10 caracteres.');
    }

    if (!confirmarTexto) {
        errores.push('Confirma la contraseña.');
    } else if (contrasenaTexto !== confirmarTexto) {
        errores.push('Las contraseñas no coinciden.');
    }

    return errores;
}

function crearPrimerAdministrador(datosFormulario) {
    if (!requiereConfiguracionInicial()) {
        return {
            ok: false,
            mensaje: 'La configuración inicial ya fue completada.',
        };
    }

    const datos = {
        nombre: normalizarTexto(datosFormulario.nombre),
        correo: normalizarCorreo(datosFormulario.correo),
        contrasena: String(datosFormulario.contrasena || ''),
        confirmar_contrasena: String(datosFormulario.confirmar_contrasena || ''),
    };

    const errores = validarDatosAdministrador(datos);

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
            valores: {
                nombre: datos.nombre,
                correo: datos.correo,
            },
        };
    }

    const usuarioExistente = setupRepository.buscarUsuarioPorCorreo(datos.correo);

    if (usuarioExistente) {
        return {
            ok: false,
            mensaje: 'Ya existe un usuario con ese correo.',
            valores: {
                nombre: datos.nombre,
                correo: datos.correo,
            },
        };
    }

    const contrasenaHash = bcrypt.hashSync(datos.contrasena, 10);

    const usuario = setupRepository.crearAdministradorInicial({
        nombre: datos.nombre,
        correo: datos.correo,
        contrasenaHash,
    });

    return {
        ok: true,
        usuario,
    };
}

module.exports = {
    requiereConfiguracionInicial,
    crearPrimerAdministrador,
};