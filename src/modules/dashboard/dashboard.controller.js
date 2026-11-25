const dashboardService = require('./dashboard.service');
const ivaNegocio = require('../configuracion/iva-negocio');

const estilosDashboard = ['/css/modules/dashboard.css'];

function mostrarDashboard(req, res, next) {
    try {
        const dashboard = dashboardService.obtenerDashboardOperativo();

        return res.render('dashboard/index', {
            titulo: 'Inicio',
            dashboard,
            // Mientras el negocio no diga si es responsable de IVA, el Inicio lo pide
            ivaPorDefinir: !ivaNegocio.estadoIvaNegocio().definido,
            estilosModulo: estilosDashboard,
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    mostrarDashboard,
};