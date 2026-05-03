const notasCreditoRepository = require('./notasCredito.repository');

function crearError(mensaje, codigoEstado = 400) {
    return {
        ok: false,
        mensaje,
        codigoEstado,
    };
}

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarId(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

function normalizarEntero(valor, defecto = 0) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return defecto;
    }

    return Math.round(numero);
}

function normalizarNumero(valor, defecto = 0) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return defecto;
    }

    return numero;
}

function construirClienteEtiqueta(notaCredito) {
    if (!notaCredito) {
        return 'Sin cliente';
    }

    const tipoDocumento = limpiarTexto(notaCredito.cliente_tipo_documento);
    const documento = limpiarTexto(notaCredito.cliente_documento);
    const digitoVerificacion = limpiarTexto(notaCredito.cliente_digito_verificacion);

    if (!documento) {
        return 'Consumidor final';
    }

    if (digitoVerificacion) {
        return `${tipoDocumento || 'Doc'} ${documento}-${digitoVerificacion}`;
    }

    return `${tipoDocumento || 'Doc'} ${documento}`;
}

function prepararNotaCredito(notaCredito) {
    if (!notaCredito) {
        return null;
    }

    return {
        ...notaCredito,
        subtotal: normalizarEntero(notaCredito.subtotal),
        descuento_total: normalizarEntero(notaCredito.descuento_total),
        impuesto_total: normalizarEntero(notaCredito.impuesto_total),
        total: normalizarEntero(notaCredito.total),
        venta_total: normalizarEntero(notaCredito.venta_total),
        venta_total_pagado: normalizarEntero(notaCredito.venta_total_pagado),
        venta_cambio_entregado: normalizarEntero(notaCredito.venta_cambio_entregado),
        cliente_nombre_mostrar: limpiarTexto(notaCredito.cliente_nombre_mostrar) || 'Consumidor final',
        cliente_etiqueta: construirClienteEtiqueta(notaCredito),
    };
}

function prepararDetalleNotaCredito(detalle = []) {
    return detalle.map((item) => ({
        ...item,
        cantidad: normalizarNumero(item.cantidad),
        precio_unitario: normalizarEntero(item.precio_unitario),
        precio_costo_unitario: normalizarEntero(item.precio_costo_unitario),
        descuento_unitario: normalizarEntero(item.descuento_unitario),
        porcentaje_iva: normalizarEntero(item.porcentaje_iva),
        impuesto_unitario: normalizarEntero(item.impuesto_unitario),
        impuesto_total: normalizarEntero(item.impuesto_total),
        subtotal: normalizarEntero(item.subtotal),
        total_linea: normalizarEntero(item.total_linea),
        costo_total: normalizarEntero(item.costo_total),
    }));
}

function obtenerSiguienteNotaCredito() {
    const siguienteNotaCredito = notasCreditoRepository.obtenerNumeracionNotaCredito();

    if (!siguienteNotaCredito) {
        return crearError('No existe numeración activa para notas crédito internas.', 404);
    }

    return {
        ok: true,
        siguienteNotaCredito,
    };
}

function obtenerListadoNotasCredito({ query = {} } = {}) {
    const pagina = Math.max(1, normalizarEntero(query.pagina, 1));

    const limite = [10, 20, 50].includes(normalizarEntero(query.limite))
        ? normalizarEntero(query.limite)
        : 20;

    const filtros = {
        busqueda: limpiarTexto(query.busqueda),
        estado: limpiarTexto(query.estado),
        documento_fiscal_estado: limpiarTexto(query.documento_fiscal_estado),
        fecha_desde: limpiarTexto(query.fecha_desde),
        fecha_hasta: limpiarTexto(query.fecha_hasta),
        limite,
        offset: (pagina - 1) * limite,
    };

    const totalResultados = notasCreditoRepository.contarNotasCreditoListado(filtros);
    const totalPaginas = Math.max(1, Math.ceil(totalResultados / limite));
    const paginaActual = Math.min(pagina, totalPaginas);

    filtros.offset = (paginaActual - 1) * limite;

    const notasCredito = notasCreditoRepository
        .listarNotasCredito(filtros)
        .map(prepararNotaCredito);

    return {
        ok: true,
        filtros,
        notasCredito,
        total_resultados: totalResultados,
        pagina_actual: paginaActual,
        total_paginas: totalPaginas,
        limite_resultados: limite,
        tiene_pagina_anterior: paginaActual > 1,
        tiene_pagina_siguiente: paginaActual < totalPaginas,
        pagina_anterior: paginaActual > 1 ? paginaActual - 1 : 1,
        pagina_siguiente: paginaActual < totalPaginas ? paginaActual + 1 : totalPaginas,
    };
}

function obtenerDetalleNotaCredito(idNotaCredito) {
    const id = normalizarId(idNotaCredito);

    if (!id) {
        return crearError('La nota crédito solicitada no es válida.');
    }

    const notaCredito = notasCreditoRepository.obtenerNotaCreditoPorId(id);

    if (!notaCredito) {
        return crearError('No se encontró la nota crédito solicitada.', 404);
    }

    const detalle = notasCreditoRepository.listarDetalleNotaCredito(id);

    return {
        ok: true,
        notaCredito: prepararNotaCredito(notaCredito),
        detalle: prepararDetalleNotaCredito(detalle),
    };
}

function obtenerNotaCreditoPorVenta(idVenta) {
    const id = normalizarId(idVenta);

    if (!id) {
        return {
            ok: true,
            notaCredito: null,
            detalle: [],
        };
    }

    const notaCredito = notasCreditoRepository.obtenerNotaCreditoPorVenta(id);

    if (!notaCredito) {
        return {
            ok: true,
            notaCredito: null,
            detalle: [],
        };
    }

    const detalle = notasCreditoRepository.listarDetalleNotaCredito(
        notaCredito.id_nota_credito
    );

    return {
        ok: true,
        notaCredito: prepararNotaCredito(notaCredito),
        detalle: prepararDetalleNotaCredito(detalle),
    };
}

function obtenerResumenNotasCredito() {
    const siguienteNotaCredito = notasCreditoRepository.obtenerNumeracionNotaCredito();

    return {
        ok: true,
        siguienteNotaCredito,
        totales: {
            ...notasCreditoRepository.contarNotasCredito(),
            ...notasCreditoRepository.contarDetalleNotasCredito(),
        },
        ultimasNotasCredito: notasCreditoRepository
            .listarUltimasNotasCredito(10)
            .map(prepararNotaCredito),
    };
}

module.exports = {
    obtenerSiguienteNotaCredito,
    obtenerListadoNotasCredito,
    obtenerDetalleNotaCredito,
    obtenerNotaCreditoPorVenta,
    obtenerResumenNotasCredito,
};