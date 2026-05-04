const reportesService = require('./reportes.service');

const estilosReportes = ['/css/modules/reportes.css'];

function mostrarReportes(req, res) {
    const reporte = reportesService.obtenerReporteComercial({
        query: req.query || {},
    });

    return res.render('reportes/index', {
        titulo: 'Reportes',
        filtros: reporte.filtros,
        resumenVentas: reporte.resumenVentas,
        resumenNotasCredito: reporte.resumenNotasCredito,
        resumenPagosPorMedio: reporte.resumenPagosPorMedio,
        ivaPorTarifa: reporte.ivaPorTarifa,
        productosMasVendidos: reporte.productosMasVendidos,
        ventasRecientes: reporte.ventasRecientes,
        estilosModulo: estilosReportes,
    });
}

module.exports = {
    mostrarReportes,
};