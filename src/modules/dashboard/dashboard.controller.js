const dashboardService = require('./dashboard.service');

const estilosDashboard = ['/css/modules/dashboard.css'];

function mostrarDashboard(req, res, next) {
    try {
        const dashboard = dashboardService.obtenerDashboardOperativo();

        return res.render('dashboard/index', {
            titulo: 'Dashboard',
            dashboard,
            estilosModulo: estilosDashboard,
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    mostrarDashboard,
};