const licenciaLocalService = require('../modules/licencia-local/licenciaLocal.service');
const licenciaComercial = require('../config/licencia-comercial');

const RUTAS_PERMITIDAS = [
    '/auth',
    '/setup',
    '/salud',
    '/backups',
    '/favicon.ico',
    '/css',
    '/js',
    '/img',
    '/uploads',
];

function esRutaPermitida(ruta = '') {
    return RUTAS_PERMITIDAS.some((rutaPermitida) => {
        return ruta === rutaPermitida || ruta.startsWith(`${rutaPermitida}/`);
    });
}

function requiereLicenciaOperativa(req, res, next) {
    try {
        const rutaActual = req.path || req.originalUrl || '';

        if (esRutaPermitida(rutaActual)) {
            return next();
        }

        if (!req.session || !req.session.usuario) {
            return next();
        }

        const licenciaLocal = licenciaLocalService.obtenerResumenLicenciaLocal();

        res.locals.licenciaLocal = licenciaLocal;

        if (!licenciaLocal.ok) {
            return res.status(403).render('licencia/vencida', {
                titulo: 'Licencia no disponible',
                licenciaLocal,
                whatsappPagoUrl: licenciaComercial.obtenerUrlWhatsappPago(),
            });
        }

        if (!licenciaLocal.bloquea_operacion) {
            return next();
        }

        return res.status(403).render('licencia/vencida', {
            titulo: 'Licencia requiere activación',
            licenciaLocal,
            whatsappPagoUrl: licenciaComercial.obtenerUrlWhatsappPago(),
        });
    } catch (error) {
        console.error('No se pudo validar la licencia local:', error.message);
        return next();
    }
}

module.exports = {
    requiereLicenciaOperativa,
    esRutaPermitida,
};