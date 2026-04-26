function mostrarDashboard(req, res) {
    res.render('dashboard/index', {
        titulo: 'Dashboard',
    });
}

module.exports = {
    mostrarDashboard,
};