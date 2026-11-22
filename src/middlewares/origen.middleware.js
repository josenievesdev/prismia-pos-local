/**
 * Protección CSRF por verificación de origen.
 *
 * Toda petición que modifica datos (POST/PUT/PATCH/DELETE) debe venir de una
 * página de esta misma aplicación. Los navegadores envían la cabecera Origin
 * (o al menos Referer) en peticiones entre sitios, así que un formulario de
 * otra página no puede hacer ventas, anulaciones o cambios a nombre del
 * usuario con sesión abierta. Complementa la cookie SameSite=Lax.
 */

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

function obtenerHostDeUrl(valor) {
    try {
        return new URL(valor).host;
    } catch (error) {
        return null;
    }
}

function rechazar(req, res) {
    const mensaje = 'Solicitud bloqueada: no proviene de Prismia POS.';

    if (req.is('application/json') || req.accepts(['html', 'json']) === 'json') {
        return res.status(403).json({ ok: false, mensaje });
    }

    return res.status(403).send(mensaje);
}

function verificarOrigen(req, res, next) {
    if (METODOS_SEGUROS.has(req.method)) {
        return next();
    }

    const origen = req.get('origin');
    const referencia = req.get('referer');
    const hostEsperado = req.get('host');

    // Sin Origin ni Referer: cliente que no es un navegador moderno.
    // La cookie SameSite=Lax ya impide que viaje la sesión entre sitios.
    if (!origen && !referencia) {
        return next();
    }

    const hostOrigen = origen && origen !== 'null'
        ? obtenerHostDeUrl(origen)
        : obtenerHostDeUrl(referencia);

    if (!hostOrigen || hostOrigen !== hostEsperado) {
        return rechazar(req, res);
    }

    return next();
}

module.exports = verificarOrigen;
