const ventasRepository = require('./ventas.repository');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarNumero(valor, defecto = 0) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return defecto;
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

function prepararTurno(turno) {
    if (!turno) {
        return null;
    }

    return {
        ...turno,
        monto_inicial: normalizarEntero(turno.monto_inicial),
        total_ventas: normalizarEntero(turno.total_ventas),
        total_efectivo: normalizarEntero(turno.total_efectivo),
        total_transferencia: normalizarEntero(turno.total_transferencia),
        total_tarjeta: normalizarEntero(turno.total_tarjeta),
        total_otros: normalizarEntero(turno.total_otros),
        total_ingresos_manuales: normalizarEntero(turno.total_ingresos_manuales),
        total_egresos_manuales: normalizarEntero(turno.total_egresos_manuales),
        monto_esperado: normalizarEntero(turno.monto_esperado),
    };
}

function prepararConfiguracion(configuracion) {
    if (!configuracion) {
        return null;
    }

    return {
        ...configuracion,
        impuesto_por_defecto: normalizarEntero(configuracion.impuesto_por_defecto),
        maneja_iva: normalizarEntero(configuracion.maneja_iva),
        iva_incluido_en_precio: normalizarEntero(configuracion.iva_incluido_en_precio),
        porcentaje_iva_defecto: normalizarEntero(configuracion.porcentaje_iva_defecto),
    };
}

function prepararCliente(cliente) {
    if (!cliente) {
        return null;
    }

    return {
        ...cliente,
        es_consumidor_final: normalizarEntero(cliente.es_consumidor_final),
    };
}

function prepararMedioPago(medioPago) {
    return {
        ...medioPago,
        requiere_referencia: normalizarEntero(medioPago.requiere_referencia),
        afecta_efectivo_caja: normalizarEntero(medioPago.afecta_efectivo_caja),
        activo: normalizarEntero(medioPago.activo),
        orden: normalizarEntero(medioPago.orden),
    };
}

function agruparMediosPago(mediosPago) {
    const grupos = {
        efectivo: [],
        transferencias: [],
        tarjetas: [],
        otros: [],
    };

    for (const medioPago of mediosPago) {
        if (medioPago.tipo === 'efectivo') {
            grupos.efectivo.push(medioPago);
            continue;
        }

        if (medioPago.tipo === 'transferencia') {
            grupos.transferencias.push(medioPago);
            continue;
        }

        if (medioPago.tipo === 'tarjeta') {
            grupos.tarjetas.push(medioPago);
            continue;
        }

        grupos.otros.push(medioPago);
    }

    return grupos;
}

function prepararProductoParaVenta(producto) {
    const stockActual = normalizarNumero(producto.stock_actual);
    const stockReservado = normalizarNumero(producto.stock_reservado);
    const stockDisponible = stockActual - stockReservado;

    const controlaInventario = normalizarEntero(producto.controla_inventario);
    const permiteVentaSinStock = normalizarEntero(producto.permite_venta_sin_stock);

    const permiteCantidadDecimal =
        normalizarEntero(producto.permite_cantidad_decimal) === 1
        || normalizarEntero(producto.venta_fraccionada_habilitada) === 1
        || normalizarEntero(producto.unidad_permite_decimales) === 1;

    const manejaIva = normalizarEntero(producto.maneja_iva);
    const porcentajeIva = normalizarEntero(producto.porcentaje_iva);
    const precioIncluyeIva = normalizarEntero(producto.precio_incluye_iva);

    const precioVenta = normalizarEntero(producto.precio_venta);
    const precioCosto = normalizarEntero(
        producto.costo_promedio || producto.ultimo_costo || producto.precio_costo
    );

    const puedeVender =
        controlaInventario === 0
        || permiteVentaSinStock === 1
        || stockDisponible > 0;

    return {
        ...producto,

        precio_costo: normalizarEntero(producto.precio_costo),
        precio_venta: precioVenta,
        costo_promedio: normalizarEntero(producto.costo_promedio),
        ultimo_costo: normalizarEntero(producto.ultimo_costo),
        precio_costo_referencia: precioCosto,

        stock_actual: stockActual,
        stock_reservado: stockReservado,
        stock_disponible: stockDisponible,
        stock_minimo: normalizarNumero(producto.stock_minimo),

        controla_inventario: controlaInventario,
        permite_venta_sin_stock: permiteVentaSinStock,
        permite_cantidad_decimal: permiteCantidadDecimal ? 1 : 0,
        venta_fraccionada_habilitada: normalizarEntero(producto.venta_fraccionada_habilitada),

        unidad_nombre: producto.unidad_nombre || 'Unidad',
        unidad_abreviatura: producto.unidad_abreviatura || 'und',
        unidad_permite_decimales: normalizarEntero(producto.unidad_permite_decimales),

        maneja_iva: manejaIva,
        porcentaje_iva: porcentajeIva,
        precio_incluye_iva: precioIncluyeIva,

        puede_vender: puedeVender,
        estado_venta: puedeVender ? 'disponible' : 'sin_stock',
    };
}

function prepararVentaReciente(venta) {
    return {
        ...venta,
        subtotal: normalizarEntero(venta.subtotal),
        descuento_total: normalizarEntero(venta.descuento_total),
        impuesto_total: normalizarEntero(venta.impuesto_total),
        total: normalizarEntero(venta.total),
        total_pagado: normalizarEntero(venta.total_pagado),
        saldo_pendiente: normalizarEntero(venta.saldo_pendiente),
        cambio_entregado: normalizarEntero(venta.cambio_entregado),
    };
}

function obtenerCarritoInicial() {
    return {
        items: [],
        resumen: {
            cantidad_items: 0,
            subtotal: 0,
            descuento_total: 0,
            impuesto_total: 0,
            total: 0,
            total_costo: 0,
            utilidad_bruta: 0,
        },
        pagos: [],
        total_pagado: 0,
        saldo_pendiente: 0,
        cambio_entregado: 0,
    };
}

function obtenerEstadoPOS({ busqueda = '' } = {}) {
    const turnoAbierto = prepararTurno(ventasRepository.obtenerTurnoAbierto());
    const configuracion = prepararConfiguracion(
        ventasRepository.obtenerConfiguracionNegocio()
    );

    const clienteConsumidorFinal = prepararCliente(
        ventasRepository.obtenerClienteConsumidorFinal()
    );

    const mediosPago = ventasRepository
        .listarMediosPagoActivos()
        .map(prepararMedioPago);

    const mediosPagoAgrupados = agruparMediosPago(mediosPago);

    const productos = ventasRepository
        .buscarProductosParaVenta({
            busqueda: limpiarTexto(busqueda),
            limite: 30,
        })
        .map(prepararProductoParaVenta);

    const ventasRecientes = ventasRepository
        .listarVentasRecientes(10)
        .map(prepararVentaReciente);

    return {
        turnoAbierto,
        configuracion,
        clienteConsumidorFinal,
        mediosPago,
        mediosPagoAgrupados,
        productos,
        ventasRecientes,
        carrito: obtenerCarritoInicial(),
        busqueda: limpiarTexto(busqueda),
        puedeVender: Boolean(turnoAbierto),
        mensajeBloqueo: turnoAbierto
            ? null
            : 'Debes abrir caja antes de registrar ventas.',
    };
}

function buscarProductos({ busqueda = '', limite = 30 } = {}) {
    return ventasRepository
        .buscarProductosParaVenta({
            busqueda: limpiarTexto(busqueda),
            limite,
        })
        .map(prepararProductoParaVenta);
}

function obtenerProductoParaVenta(idProducto) {
    const id = Number(idProducto);

    if (!Number.isInteger(id) || id <= 0) {
        return {
            ok: false,
            mensaje: 'El producto solicitado no es válido.',
        };
    }

    const producto = ventasRepository.obtenerProductoParaVenta(id);

    if (!producto) {
        return {
            ok: false,
            mensaje: 'No se encontró el producto o no está activo.',
        };
    }

    return {
        ok: true,
        producto: prepararProductoParaVenta(producto),
    };
}

module.exports = {
    obtenerEstadoPOS,
    buscarProductos,
    obtenerProductoParaVenta,
    obtenerCarritoInicial,
    prepararProductoParaVenta,
    agruparMediosPago,
};