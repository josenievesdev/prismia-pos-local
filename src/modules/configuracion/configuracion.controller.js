const configuracionService = require('./configuracion.service');

function obtenerDatosVista() {
    return {
        configuracion: configuracionService.obtenerConfiguracionNegocio(),
    };
}

function mostrarConfiguracion(req, res) {
    const datosVista = obtenerDatosVista();

    return res.render('configuracion/index', {
        titulo: 'Configuración',
        configuracion: datosVista.configuracion,
        mensajeExito: null,
        error: null,
    });
}

function actualizarConfiguracion(req, res) {
    const configuracionActual =
        configuracionService.obtenerConfiguracionNegocio();

    if (!configuracionActual) {
        return res.status(500).render('configuracion/index', {
            titulo: 'Configuración',
            configuracion: null,
            mensajeExito: null,
            error: 'No se encontró configuración activa del negocio.',
        });
    }

    const resultado =
        configuracionService.actualizarConfiguracionNegocio({
            idConfiguracion: configuracionActual.id_configuracion,
            datosFormulario: req.body,
            usuario: req.session?.usuario,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });

    const datosVista = obtenerDatosVista();

    if (!resultado.ok) {
        return res.status(400).render('configuracion/index', {
            titulo: 'Configuración',
            configuracion: datosVista.configuracion,
            mensajeExito: null,
            error: resultado.mensaje,
        });
    }

    return res.render('configuracion/index', {
        titulo: 'Configuración',
        configuracion: datosVista.configuracion,
        mensajeExito: resultado.mensaje,
        error: null,
    });
}


module.exports = {
    mostrarConfiguracion,
    actualizarConfiguracion,
};