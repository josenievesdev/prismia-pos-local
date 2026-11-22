/**
 * Inicia sesión regenerando el identificador de sesión.
 *
 * Regenerar evita la fijación de sesión: un identificador obtenido antes de
 * autenticarse deja de ser válido después del login.
 */
function iniciarSesionSegura(req, usuario, callback) {
    req.session.regenerate((errorRegeneracion) => {
        if (errorRegeneracion) {
            return callback(errorRegeneracion);
        }

        req.session.usuario = usuario;

        return req.session.save(callback);
    });
}

module.exports = {
    iniciarSesionSegura,
};
