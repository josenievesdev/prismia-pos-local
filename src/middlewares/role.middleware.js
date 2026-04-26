function requiereRol(...rolesPermitidos) {
    return (req, res, next) => {
        const usuario = req.session?.usuario;

        if (!usuario) {
            return res.redirect('/auth/login');
        }

        const rolesUsuario = Array.isArray(usuario.roles)
            ? usuario.roles
            : [usuario.rol_principal].filter(Boolean);

        const tienePermiso = rolesUsuario.some((rol) =>
            rolesPermitidos.includes(rol)
        );

        if (!tienePermiso) {
            return res.status(403).render('layouts/main', {
                layout: false,
                titulo: 'Acceso denegado',
                contenido: `
          <section class="page-card">
            <h1>Acceso denegado</h1>
            <p>No tienes permisos para entrar a esta sección.</p>
            <a href="/dashboard" class="btn-primary">Volver al dashboard</a>
          </section>
        `,
            });
        }

        next();
    };
}

module.exports = {
    requiereRol,
};