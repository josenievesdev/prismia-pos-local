const licenciaLocalService = require('./licenciaLocal.service');
const licenciaComercial = require('../../config/licencia-comercial');

function obtenerDatosVista(extra = {}) {
    const licenciaLocal = licenciaLocalService.obtenerResumenLicenciaLocal();

    return {
        titulo: extra.titulo || 'Licencia',
        licenciaLocal,
        whatsappPagoUrl: licenciaComercial.obtenerUrlWhatsappPago(),
        error: extra.error || null,
        mensajeExito: extra.mensajeExito || null,
        valores: extra.valores || {
            codigo_activacion: '',
        },
    };
}

function mostrarEstadoLicencia(req, res) {
    return res.render('licencia/index', obtenerDatosVista({
        titulo: 'Licencia',
    }));
}

function mostrarActivacion(req, res) {
    return res.render('licencia/activar', obtenerDatosVista({
        titulo: 'Activar licencia',
    }));
}

function procesarActivacion(req, res) {
    const codigoActivacion = String(req.body?.codigo_activacion || '').trim();

    if (!codigoActivacion) {
        return res.status(400).render('licencia/activar', obtenerDatosVista({
            titulo: 'Activar licencia',
            error: 'Debes ingresar un código de activación.',
            valores: {
                codigo_activacion: '',
            },
        }));
    }

    const resultado = licenciaLocalService.activarConCodigoFirmado(
        codigoActivacion
    );

    if (!resultado.ok) {
        return res.status(400).render('licencia/activar', obtenerDatosVista({
            titulo: 'Activar licencia',
            error: resultado.mensaje,
            valores: {
                codigo_activacion: codigoActivacion,
            },
        }));
    }

    return res.render('licencia/activar', obtenerDatosVista({
        titulo: 'Activar licencia',
        mensajeExito: resultado.mensaje,
        valores: {
            codigo_activacion: '',
        },
    }));
}

module.exports = {
    mostrarEstadoLicencia,
    mostrarActivacion,
    procesarActivacion,
};