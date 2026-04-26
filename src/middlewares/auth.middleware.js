function requiereAutenticacion(req, res, next) {
    if (!req.session || !req.session.usuario) {
        return res.redirect('/auth/login');
    }

    next();
}

module.exports = {
    requiereAutenticacion,
};