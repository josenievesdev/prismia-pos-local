const reportesRepository = require('./reportes.repository');

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

function obtenerFechaLocalISO() {
    const fecha = new Date();
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}

function obtenerFechaInicioMesISO() {
    const fecha = new Date();
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');

    return `${yyyy}-${mm}-01`;
}

function normalizarFiltros(query = {}) {
    return {
        fecha_desde: limpiarTexto(query.fecha_desde) || obtenerFechaInicioMesISO(),
        fecha_hasta: limpiarTexto(query.fecha_hasta) || obtenerFechaLocalISO(),
    };
}

function prepararResumenVentas(resumen = {}) {
    const totalBruto = normalizarEntero(resumen.total_bruto);
    const totalNeto = normalizarEntero(resumen.total_neto);
    const totalAnulado = normalizarEntero(resumen.total_anulado);
    const utilidad = normalizarEntero(resumen.utilidad_bruta_neta);

    return {
        total_facturas: normalizarEntero(resumen.total_facturas),
        facturas_pagadas: normalizarEntero(resumen.facturas_pagadas),
        facturas_anuladas: normalizarEntero(resumen.facturas_anuladas),

        subtotal_bruto: normalizarEntero(resumen.subtotal_bruto),
        iva_bruto: normalizarEntero(resumen.iva_bruto),
        descuento_bruto: normalizarEntero(resumen.descuento_bruto),
        total_bruto: totalBruto,

        subtotal_neto: normalizarEntero(resumen.subtotal_neto),
        iva_neto: normalizarEntero(resumen.iva_neto),
        descuento_neto: normalizarEntero(resumen.descuento_neto),
        total_neto: totalNeto,

        subtotal_anulado: normalizarEntero(resumen.subtotal_anulado),
        iva_anulado: normalizarEntero(resumen.iva_anulado),
        descuento_anulado: normalizarEntero(resumen.descuento_anulado),
        total_anulado: totalAnulado,

        costo_neto: normalizarEntero(resumen.costo_neto),
        utilidad_bruta_neta: utilidad,

        margen_bruto_porcentaje: totalNeto > 0
            ? Number(((utilidad / totalNeto) * 100).toFixed(2))
            : 0,

        porcentaje_anulado: totalBruto > 0
            ? Number(((totalAnulado / totalBruto) * 100).toFixed(2))
            : 0,
    };
}

function prepararResumenNotasCredito(resumen = {}) {
    return {
        total_notas_credito: normalizarEntero(resumen.total_notas_credito),
        subtotal_notas_credito: normalizarEntero(resumen.subtotal_notas_credito),
        iva_notas_credito: normalizarEntero(resumen.iva_notas_credito),
        total_notas_credito_valor: normalizarEntero(resumen.total_notas_credito_valor),
    };
}

function prepararPagoMedio(item = {}) {
    return {
        medio_pago_nombre: limpiarTexto(item.medio_pago_nombre) || 'Sin medio',
        medio_pago_tipo: limpiarTexto(item.medio_pago_tipo) || 'otro',
        afecta_efectivo_caja: normalizarEntero(item.afecta_efectivo_caja),
        operaciones: normalizarEntero(item.operaciones),
        ingresos: normalizarEntero(item.ingresos),
        anulaciones: normalizarEntero(item.anulaciones),
        neto: normalizarEntero(item.neto),
    };
}

function prepararIva(item = {}) {
    return {
        porcentaje_iva: normalizarEntero(item.porcentaje_iva),
        subtotal_bruto: normalizarEntero(item.subtotal_bruto),
        iva_bruto: normalizarEntero(item.iva_bruto),
        total_bruto: normalizarEntero(item.total_bruto),
        subtotal_neto: normalizarEntero(item.subtotal_neto),
        iva_neto: normalizarEntero(item.iva_neto),
        total_neto: normalizarEntero(item.total_neto),
        subtotal_anulado: normalizarEntero(item.subtotal_anulado),
        iva_anulado: normalizarEntero(item.iva_anulado),
        total_anulado: normalizarEntero(item.total_anulado),
    };
}

function prepararProducto(item = {}) {
    return {
        codigo_interno: limpiarTexto(item.codigo_interno) || 'Sin código',
        nombre_producto: limpiarTexto(item.nombre_producto) || 'Producto',
        unidad_abreviatura: limpiarTexto(item.unidad_abreviatura) || 'und',
        cantidad_vendida: normalizarNumero(item.cantidad_vendida),
        subtotal_neto: normalizarEntero(item.subtotal_neto),
        iva_neto: normalizarEntero(item.iva_neto),
        total_neto: normalizarEntero(item.total_neto),
        costo_neto: normalizarEntero(item.costo_neto),
        utilidad_bruta: normalizarEntero(item.utilidad_bruta),
    };
}

function prepararVentaReciente(item = {}) {
    return {
        id_venta: normalizarEntero(item.id_venta),
        numero_venta: limpiarTexto(item.numero_venta),
        fecha_venta: limpiarTexto(item.fecha_venta),
        estado: limpiarTexto(item.estado),
        tipo_venta: limpiarTexto(item.tipo_venta),
        subtotal: normalizarEntero(item.subtotal),
        impuesto_total: normalizarEntero(item.impuesto_total),
        total: normalizarEntero(item.total),
        total_costo: normalizarEntero(item.total_costo),
        utilidad_bruta: normalizarEntero(item.utilidad_bruta),
        cliente_nombre: limpiarTexto(item.cliente_nombre) || 'Consumidor final',
        medios_pago: limpiarTexto(item.medios_pago) || 'Sin pago registrado',
    };
}

function obtenerReporteComercial({ query = {} } = {}) {
    const filtros = normalizarFiltros(query);

    const resumenVentas = prepararResumenVentas(
        reportesRepository.obtenerResumenVentas(filtros)
    );

    const resumenNotasCredito = prepararResumenNotasCredito(
        reportesRepository.obtenerResumenNotasCredito(filtros)
    );

    const resumenPagosPorMedio = reportesRepository
        .obtenerResumenPagosPorMedio(filtros)
        .map(prepararPagoMedio);

    const ivaPorTarifa = reportesRepository
        .obtenerIvaPorTarifa(filtros)
        .map(prepararIva);

    const productosMasVendidos = reportesRepository
        .obtenerProductosMasVendidos(filtros)
        .map(prepararProducto);

    const ventasRecientes = reportesRepository
        .obtenerVentasRecientes(filtros)
        .map(prepararVentaReciente);

    return {
        ok: true,
        filtros,
        resumenVentas,
        resumenNotasCredito,
        resumenPagosPorMedio,
        ivaPorTarifa,
        productosMasVendidos,
        ventasRecientes,
    };
}

module.exports = {
    obtenerReporteComercial,
};