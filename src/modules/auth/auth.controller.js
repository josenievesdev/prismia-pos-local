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
                correo: req.body.correo || '',
            },
        });
    }

    req.session.usuario = resultado.usuario;

    return res.redirect('/dashboard');
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