const setupService = require('./setup.service');
const { iniciarSesionSegura } = require('../../utils/sesion');

function mostrarSetup(req, res) {
    if (!setupService.requiereConfiguracionInicial()) {
        return res.redirect('/auth/login');
    }

    return res.render('setup/index', {
        layout: false,
        titulo: 'Configuración inicial',
        error: null,
        valores: {
            nombre: '',
            correo: '',
        },
    });
}

function procesarSetup(req, res, next) {
    const resultado = setupService.crearPrimerAdministrador(req.body);

    if (!resultado.ok) {
        return res.status(400).render('setup/index', {
            layout: false,
            titulo: 'Configuración inicial',
            error: resultado.mensaje,
            valores: resultado.valores || {
                nombre: req.body.nombre || '',
                correo: req.body.correo || '',
            },
        });
    }

    return iniciarSesionSegura(req, resultado.usuario, (error) => {
        if (error) {
            return next(error);
        }

        return res.redirect('/dashboard');
    });
}

module.exports = {
    mostrarSetup,
    procesarSetup,
};