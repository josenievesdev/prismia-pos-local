const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

const MAX_INTENTOS_LOGIN = 5;
const VENTANA_INTENTOS_MS = 15 * 60 * 1000;
const BLOQUEO_LOGIN_MS = 10 * 60 * 1000;

const intentosLogin = new Map();

function obtenerClaveIntento(req) {
    const correo = String(req.body?.correo || '').trim().toLowerCase();
    const ip = req.ip || req.connection?.remoteAddress || 'ip-desconocida';

    return `${ip}:${correo || 'sin-correo'}`;
}

function limpiarIntentosVencidos() {
    const ahora = Date.now();

    for (const [clave, registro] of intentosLogin.entries()) {
        const ventanaVencida = ahora - registro.primer_intento > VENTANA_INTENTOS_MS;
        const bloqueoVencido = registro.bloqueado_hasta && ahora > registro.bloqueado_hasta;

        if (ventanaVencida && (!registro.bloqueado_hasta || bloqueoVencido)) {
            intentosLogin.delete(clave);
        }
    }
}

function limitarIntentosLogin(req, res, next) {
    limpiarIntentosVencidos();

    const clave = obtenerClaveIntento(req);
    const registro = intentosLogin.get(clave);
    const ahora = Date.now();

    if (registro?.bloqueado_hasta && ahora < registro.bloqueado_hasta) {
        const minutosRestantes = Math.ceil((registro.bloqueado_hasta - ahora) / 60000);

        return res.status(429).render('auth/login', {
            layout: false,
            titulo: 'Iniciar sesión',
            error: `Demasiados intentos fallidos. Intenta nuevamente en ${minutosRestantes} minuto(s).`,
            valores: {
                correo: req.body.correo || '',
            },
        });
    }

    return next();
}

function registrarIntentoLoginFallido(req, res, next) {
    const renderOriginal = res.render.bind(res);
    const clave = obtenerClaveIntento(req);

    res.render = function renderConRegistroIntento(vista, opciones, callback) {
        if (vista === 'auth/login' && res.statusCode === 401) {
            const ahora = Date.now();
            const registroActual = intentosLogin.get(clave);

            const registro = registroActual && ahora - registroActual.primer_intento <= VENTANA_INTENTOS_MS
                ? registroActual
                : {
                    intentos: 0,
                    primer_intento: ahora,
                    bloqueado_hasta: null,
                };

            registro.intentos += 1;

            if (registro.intentos >= MAX_INTENTOS_LOGIN) {
                registro.bloqueado_hasta = ahora + BLOQUEO_LOGIN_MS;
            }

            intentosLogin.set(clave, registro);
        }

        return renderOriginal(vista, opciones, callback);
    };

    return next();
}

function limpiarIntentosLoginExitoso(req, res, next) {
    const redirectOriginal = res.redirect.bind(res);
    const clave = obtenerClaveIntento(req);

    res.redirect = function redirectConLimpieza(...args) {
        intentosLogin.delete(clave);
        return redirectOriginal(...args);
    };

    return next();
}

router.get('/login', authController.mostrarLogin);
router.post(
    '/login',
    limitarIntentosLogin,
    registrarIntentoLoginFallido,
    limpiarIntentosLoginExitoso,
    authController.procesarLogin
);
router.post('/logout', authController.cerrarSesion);

module.exports = router;