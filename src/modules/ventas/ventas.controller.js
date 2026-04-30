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

function mostrarHistorial(req, res) {
    const historial = ventasService.obtenerHistorialVentas({
        query: req.query || {},
    });

    return res.render('ventas/historial', {
        titulo: 'Historial de ventas',
        filtros: historial.filtros,
        ventas: historial.ventas,
        mediosPago: historial.mediosPago,
        cajeros: historial.cajeros,
        turnos: historial.turnos,
        totalResultados: historial.total_resultados,
        limiteResultados: historial.limite_resultados,
        paginaActual: historial.pagina_actual,
        totalPaginas: historial.total_paginas,
        tienePaginaAnterior: historial.tiene_pagina_anterior,
        tienePaginaSiguiente: historial.tiene_pagina_siguiente,
        paginaAnterior: historial.pagina_anterior,
        paginaSiguiente: historial.pagina_siguiente,
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

function buscarClientes(req, res) {
    const clientes = ventasService.buscarClientes({
        busqueda: req.query.busqueda || '',
        limite: 10,
    });

    return res.json({
        ok: true,
        clientes,
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

function obtenerIdUsuarioAutenticado(req) {
    return (
        req.session?.usuario?.id_usuario
        || req.session?.usuario?.id
        || req.session?.user?.id_usuario
        || req.user?.id_usuario
        || null
    );
}

function registrarVenta(req, res) {
    const resultado = ventasService.registrarVentaPOS({
        idUsuario: obtenerIdUsuarioAutenticado(req),
        payload: req.body || {},
    });

    if (!resultado.ok) {
        return res.status(resultado.codigoEstado || 400).json(resultado);
    }

    return res.status(201).json(resultado);
}

function imprimirTicket(req, res) {
    const resultado = ventasService.obtenerTicketVenta(req.params.id);

    if (!resultado.ok) {
        return res.status(404).send(resultado.mensaje);
    }

    return res.render('ventas/ticket', {
        layout: false,
        titulo: `Ticket ${resultado.ticket.comprobante.numero}`,
        ticket: resultado.ticket,
    });
}

module.exports = {
    mostrarPOS,
    mostrarHistorial,
    buscarProductos,
    buscarClientes,
    obtenerProducto,
    registrarVenta,
    imprimirTicket,
};