const meserosService = require('./meseros.service');

function redirigir(res, resultado) {
    const clave = resultado.ok ? 'exito' : 'error';
    return res.redirect(`/meseros?${clave}=${encodeURIComponent(resultado.mensaje)}`);
}

function listarMeseros(req, res, next) {
    try {
        return res.render('meseros/index', {
            titulo: 'Meseros y propinas',
            meseros: meserosService.listarMeseros(),
            porcentajeSugerido: meserosService.obtenerPorcentajeSugerido(),
            mensajeExito: req.query.exito || null,
            error: req.query.error || null,
        });
    } catch (error) {
        return next(error);
    }
}

function crearMesero(req, res) {
    return redirigir(res, meserosService.crearMesero(req.body));
}

function activarMesero(req, res) {
    return redirigir(res, meserosService.cambiarEstadoMesero(req.params.id, true));
}

function desactivarMesero(req, res) {
    return redirigir(res, meserosService.cambiarEstadoMesero(req.params.id, false));
}

function guardarPorcentaje(req, res) {
    return redirigir(res, meserosService.guardarPorcentajeSugerido(req.body.porcentaje));
}

module.exports = {
    listarMeseros,
    crearMesero,
    activarMesero,
    desactivarMesero,
    guardarPorcentaje,
};
