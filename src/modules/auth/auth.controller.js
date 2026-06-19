const authService = require('./auth.service');

function mostrarLogin(req, res) {
    if (req.session?.usuario) {
        return res.redirect('/dashboard');
    }

    return res.render('auth/login', {
        layout: false,
        titulo: 'Iniciar sesión',
        error: null,
        valores: {
            correo: '',
        },
    });
}

function procesarLogin(req, res) {
    const correoFormulario = req.body.correo || '';

    const resultado = authService.iniciarSesion({
        correo: req.body.correo,
        contrasena: req.body.contrasena,
    });

    if (!resultado.ok) {
        return res.status(401).render('auth/login', {
            layout: false,
            titulo: 'Iniciar sesión',
            error: resultado.mensaje,
            valores: {
                correo: correoFormulario,
            },
        });
    }

    return req.session.regenerate((errorRegeneracion) => {
        if (errorRegeneracion) {
            console.error('No se pudo regenerar la sesión tras el login:', errorRegeneracion);

            return res.status(500).render('auth/login', {
                layout: false,
                titulo: 'Iniciar sesión',
                error: 'No se pudo iniciar sesión de forma segura. Intenta nuevamente.',
                valores: {
                    correo: correoFormulario,
                },
            });
        }

        req.session.usuario = resultado.usuario;

        return req.session.save((errorGuardado) => {
            if (errorGuardado) {
                console.error('No se pudo guardar la sesión tras el login:', errorGuardado);

                return res.status(500).render('auth/login', {
                    layout: false,
                    titulo: 'Iniciar sesión',
                    error: 'No se pudo guardar la sesión. Intenta nuevamente.',
                    valores: {
                        correo: correoFormulario,
                    },
                });
            }

            return res.redirect('/dashboard');
        });
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