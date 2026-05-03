const notasCreditoRepository = require('./notasCredito.repository');

function crearError(mensaje, codigoEstado = 400) {
    return {
        ok: false,
        mensaje,
        codigoEstado,
    };
}

function normalizarEntero(valor, defecto = 0) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return defecto;
    }

    return Math.round(numero);
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
    };
}

function prepararDetalleNotaCredito(detalle = []) {
    return detalle.map((item) => ({
        ...item,
        cantidad: Number(item.cantidad || 0),
        precio_unitario: normalizarEntero(item.precio_unitario),
        precio_costo_unitario: normalizarEntero(item.precio_costo_unitario),
        descuento_unitario: normalizarEntero(item.descuento_unitario),
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

function obtenerNotaCreditoPorVenta(idVenta) {
    const notaCredito = notasCreditoRepository.obtenerNotaCreditoPorVenta(idVenta);

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
        ultimasNotasCredito: notasCreditoRepository.listarUltimasNotasCredito(10),
    };
}

module.exports = {
    obtenerSiguienteNotaCredito,
    obtenerNotaCreditoPorVenta,
    obtenerResumenNotasCredito,
};