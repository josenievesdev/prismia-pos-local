const setupService = require('./setup.service');

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

function procesarSetup(req, res) {
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

    return req.session.regenerate((errorRegeneracion) => {
        if (errorRegeneracion) {
            console.error('No se pudo regenerar la sesión tras la configuración inicial:', errorRegeneracion);

            return res.status(500).render('setup/index', {
                layout: false,
                titulo: 'Configuración inicial',
                error: 'El administrador fue creado, pero no se pudo iniciar sesión automáticamente. Ingresa desde la pantalla de login.',
                valores: {
                    nombre: req.body.nombre || '',
                    correo: req.body.correo || '',
                },
            });
        }

        req.session.usuario = resultado.usuario;

        return req.session.save((errorGuardado) => {
            if (errorGuardado) {
                console.error('No se pudo guardar la sesión tras la configuración inicial:', errorGuardado);

                return res.status(500).render('setup/index', {
                    layout: false,
                    titulo: 'Configuración inicial',
                    error: 'El administrador fue creado, pero no se pudo guardar la sesión. Ingresa desde la pantalla de login.',
                    valores: {
                        nombre: req.body.nombre || '',
                        correo: req.body.correo || '',
                    },
                });
            }

            return res.redirect('/dashboard');
        });
    });
}

module.exports = {
    mostrarSetup,
    procesarSetup,
};