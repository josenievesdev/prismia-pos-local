const dashboardRepository = require('./dashboard.repository');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarEntero(valor) {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return Math.round(numero);
}

function normalizarNumero(valor) {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return numero;
}

function obtenerFechaISO(offsetDias = 0) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + offsetDias);

    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}

function calcularVariacionPorcentual(actual, anterior) {
    const valorActual = normalizarEntero(actual);
    const valorAnterior = normalizarEntero(anterior);

    if (valorAnterior === 0 && valorActual === 0) {
        return 0;
    }

    if (valorAnterior === 0) {
        return 100;
    }

    return Number((((valorActual - valorAnterior) / valorAnterior) * 100).toFixed(1));
}

function prepararResumenVentas(resumen = {}, productos = {}) {
    return {
        total_documentos: normalizarEntero(resumen.total_documentos),
        ventas_pagadas: normalizarEntero(resumen.ventas_pagadas),
        ventas_anuladas: normalizarEntero(resumen.ventas_anuladas),
        total_bruto: normalizarEntero(resumen.total_bruto),
        total_neto: normalizarEntero(resumen.total_neto),
        total_anulado: normalizarEntero(resumen.total_anulado),
        ticket_promedio: normalizarEntero(resumen.ticket_promedio),
        utilidad_bruta: normalizarEntero(resumen.utilidad_bruta),
        productos_vendidos: normalizarNumero(productos.productos_vendidos),
    };
}

function prepararPagoPorMedio(item = {}) {
    return {
        medio_pago_nombre: limpiarTexto(item.medio_pago_nombre) || 'Sin medio',
        medio_pago_tipo: limpiarTexto(item.medio_pago_tipo) || 'otro',
        afecta_efectivo_caja: normalizarEntero(item.afecta_efectivo_caja),
        operaciones: normalizarEntero(item.operaciones),
        ingresos: normalizarEntero(item.ingresos),
        anulaciones: normalizarEntero(item.anulaciones),
        salidas: normalizarEntero(item.salidas),
        neto: normalizarEntero(item.neto),
    };
}

function prepararTurnoActual(turno) {
    if (!turno) {
        return {
            abierto: false,
            mensaje: 'No hay turno de caja abierto.',
            pagos_por_medio: [],
        };
    }

    const resumen = dashboardRepository.obtenerResumenMovimientosTurno(turno.id_turno_caja) || {};
    const pagosPorMedio = dashboardRepository
        .obtenerPagosPorMedioTurno(turno.id_turno_caja)
        .map(prepararPagoPorMedio);

    const efectivoNeto = normalizarEntero(resumen.efectivo_neto);
    const montoInicial = normalizarEntero(turno.monto_inicial);

    return {
        abierto: true,
        id_turno_caja: normalizarEntero(turno.id_turno_caja),
        usuario_apertura_nombre: limpiarTexto(turno.usuario_apertura_nombre) || 'Sin usuario',
        fecha_apertura: limpiarTexto(turno.fecha_apertura),
        monto_inicial: montoInicial,
        ventas_turno: normalizarEntero(resumen.ventas_turno),
        anulaciones_turno: normalizarEntero(resumen.anulaciones_turno),
        ingresos_manuales: normalizarEntero(resumen.ingresos_manuales),
        egresos_manuales: normalizarEntero(resumen.egresos_manuales),
        efectivo_neto: efectivoNeto,
        efectivo_esperado: montoInicial + efectivoNeto,
        pagos_por_medio: pagosPorMedio,
    };
}

function prepararAlertaStock(item = {}) {
    return {
        id_producto: normalizarEntero(item.id_producto),
        codigo_interno: limpiarTexto(item.codigo_interno) || 'Sin código',
        nombre: limpiarTexto(item.nombre) || 'Producto',
        stock_actual: normalizarNumero(item.stock_actual),
        stock_minimo: normalizarNumero(item.stock_minimo),
        tipo_alerta: limpiarTexto(item.tipo_alerta) || 'stock_bajo',
    };
}

function prepararResumenStock(resumen = {}) {
    return {
        productos_sin_stock: normalizarEntero(resumen.productos_sin_stock),
        productos_stock_bajo: normalizarEntero(resumen.productos_stock_bajo),
    };
}

function prepararVenta(item = {}) {
    return {
        id_venta: normalizarEntero(item.id_venta),
        numero_venta: limpiarTexto(item.numero_venta),
        fecha_venta: limpiarTexto(item.fecha_venta),
        estado: limpiarTexto(item.estado),
        total: normalizarEntero(item.total),
        cliente_nombre: limpiarTexto(item.cliente_nombre) || 'Consumidor final',
        medios_pago: limpiarTexto(item.medios_pago) || 'Sin pago registrado',
    };
}

function prepararAnulacion(item = {}) {
    return {
        id_venta: normalizarEntero(item.id_venta),
        numero_venta: limpiarTexto(item.numero_venta),
        fecha_anulacion: limpiarTexto(item.fecha_anulacion),
        total: normalizarEntero(item.total),
        motivo_anulacion: limpiarTexto(item.motivo_anulacion) || 'Sin motivo registrado',
        usuario_anulacion: limpiarTexto(item.usuario_anulacion) || 'Sin usuario',
    };
}

function prepararTopProducto(item = {}) {
    return {
        codigo_interno: limpiarTexto(item.codigo_interno) || 'Sin código',
        nombre_producto: limpiarTexto(item.nombre_producto) || 'Producto',
        unidad_abreviatura: limpiarTexto(item.unidad_abreviatura) || 'und',
        cantidad_vendida: normalizarNumero(item.cantidad_vendida),
        total_vendido: normalizarEntero(item.total_vendido),
    };
}

function prepararVentaHora(item = {}) {
    return {
        hora: limpiarTexto(item.hora) || '00:00',
        ventas: normalizarEntero(item.ventas),
        total: normalizarEntero(item.total),
    };
}

function obtenerDashboardOperativo() {
    const fechaHoy = obtenerFechaISO(0);
    const fechaAyer = obtenerFechaISO(-1);

    const resumenHoy = prepararResumenVentas(
        dashboardRepository.obtenerResumenVentasPorFecha(fechaHoy),
        dashboardRepository.obtenerProductosVendidosPorFecha(fechaHoy)
    );

    const resumenAyer = prepararResumenVentas(
        dashboardRepository.obtenerResumenVentasPorFecha(fechaAyer),
        dashboardRepository.obtenerProductosVendidosPorFecha(fechaAyer)
    );

    const turno = prepararTurnoActual(dashboardRepository.obtenerTurnoAbierto());
    const resumenStock = prepararResumenStock(dashboardRepository.obtenerResumenStock());

    return {
        fecha_hoy: fechaHoy,
        fecha_ayer: fechaAyer,

        resumen_hoy: resumenHoy,
        resumen_ayer: resumenAyer,

        comparacion: {
            total_neto_porcentaje: calcularVariacionPorcentual(
                resumenHoy.total_neto,
                resumenAyer.total_neto
            ),
            ventas_pagadas_porcentaje: calcularVariacionPorcentual(
                resumenHoy.ventas_pagadas,
                resumenAyer.ventas_pagadas
            ),
            ticket_promedio_porcentaje: calcularVariacionPorcentual(
                resumenHoy.ticket_promedio,
                resumenAyer.ticket_promedio
            ),
        },

        turno_actual: turno,

        pagos_por_medio_hoy: dashboardRepository
            .obtenerPagosPorMedioPorFecha(fechaHoy)
            .map(prepararPagoPorMedio),

        stock: resumenStock,

        alertas_stock: dashboardRepository
            .obtenerAlertasStock()
            .map(prepararAlertaStock),

        ultimas_ventas: dashboardRepository
            .obtenerUltimasVentas(fechaHoy)
            .map(prepararVenta),

        ultimas_anulaciones: dashboardRepository
            .obtenerUltimasAnulaciones(fechaHoy)
            .map(prepararAnulacion),

        top_productos: dashboardRepository
            .obtenerTopProductos(fechaHoy)
            .map(prepararTopProducto),

        ventas_por_hora: dashboardRepository
            .obtenerVentasPorHora(fechaHoy)
            .map(prepararVentaHora),
    };
}

module.exports = {
    obtenerDashboardOperativo,
};