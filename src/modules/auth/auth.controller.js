const authService = require('./auth.service');
const configuracionService = require('../configuracion/configuracion.service');
const { crearLimitador, describirEspera } = require('../../utils/limitador-intentos');
const { iniciarSesionSegura } = require('../../utils/sesion');

// 5 fallos seguidos para una misma cuenta desde un mismo equipo, o 20 desde
// un mismo equipo en total, bloquean el login durante 15 minutos.
const limitadorCuenta = crearLimitador({ maxIntentos: 5 });
const limitadorEquipo = crearLimitador({ maxIntentos: 20 });

// Nombre del negocio para personalizar el login. Si la configuración no existe
// o falla la lectura, el login se muestra igual (sin el nombre).
function obtenerComercioLogin() {
    try {
        const configuracion = configuracionService.obtenerConfiguracionNegocio() || {};
        const nombre = String(configuracion.nombre_comercial || configuracion.nombre_negocio || '').trim();

        return { nombre };
    } catch (error) {
        return { nombre: '' };
    }
}

function renderLogin(res, { estado = 200, error = null, correo = '' } = {}) {
    return res.status(estado).render('auth/login', {
        layout: false,
        titulo: 'Iniciar sesión',
        error,
        comercio: obtenerComercioLogin(),
        valores: {
            correo,
        },
    });
}

function mostrarLogin(req, res) {
    if (req.session?.usuario) {
        return res.redirect('/dashboard');
    }

    return renderLogin(res);
}

function procesarLogin(req, res, next) {
    const correo = String(req.body.correo || '').trim().toLowerCase();
    const ip = req.ip || 'desconocida';
    const claveCuenta = `${ip}|${correo}`;

    const bloqueo = [limitadorCuenta.consultar(claveCuenta), limitadorEquipo.consultar(ip)]
        .find((estado) => estado.bloqueado);

    if (bloqueo) {
        return renderLogin(res, {
            estado: 429,
            error: `Demasiados intentos fallidos. Intenta de nuevo en ${describirEspera(bloqueo.segundosRestantes)}.`,
            correo: req.body.correo || '',
        });
    }

    const resultado = authService.iniciarSesion({
        correo: req.body.correo,
        contrasena: req.body.contrasena,
    });

    if (!resultado.ok) {
        limitadorCuenta.registrarFallo(claveCuenta);
        limitadorEquipo.registrarFallo(ip);

        return renderLogin(res, {
            estado: 401,
            error: resultado.mensaje,
            correo: req.body.correo || '',
        });
    }

    limitadorCuenta.reiniciar(claveCuenta);

    return iniciarSesionSegura(req, resultado.usuario, (error) => {
        if (error) {
            return next(error);
        }

        return res.redirect('/dashboard');
    });
}

function cerrarSesion(req, res) {
    req.session.destroy(() => {
        res.clearCookie('prismia.sid');
        return res.redirect('/auth/login');
    });
}

module.exports = {
    mostrarLogin,
    procesarLogin,
    cerrarSesion,
};
