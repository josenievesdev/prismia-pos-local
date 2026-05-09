const empresa = require('../config/empresa');

function formatearPesos(valor) {
    const numero = Number(valor || 0);

    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(numero);
}

function formatearNumero(valor) {
    const numero = Number(valor || 0);

    return new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0,
    }).format(numero);
}

function formatearFecha(valor) {
    if (!valor) {
        return '';
    }

    return String(valor);
}

function localsMiddleware(req, res, next) {
    const usuario = req.session?.usuario || null;
    const rolesUsuario = Array.isArray(usuario?.roles)
        ? usuario.roles
        : [usuario?.rol_principal].filter(Boolean);

    res.locals.empresa = empresa;

    // Alias corto para no romper vistas anteriores.
    res.locals.appName = empresa.software.nombre;

    res.locals.usuario = usuario;
    res.locals.rutaActual = req.originalUrl;

    res.locals.rolesUsuario = rolesUsuario;
    res.locals.tieneRol = function (...rolesPermitidos) {
        return rolesUsuario.some((rol) => rolesPermitidos.includes(rol));
    };

    res.locals.esAdministrador = rolesUsuario.includes('administrador');
    res.locals.esCajero = rolesUsuario.includes('cajero');

    // Helpers globales para vistas EJS.
    res.locals.formatearPesos = formatearPesos;
    res.locals.formatearNumero = formatearNumero;
    res.locals.formatearFecha = formatearFecha;

    next();
}

module.exports = localsMiddleware;