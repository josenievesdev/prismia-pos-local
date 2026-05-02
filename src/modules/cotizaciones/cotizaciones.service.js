const cotizacionesRepository = require('./cotizaciones.repository');

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

function normalizarId(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

function redondearDinero(valor) {
    return Math.round(normalizarNumero(valor));
}

function redondearCantidad(valor) {
    return Math.round(normalizarNumero(valor) * 1000) / 1000;
}

function tieneParteDecimal(valor) {
    return Math.abs(valor - Math.round(valor)) > 0.000001;
}

function crearError(mensaje, codigoEstado = 400) {
    return {
        ok: false,
        mensaje,
        codigoEstado,
    };
}

function obtenerPrimerValor(objeto, claves, defecto = '') {
    if (!objeto) {
        return defecto;
    }

    for (const clave of claves) {
        const valor = objeto[clave];

        if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
            return String(valor).trim();
        }
    }

    return defecto;
}

function prepararConfiguracionTicket(configuracion) {
    return {
        nombre_comercio: obtenerPrimerValor(
            configuracion,
            [
                'nombre_negocio',
                'nombre_comercio',
                'nombre_empresa',
                'nombre_establecimiento',
                'nombre_comercial',
                'razon_social',
                'nombre',
            ],
            'Comercio sin nombre'
        ),
        razon_social: obtenerPrimerValor(
            configuracion,
            ['razon_social', 'nombre_legal', 'nombre_negocio'],
            ''
        ),
        tipo_documento: obtenerPrimerValor(
            configuracion,
            ['tipo_documento'],
            'NIT'
        ),
        nit: obtenerPrimerValor(
            configuracion,
            ['numero_documento', 'nit', 'documento', 'identificacion'],
            ''
        ),
        telefono: obtenerPrimerValor(
            configuracion,
            ['telefono', 'celular', 'telefono_contacto'],
            ''
        ),
        direccion: obtenerPrimerValor(
            configuracion,
            ['direccion', 'direccion_negocio', 'direccion_comercio'],
            ''
        ),
        correo: obtenerPrimerValor(
            configuracion,
            ['correo', 'email', 'correo_contacto'],
            ''
        ),
        ciudad: obtenerPrimerValor(
            configuracion,
            ['ciudad', 'municipio'],
            ''
        ),
        mensaje_ticket: obtenerPrimerValor(
            configuracion,
            ['mensaje_ticket', 'mensaje_factura', 'mensaje_recibo'],
            'Gracias por su preferencia.'
        ),
        software: 'Prismia POS Local',
    };
}

function obtenerNombreCliente(cliente) {
    return (
        limpiarTexto(cliente?.nombre)
        || limpiarTexto(cliente?.razon_social)
        || limpiarTexto(cliente?.nombre_comercial)
        || `Cliente #${cliente?.id_cliente || ''}`
    );
}

function prepararClienteParaCotizacion(cliente) {
    if (!cliente) {
        return null;
    }

    const tipoDocumento = limpiarTexto(cliente.tipo_documento) || 'CC';
    const documento = limpiarTexto(cliente.documento);

    const telefono = (
        limpiarTexto(cliente.telefono)
        || limpiarTexto(cliente.celular)
    );

    const correo = (
        limpiarTexto(cliente.correo)
        || limpiarTexto(cliente.correo_facturacion)
    );

    return {
        ...cliente,
        nombre_mostrar: obtenerNombreCliente(cliente),
        tipo_documento: tipoDocumento,
        documento,
        telefono_mostrar: telefono,
        correo_mostrar: correo,
        etiqueta_documento: documento ? `${tipoDocumento} ${documento}` : 'Sin documento',
        texto_secundario: [
            documento ? `${tipoDocumento} ${documento}` : null,
            telefono || null,
            correo || null,
        ].filter(Boolean).join(' · '),
        es_consumidor_final: normalizarEntero(cliente.es_consumidor_final),
    };
}

function prepararProductoParaCotizacion(producto) {
    if (!producto) {
        return null;
    }

    const stockActual = normalizarNumero(producto.stock_actual);
    const stockReservado = normalizarNumero(producto.stock_reservado);
    const stockDisponible = stockActual - stockReservado;

    const permiteCantidadDecimal =
        normalizarEntero(producto.permite_cantidad_decimal) === 1
        || normalizarEntero(producto.venta_fraccionada_habilitada) === 1
        || normalizarEntero(producto.unidad_permite_decimales) === 1;

    const precioVenta = normalizarEntero(producto.precio_venta);
    const precioCostoReferencia = normalizarEntero(
        producto.costo_promedio || producto.ultimo_costo || producto.precio_costo
    );

    return {
        ...producto,

        precio_costo: normalizarEntero(producto.precio_costo),
        precio_venta: precioVenta,
        costo_promedio: normalizarEntero(producto.costo_promedio),
        ultimo_costo: normalizarEntero(producto.ultimo_costo),
        precio_costo_referencia: precioCostoReferencia,

        stock_actual: stockActual,
        stock_reservado: stockReservado,
        stock_disponible: stockDisponible,
        stock_minimo: normalizarNumero(producto.stock_minimo),

        controla_inventario: normalizarEntero(producto.controla_inventario),
        permite_venta_sin_stock: normalizarEntero(producto.permite_venta_sin_stock),
        permite_cantidad_decimal: permiteCantidadDecimal ? 1 : 0,
        venta_fraccionada_habilitada: normalizarEntero(producto.venta_fraccionada_habilitada),

        unidad_nombre: limpiarTexto(producto.unidad_nombre) || 'Unidad',
        unidad_abreviatura: limpiarTexto(producto.unidad_abreviatura) || 'und',
        unidad_permite_decimales: normalizarEntero(producto.unidad_permite_decimales),

        maneja_iva: normalizarEntero(producto.maneja_iva),
        porcentaje_iva: normalizarEntero(producto.porcentaje_iva),
        precio_incluye_iva: normalizarEntero(producto.precio_incluye_iva),
    };
}

function prepararNumeracionCotizacion(numeracion) {
    if (!numeracion) {
        return null;
    }

    return {
        ...numeracion,
        longitud_consecutivo: normalizarEntero(numeracion.longitud_consecutivo, 6),
        ultimo_consecutivo: normalizarEntero(numeracion.ultimo_consecutivo),
        siguiente_consecutivo: normalizarEntero(numeracion.siguiente_consecutivo),
        siguiente_numero: limpiarTexto(numeracion.siguiente_numero),
        activo: normalizarEntero(numeracion.activo),
    };
}

function obtenerSiguienteCotizacion() {
    return prepararNumeracionCotizacion(
        cotizacionesRepository.obtenerSiguienteNumeroCotizacion()
    );
}

function buscarClientes({ busqueda = '', limite = 10 } = {}) {
    const termino = limpiarTexto(busqueda);

    if (!termino) {
        return [];
    }

    return cotizacionesRepository
        .buscarClientesParaCotizacion({
            busqueda: termino,
            limite,
        })
        .map(prepararClienteParaCotizacion);
}

function buscarProductos({ busqueda = '', limite = 30 } = {}) {
    return cotizacionesRepository
        .buscarProductosParaCotizacion({
            busqueda: limpiarTexto(busqueda),
            limite,
        })
        .map(prepararProductoParaCotizacion);
}

function obtenerProducto(idProducto) {
    const id = normalizarId(idProducto);

    if (!id) {
        return crearError('El producto solicitado no es válido.');
    }

    const producto = cotizacionesRepository.obtenerProductoPorId(id);

    if (!producto) {
        return crearError('No se encontró el producto o no está activo.', 404);
    }

    return {
        ok: true,
        producto: prepararProductoParaCotizacion(producto),
    };
}

function normalizarValidezDias(valor) {
    const dias = normalizarEntero(valor, 15);

    if (dias < 0) {
        return 15;
    }

    if (dias > 365) {
        return 365;
    }

    return dias;
}

function calcularFechaVencimiento(validezDias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + normalizarValidezDias(validezDias));

    return fecha.toISOString().slice(0, 10);
}

function consolidarItemsCotizacion(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return crearError('Agrega al menos un producto para crear la cotización.');
    }

    const mapa = new Map();

    for (const item of items) {
        const idProducto = normalizarId(item.id_producto);
        const cantidad = normalizarNumero(item.cantidad);
        const descuentoUnitario = Math.max(0, normalizarEntero(item.descuento_unitario));

        if (!idProducto) {
            return crearError('Uno de los productos enviados no es válido.');
        }

        if (cantidad <= 0) {
            return crearError('Todas las cantidades deben ser mayores a cero.');
        }

        const acumulado = mapa.get(idProducto) || {
            id_producto: idProducto,
            cantidad: 0,
            descuento_unitario: descuentoUnitario,
        };

        acumulado.cantidad = redondearCantidad(acumulado.cantidad + cantidad);

        if (descuentoUnitario > acumulado.descuento_unitario) {
            acumulado.descuento_unitario = descuentoUnitario;
        }

        mapa.set(idProducto, acumulado);
    }

    return {
        ok: true,
        items: Array.from(mapa.values()),
    };
}

function calcularLineaCotizacion(producto, cantidad, descuentoUnitario = 0) {
    const precioUnitario = normalizarEntero(producto.precio_venta);
    const precioCostoUnitario = normalizarEntero(producto.precio_costo_referencia);

    const descuentoSeguro = Math.max(0, normalizarEntero(descuentoUnitario));

    if (descuentoSeguro > precioUnitario) {
        return crearError(`El descuento no puede ser mayor al precio de "${producto.nombre}".`);
    }

    const precioDespuesDescuento = precioUnitario - descuentoSeguro;
    const brutoLinea = redondearDinero(precioDespuesDescuento * cantidad);
    const descuentoTotal = redondearDinero(descuentoSeguro * cantidad);

    const manejaIva = normalizarEntero(producto.maneja_iva) === 1;
    const porcentajeIva = normalizarEntero(producto.porcentaje_iva);
    const precioIncluyeIva = normalizarEntero(producto.precio_incluye_iva) === 1;

    let subtotal = brutoLinea;
    let impuestoTotal = 0;
    let totalLinea = brutoLinea;

    if (manejaIva && porcentajeIva > 0) {
        const tasa = porcentajeIva / 100;

        if (precioIncluyeIva) {
            subtotal = redondearDinero(brutoLinea / (1 + tasa));
            impuestoTotal = brutoLinea - subtotal;
            totalLinea = brutoLinea;
        } else {
            impuestoTotal = redondearDinero(subtotal * tasa);
            totalLinea = subtotal + impuestoTotal;
        }
    }

    const costoTotal = redondearDinero(precioCostoUnitario * cantidad);
    const utilidadBruta = subtotal - costoTotal;

    return {
        ok: true,
        linea: {
            precio_unitario: precioUnitario,
            precio_costo_unitario: precioCostoUnitario,
            descuento_unitario: descuentoSeguro,
            descuento_total: descuentoTotal,
            porcentaje_iva: manejaIva ? porcentajeIva : 0,
            impuesto_unitario: cantidad > 0 ? redondearDinero(impuestoTotal / cantidad) : 0,
            impuesto_total: impuestoTotal,
            subtotal,
            total_linea: totalLinea,
            costo_total: costoTotal,
            utilidad_bruta: utilidadBruta,
        },
    };
}

function prepararItemsParaCotizacion(itemsConsolidados) {
    const itemsPreparados = [];

    for (const item of itemsConsolidados) {
        const productoRaw = cotizacionesRepository.obtenerProductoPorId(item.id_producto);

        if (!productoRaw) {
            return crearError(`El producto con ID ${item.id_producto} no existe o no está activo.`);
        }

        const producto = prepararProductoParaCotizacion(productoRaw);

        let cantidad = redondearCantidad(item.cantidad);

        if (producto.permite_cantidad_decimal !== 1) {
            if (tieneParteDecimal(cantidad)) {
                return crearError(`El producto "${producto.nombre}" no permite cantidades decimales.`);
            }

            cantidad = Math.trunc(cantidad);
        }

        if (cantidad <= 0) {
            return crearError(`La cantidad del producto "${producto.nombre}" debe ser mayor a cero.`);
        }

        const resultadoLinea = calcularLineaCotizacion(
            producto,
            cantidad,
            item.descuento_unitario
        );

        if (!resultadoLinea.ok) {
            return resultadoLinea;
        }

        itemsPreparados.push({
            id_producto: producto.id_producto,
            id_unidad_medida: producto.id_unidad_medida || null,
            unidad_abreviatura: producto.unidad_abreviatura || 'und',
            codigo_interno: producto.codigo_interno || null,
            codigo_barras: producto.codigo_barras || null,
            nombre_producto: producto.nombre,
            descripcion_producto: producto.descripcion || null,
            cantidad,
            ...resultadoLinea.linea,
        });
    }

    return {
        ok: true,
        items: itemsPreparados,
    };
}

function calcularResumenCotizacion(items) {
    return items.reduce((resumen, item) => {
        resumen.subtotal += item.subtotal;
        resumen.descuento_total += item.descuento_total;
        resumen.impuesto_total += item.impuesto_total;
        resumen.total += item.total_linea;
        resumen.total_costo += item.costo_total;
        resumen.utilidad_bruta += item.utilidad_bruta;

        return resumen;
    }, {
        subtotal: 0,
        descuento_total: 0,
        impuesto_total: 0,
        total: 0,
        total_costo: 0,
        utilidad_bruta: 0,
    });
}

function crearCotizacion({ idUsuario, payload = {} } = {}) {
    const idUsuarioNormalizado = normalizarId(idUsuario);

    if (!idUsuarioNormalizado) {
        return crearError('No se pudo identificar el usuario autenticado.', 401);
    }

    const idCliente = normalizarId(payload.id_cliente);

    if (!idCliente) {
        return crearError('Selecciona un cliente válido para la cotización.');
    }

    const cliente = cotizacionesRepository.obtenerClientePorId(idCliente);

    if (!cliente) {
        return crearError('El cliente seleccionado no existe o no está activo.');
    }

    const resultadoItemsConsolidados = consolidarItemsCotizacion(payload.items);

    if (!resultadoItemsConsolidados.ok) {
        return resultadoItemsConsolidados;
    }

    const resultadoItems = prepararItemsParaCotizacion(resultadoItemsConsolidados.items);

    if (!resultadoItems.ok) {
        return resultadoItems;
    }

    const resumen = calcularResumenCotizacion(resultadoItems.items);

    if (resumen.total <= 0) {
        return crearError('El total de la cotización debe ser mayor a cero.');
    }

    const validezDias = normalizarValidezDias(payload.validez_dias);

    const datosCotizacion = {
        id_cliente: idCliente,
        id_usuario: idUsuarioNormalizado,

        fecha_vencimiento: calcularFechaVencimiento(validezDias),
        validez_dias: validezDias,

        subtotal: resumen.subtotal,
        descuento_total: resumen.descuento_total,
        impuesto_total: resumen.impuesto_total,
        total: resumen.total,
        total_costo: resumen.total_costo,
        utilidad_bruta: resumen.utilidad_bruta,

        estado: 'emitida',
        origen: limpiarTexto(payload.origen) || 'manual',

        observaciones: limpiarTexto(payload.observaciones),
        condiciones_comerciales: limpiarTexto(payload.condiciones_comerciales),

        items: resultadoItems.items,
    };

    try {
        const registro = cotizacionesRepository.crearCotizacion(datosCotizacion);

        return {
            ok: true,
            mensaje: 'Cotización creada correctamente.',
            cotizacion: {
                id_cotizacion: registro.id_cotizacion,
                numero_cotizacion: registro.numero_cotizacion,
                prefijo: registro.prefijo,
                consecutivo: registro.consecutivo,
                id_cliente: idCliente,
                cliente: prepararClienteParaCotizacion(cliente),
                fecha_vencimiento: datosCotizacion.fecha_vencimiento,
                validez_dias: validezDias,
                subtotal: resumen.subtotal,
                descuento_total: resumen.descuento_total,
                impuesto_total: resumen.impuesto_total,
                total: resumen.total,
                total_costo: resumen.total_costo,
                utilidad_bruta: resumen.utilidad_bruta,
                estado: datosCotizacion.estado,
            },
        };
    } catch (error) {
        console.error('Error creando cotización:', error);

        return crearError(
            'No se pudo crear la cotización. Revisa los datos e intenta nuevamente.',
            500
        );
    }
}

function prepararCotizacionListado(cotizacion) {
    const clienteNombre = (
        limpiarTexto(cotizacion.cliente_nombre)
        || limpiarTexto(cotizacion.cliente_razon_social)
        || limpiarTexto(cotizacion.cliente_nombre_comercial)
        || 'Sin cliente'
    );

    const clienteDocumento = limpiarTexto(cotizacion.cliente_documento);
    const clienteTipoDocumento = limpiarTexto(cotizacion.cliente_tipo_documento) || 'CC';

    return {
        ...cotizacion,
        cliente_nombre_mostrar: clienteNombre,
        cliente_etiqueta: clienteDocumento
            ? `${clienteTipoDocumento} ${clienteDocumento}`
            : 'Sin documento',
        subtotal: normalizarEntero(cotizacion.subtotal),
        descuento_total: normalizarEntero(cotizacion.descuento_total),
        impuesto_total: normalizarEntero(cotizacion.impuesto_total),
        total: normalizarEntero(cotizacion.total),
        total_costo: normalizarEntero(cotizacion.total_costo),
        utilidad_bruta: normalizarEntero(cotizacion.utilidad_bruta),
    };
}

function obtenerListadoCotizaciones({ query = {} } = {}) {
    const pagina = Math.max(1, normalizarEntero(query.pagina, 1));
    const limite = [10, 20, 50].includes(normalizarEntero(query.limite))
        ? normalizarEntero(query.limite)
        : 20;

    const filtros = {
        busqueda: limpiarTexto(query.busqueda),
        estado: limpiarTexto(query.estado),
        fecha_desde: limpiarTexto(query.fecha_desde),
        fecha_hasta: limpiarTexto(query.fecha_hasta),
        limite,
        offset: (pagina - 1) * limite,
    };

    const totalResultados = cotizacionesRepository.contarCotizaciones(filtros);
    const totalPaginas = Math.max(1, Math.ceil(totalResultados / limite));

    if (pagina > totalPaginas) {
        filtros.offset = (totalPaginas - 1) * limite;
    }

    const cotizaciones = cotizacionesRepository
        .listarCotizaciones(filtros)
        .map(prepararCotizacionListado);

    return {
        filtros,
        cotizaciones,
        total_resultados: totalResultados,
        pagina_actual: Math.min(pagina, totalPaginas),
        total_paginas: totalPaginas,
        limite_resultados: limite,
        tiene_pagina_anterior: pagina > 1,
        tiene_pagina_siguiente: pagina < totalPaginas,
        pagina_anterior: pagina > 1 ? pagina - 1 : 1,
        pagina_siguiente: pagina < totalPaginas ? pagina + 1 : totalPaginas,
    };
}

function obtenerDetalleCotizacion(idCotizacion) {
    const id = normalizarId(idCotizacion);

    if (!id) {
        return crearError('La cotización solicitada no es válida.');
    }

    const cotizacion = cotizacionesRepository.obtenerCotizacionPorId(id);

    if (!cotizacion) {
        return crearError('No se encontró la cotización solicitada.', 404);
    }

    const detalle = cotizacionesRepository
        .listarDetalleCotizacion(id)
        .map((item) => ({
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
            utilidad_bruta: normalizarEntero(item.utilidad_bruta),
        }));

    return {
        ok: true,
        cotizacion: prepararCotizacionListado(cotizacion),
        detalle,
    };
}

function obtenerTicketCotizacion(idCotizacion) {
    const resultado = obtenerDetalleCotizacion(idCotizacion);

    if (!resultado.ok) {
        return resultado;
    }

    const configuracion = cotizacionesRepository.obtenerConfiguracionNegocio();

    return {
        ok: true,
        ticket: {
            comercio: prepararConfiguracionTicket(configuracion),
            cotizacion: resultado.cotizacion,
            detalle: resultado.detalle,
        },
    };
}

module.exports = {
    obtenerSiguienteCotizacion,
    buscarClientes,
    buscarProductos,
    obtenerProducto,
    crearCotizacion,
    obtenerListadoCotizaciones,
    obtenerDetalleCotizacion,
    obtenerTicketCotizacion,
};