const ventasService = require('./ventas.service');

const estilosVentas = ['/css/modules/ventas.css'];

function mostrarPOS(req, res) {
    const estadoPOS = ventasService.obtenerEstadoPOS({
        busqueda: req.query.busqueda || '',
    });

    return res.render('ventas/index', {
        titulo: 'Ventas',
        turnoAbierto: estadoPOS.turnoAbierto,
        configuracion: estadoPOS.configuracion,
        clienteConsumidorFinal: estadoPOS.clienteConsumidorFinal,
        mediosPago: estadoPOS.mediosPago,
        mediosPagoAgrupados: estadoPOS.mediosPagoAgrupados,
        productos: estadoPOS.productos,
        ventasRecientes: estadoPOS.ventasRecientes,
        carrito: estadoPOS.carrito,
        busqueda: estadoPOS.busqueda,
        puedeVender: estadoPOS.puedeVender,
        mensajeBloqueo: estadoPOS.mensajeBloqueo,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosVentas,
    });
}

function buscarProductos(req, res) {
    const productos = ventasService.buscarProductos({
        busqueda: req.query.busqueda || '',
        limite: 30,
    });

    return res.json({
        ok: true,
        productos,
    });
}

function obtenerProducto(req, res) {
    const resultado = ventasService.obtenerProductoParaVenta(req.params.id);

    if (!resultado.ok) {
        return res.status(404).json({
            ok: false,
            mensaje: resultado.mensaje,
        });
    }

    return res.json({
        ok: true,
        producto: resultado.producto,
    });
}

module.exports = {
    mostrarPOS,
    buscarProductos,
    obtenerProducto,
};