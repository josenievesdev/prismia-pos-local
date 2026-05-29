const empresa = require('../config/empresa');

function errorMiddleware(error, req, res, next) {
  console.error('Error interno:', error);

  const statusCode = error.statusCode || 500;

  if (res.headersSent) {
    return next(error);
  }

  return res.status(statusCode).render('layouts/main', {
    layout: false,
    titulo: 'Error interno',
    empresa,
    contenido: `
      <section class="page-card">
        <h1>Error ${statusCode}</h1>
        <p>Ocurrió un error inesperado en el sistema.</p>
        <p class="text-muted">Revisa la consola del servidor para más detalles.</p>
        <a href="/dashboard" class="btn-primary">Volver al dashboard</a>
      </section>
    `,
  });
}

module.exports = errorMiddleware;