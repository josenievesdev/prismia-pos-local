const remisionesRepository = require('./remisiones.repository');
const ventasRepository = require('../ventas/ventas.repository');

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

function prepararClienteParaRemision(cliente) {
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
        direccion_mostrar: limpiarTexto(cliente.direccion),
        es_consumidor_final: normalizarEntero(cliente.es_consumidor_final),
    };
}

function prepararProductoParaRemision(producto) {
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

function prepararNumeracionRemision(numeracion) {
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

function obtenerSiguienteRemision() {
    return prepararNumeracionRemision(
        remisionesRepository.obtenerSiguienteNumeroRemision()
    );
}

function buscarClientes({ busqueda = '', limite = 10 } = {}) {
    const termino = limpiarTexto(busqueda);

    if (!termino) {
        return [];
    }

    return remisionesRepository
        .buscarClientesParaRemision({
            busqueda: termino,
            limite,
        })
        .map(prepararClienteParaRemision);
}

function buscarProductos({ busqueda = '', limite = 30 } = {}) {
    return remisionesRepository
        .buscarProductosParaRemision({
            busqueda: limpiarTexto(busqueda),
            limite,
        })
        .map(prepararProductoParaRemision);
}

function obtenerProducto(idProducto) {
    const id = normalizarId(idProducto);

    if (!id) {
        return crearError('El producto solicitado no es válido.');
    }

    const producto = remisionesRepository.obtenerProductoPorId(id);

    if (!producto) {
        return crearError('No se encontró el producto o no está activo.', 404);
    }

    return {
        ok: true,
        producto: prepararProductoParaRemision(producto),
    };
}

function consolidarItemsRemision(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return crearError('Agrega al menos un producto para crear la remisión.');
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

function calcularLineaRemision(producto, cantidad, descuentoUnitario = 0) {
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

function prepararItemsParaRemision(itemsConsolidados, afectaInventario = 0) {
    if (normalizarEntero(afectaInventario) === 1) {
        return crearError(
            'La remisión con afectación de inventario aún no está habilitada. Crea la remisión sin afectar inventario.'
        );
    }

    const itemsPreparados = [];

    for (const item of itemsConsolidados) {
        const productoRaw = remisionesRepository.obtenerProductoPorId(item.id_producto);

        if (!productoRaw) {
            return crearError(`El producto con ID ${item.id_producto} no existe o no está activo.`);
        }

        const producto = prepararProductoParaRemision(productoRaw);

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

        const resultadoLinea = calcularLineaRemision(
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

            afecta_inventario: 0,
            stock_anterior: null,
            stock_nuevo: null,
        });
    }

    return {
        ok: true,
        items: itemsPreparados,
    };
}

function calcularResumenRemision(items) {
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

function normalizarFecha(valor) {
    const texto = limpiarTexto(valor);

    if (!texto) {
        return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return null;
    }

    return texto;
}

function crearRemision({ idUsuario, payload = {} } = {}) {
    const idUsuarioNormalizado = normalizarId(idUsuario);

    if (!idUsuarioNormalizado) {
        return crearError('No se pudo identificar el usuario autenticado.', 401);
    }

    const idCliente = normalizarId(payload.id_cliente);

    if (!idCliente) {
        return crearError('Selecciona un cliente válido para la remisión.');
    }

    const cliente = remisionesRepository.obtenerClientePorId(idCliente);

    if (!cliente) {
        return crearError('El cliente seleccionado no existe o no está activo.');
    }

    const afectaInventario = normalizarEntero(payload.afecta_inventario);

    if (afectaInventario === 1) {
        return crearError(
            'La afectación de inventario desde remisiones se habilitará en una fase posterior.'
        );
    }

    const resultadoItemsConsolidados = consolidarItemsRemision(payload.items);

    if (!resultadoItemsConsolidados.ok) {
        return resultadoItemsConsolidados;
    }

    const resultadoItems = prepararItemsParaRemision(
        resultadoItemsConsolidados.items,
        afectaInventario
    );

    if (!resultadoItems.ok) {
        return resultadoItems;
    }

    const resumen = calcularResumenRemision(resultadoItems.items);

    if (resumen.total <= 0) {
        return crearError('El total de la remisión debe ser mayor a cero.');
    }

    const datosRemision = {
        id_cliente: idCliente,
        id_usuario: idUsuarioNormalizado,
        id_cotizacion_origen: normalizarId(payload.id_cotizacion_origen),
        id_venta_convertida: null,

        fecha_entrega_estimada: normalizarFecha(payload.fecha_entrega_estimada),
        fecha_entregada: null,

        direccion_entrega: limpiarTexto(payload.direccion_entrega || cliente.direccion),
        contacto_entrega: limpiarTexto(payload.contacto_entrega || obtenerNombreCliente(cliente)),
        telefono_entrega: limpiarTexto(payload.telefono_entrega || cliente.telefono || cliente.celular),

        subtotal: resumen.subtotal,
        descuento_total: resumen.descuento_total,
        impuesto_total: resumen.impuesto_total,
        total: resumen.total,
        total_costo: resumen.total_costo,
        utilidad_bruta: resumen.utilidad_bruta,

        afecta_inventario: 0,
        inventario_afectado_en: null,

        estado: 'emitida',
        origen: limpiarTexto(payload.origen) || 'manual',
        observaciones: limpiarTexto(payload.observaciones),
        condiciones_entrega: limpiarTexto(payload.condiciones_entrega),

        items: resultadoItems.items,
    };

    try {
        const registro = remisionesRepository.crearRemision(datosRemision);

        return {
            ok: true,
            mensaje: 'Remisión creada correctamente.',
            remision: {
                id_remision: registro.id_remision,
                numero_remision: registro.numero_remision,
                prefijo: registro.prefijo,
                consecutivo: registro.consecutivo,
                id_cliente: idCliente,
                cliente: prepararClienteParaRemision(cliente),
                fecha_entrega_estimada: datosRemision.fecha_entrega_estimada,
                subtotal: resumen.subtotal,
                descuento_total: resumen.descuento_total,
                impuesto_total: resumen.impuesto_total,
                total: resumen.total,
                total_costo: resumen.total_costo,
                utilidad_bruta: resumen.utilidad_bruta,
                afecta_inventario: 0,
                estado: datosRemision.estado,
            },
        };
    } catch (error) {
        console.error('Error creando remisión:', error);

        return crearError(
            'No se pudo crear la remisión. Revisa los datos e intenta nuevamente.',
            500
        );
    }
}

function prepararRemisionListado(remision) {
    const clienteNombre = (
        limpiarTexto(remision.cliente_nombre)
        || limpiarTexto(remision.cliente_razon_social)
        || limpiarTexto(remision.cliente_nombre_comercial)
        || 'Sin cliente'
    );

    const clienteDocumento = limpiarTexto(remision.cliente_documento);
    const clienteTipoDocumento = limpiarTexto(remision.cliente_tipo_documento) || 'CC';

    return {
        ...remision,
        cliente_nombre_mostrar: clienteNombre,
        cliente_etiqueta: clienteDocumento
            ? `${clienteTipoDocumento} ${clienteDocumento}`
            : 'Sin documento',
        subtotal: normalizarEntero(remision.subtotal),
        descuento_total: normalizarEntero(remision.descuento_total),
        impuesto_total: normalizarEntero(remision.impuesto_total),
        total: normalizarEntero(remision.total),
        total_costo: normalizarEntero(remision.total_costo),
        utilidad_bruta: normalizarEntero(remision.utilidad_bruta),
        afecta_inventario: normalizarEntero(remision.afecta_inventario),
    };
}

function obtenerListadoRemisiones({ query = {} } = {}) {
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

    const totalResultados = remisionesRepository.contarRemisiones(filtros);
    const totalPaginas = Math.max(1, Math.ceil(totalResultados / limite));

    if (pagina > totalPaginas) {
        filtros.offset = (totalPaginas - 1) * limite;
    }

    const remisiones = remisionesRepository
        .listarRemisiones(filtros)
        .map(prepararRemisionListado);

    return {
        filtros,
        remisiones,
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

function obtenerDetalleRemision(idRemision) {
    const id = normalizarId(idRemision);

    if (!id) {
        return crearError('La remisión solicitada no es válida.');
    }

    const remision = remisionesRepository.obtenerRemisionPorId(id);

    if (!remision) {
        return crearError('No se encontró la remisión solicitada.', 404);
    }

    const detalle = remisionesRepository
        .listarDetalleRemision(id)
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
            afecta_inventario: normalizarEntero(item.afecta_inventario),
        }));

    return {
        ok: true,
        remision: prepararRemisionListado(remision),
        detalle,
    };
}

function prepararMedioPagoConversion(medioPago) {
    return {
        ...medioPago,
        requiere_referencia: normalizarEntero(medioPago.requiere_referencia),
        afecta_efectivo_caja: normalizarEntero(medioPago.afecta_efectivo_caja),
        activo: normalizarEntero(medioPago.activo),
        orden: normalizarEntero(medioPago.orden),
    };
}

function prepararTurnoConversion(turno) {
    if (!turno) {
        return null;
    }

    return {
        id_turno_caja: turno.id_turno_caja,
        id_usuario_apertura: turno.id_usuario_apertura,
        usuario_apertura_nombre: turno.usuario_apertura_nombre,
        fecha_apertura: turno.fecha_apertura,
        estado: turno.estado,
        monto_inicial: normalizarEntero(turno.monto_inicial),
        total_ventas: normalizarEntero(turno.total_ventas),
        monto_esperado: normalizarEntero(turno.monto_esperado),
    };
}

function validarProductoRemisionParaVenta(item) {
    const producto = ventasRepository.obtenerProductoParaVenta(item.id_producto);

    if (!producto) {
        return {
            ok: false,
            item,
            problema: `El producto "${item.nombre_producto}" ya no existe o no está activo.`,
        };
    }

    const stockActual = normalizarNumero(producto.stock_actual);
    const stockReservado = normalizarNumero(producto.stock_reservado);
    const stockDisponible = stockActual - stockReservado;

    const controlaInventario = normalizarEntero(producto.controla_inventario);
    const permiteVentaSinStock = normalizarEntero(producto.permite_venta_sin_stock);
    const cantidad = normalizarNumero(item.cantidad);

    if (
        controlaInventario === 1
        && permiteVentaSinStock !== 1
        && cantidad > stockDisponible
    ) {
        return {
            ok: false,
            item,
            producto,
            problema: `Stock insuficiente para "${item.nombre_producto}". Remitido: ${cantidad}. Disponible actual: ${stockDisponible}.`,
        };
    }

    return {
        ok: true,
        item,
        producto: {
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            codigo_interno: producto.codigo_interno,
            stock_actual: stockActual,
            stock_reservado: stockReservado,
            stock_disponible: stockDisponible,
            controla_inventario: controlaInventario,
            permite_venta_sin_stock: permiteVentaSinStock,
        },
    };
}

function prepararConversionRemision(idRemision) {
    const resultado = obtenerDetalleRemision(idRemision);

    if (!resultado.ok) {
        return resultado;
    }

    const remision = resultado.remision;
    const detalle = resultado.detalle || [];

    const estadosConvertibles = ['emitida', 'entregada'];

    if (!estadosConvertibles.includes(remision.estado)) {
        return crearError(
            `La remisión ${remision.numero_remision} no se puede convertir porque está en estado "${remision.estado}".`
        );
    }

    if (normalizarEntero(remision.afecta_inventario) === 1) {
        return crearError(
            'Esta remisión ya afecta inventario. La conversión sin doble descuento se habilitará en una fase posterior.'
        );
    }

    if (!detalle.length) {
        return crearError('La remisión no tiene productos para convertir a venta.');
    }

    const turnoAbierto = ventasRepository.obtenerTurnoAbierto();

    const mediosPago = ventasRepository
        .listarMediosPagoActivos()
        .map(prepararMedioPagoConversion);

    const problemas = [];

    if (!turnoAbierto) {
        problemas.push('No hay caja abierta. Debes abrir caja antes de convertir la remisión a venta.');
    }

    if (!mediosPago.length) {
        problemas.push('No hay medios de pago activos para registrar la venta.');
    }

    const productos = detalle.map(validarProductoRemisionParaVenta);

    productos.forEach((resultadoProducto) => {
        if (!resultadoProducto.ok) {
            problemas.push(resultadoProducto.problema);
        }
    });

    return {
        ok: true,
        puede_convertir: problemas.length === 0,
        mensaje: problemas.length === 0
            ? 'La remisión puede convertirse a venta.'
            : 'La remisión tiene pendientes antes de convertirse.',
        problemas,
        remision,
        detalle,
        turno_abierto: prepararTurnoConversion(turnoAbierto),
        medios_pago: mediosPago,
        productos: productos.map((resultadoProducto) => ({
            ok: resultadoProducto.ok,
            problema: resultadoProducto.problema || null,
            id_producto: resultadoProducto.item.id_producto,
            nombre_producto: resultadoProducto.item.nombre_producto,
            cantidad_remitida: normalizarNumero(resultadoProducto.item.cantidad),
            stock_disponible: resultadoProducto.producto
                ? normalizarNumero(resultadoProducto.producto.stock_disponible)
                : null,
            controla_inventario: resultadoProducto.producto
                ? normalizarEntero(resultadoProducto.producto.controla_inventario)
                : null,
        })),
    };
}

function obtenerFechaVentaSQL(fechaVenta) {
    const texto = limpiarTexto(fechaVenta);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        const ahora = new Date();
        return ahora.toISOString().slice(0, 19).replace('T', ' ');
    }

    const horaActual = new Date().toTimeString().slice(0, 8);
    return `${texto} ${horaActual}`;
}

function prepararPagoConversionVenta(pago, medioPago, totalVenta) {
    if (!pago || typeof pago !== 'object') {
        return crearError('Debes registrar el pago para convertir la remisión a venta.');
    }

    const montoRecibido = redondearDinero(
        pago.monto_recibido === undefined
            || pago.monto_recibido === null
            || pago.monto_recibido === ''
            ? totalVenta
            : pago.monto_recibido
    );

    const referencia = limpiarTexto(pago.referencia);
    const requiereReferencia = normalizarEntero(medioPago.requiere_referencia) === 1;
    const afectaEfectivo = normalizarEntero(medioPago.afecta_efectivo_caja) === 1;

    if (montoRecibido < totalVenta) {
        return crearError('El valor recibido no cubre el total de la remisión.');
    }

    if (requiereReferencia && !referencia) {
        return crearError(`El medio de pago "${medioPago.nombre}" requiere referencia.`);
    }

    if (!afectaEfectivo && montoRecibido > totalVenta) {
        return crearError('El cambio solo aplica para pagos en efectivo.');
    }

    const metodoPagoGeneral = ['efectivo', 'transferencia', 'tarjeta'].includes(medioPago.tipo)
        ? medioPago.tipo
        : 'otro';

    return {
        ok: true,
        pago: {
            id_medio_pago: medioPago.id_medio_pago,
            metodo_pago: metodoPagoGeneral,
            entidad: medioPago.nombre,
            referencia,
            observaciones: limpiarTexto(pago.observaciones),
            monto_pago: totalVenta,
            monto_recibido: montoRecibido,
            cambio_entregado: afectaEfectivo ? Math.max(montoRecibido - totalVenta, 0) : 0,
            saldo_pendiente: 0,
        },
    };
}

function calcularTotalesTurnoConversion(medioPago, totalVenta) {
    const tipo = limpiarTexto(medioPago.tipo);
    const afectaEfectivo = normalizarEntero(medioPago.afecta_efectivo_caja) === 1;

    return {
        total_efectivo: tipo === 'efectivo' ? totalVenta : 0,
        total_transferencia: tipo === 'transferencia' ? totalVenta : 0,
        total_tarjeta: tipo === 'tarjeta' ? totalVenta : 0,
        total_otros: !['efectivo', 'transferencia', 'tarjeta'].includes(tipo) ? totalVenta : 0,
        monto_esperado: afectaEfectivo ? totalVenta : 0,
    };
}

function prepararItemsRemisionParaVenta(detalle) {
    const itemsPreparados = [];

    for (const item of detalle) {
        const producto = ventasRepository.obtenerProductoParaVenta(item.id_producto);

        if (!producto) {
            return crearError(`El producto "${item.nombre_producto}" ya no existe o no está activo.`);
        }

        const cantidad = redondearCantidad(item.cantidad);
        const stockAnterior = normalizarNumero(producto.stock_actual);
        const stockReservado = normalizarNumero(producto.stock_reservado);
        const stockDisponible = stockAnterior - stockReservado;

        const controlaInventario = normalizarEntero(producto.controla_inventario);
        const permiteVentaSinStock = normalizarEntero(producto.permite_venta_sin_stock);

        if (
            controlaInventario === 1
            && permiteVentaSinStock !== 1
            && cantidad > stockDisponible
        ) {
            return crearError(
                `Stock insuficiente para "${item.nombre_producto}". Remitido: ${cantidad}. Disponible actual: ${stockDisponible}.`
            );
        }

        itemsPreparados.push({
            id_producto: item.id_producto,
            id_unidad_medida: item.id_unidad_medida || null,
            unidad_abreviatura: limpiarTexto(item.unidad_abreviatura) || 'und',
            codigo_interno: limpiarTexto(item.codigo_interno) || null,
            codigo_barras: limpiarTexto(item.codigo_barras) || null,
            nombre_producto: limpiarTexto(item.nombre_producto),
            cantidad,

            controla_inventario: controlaInventario,
            stock_anterior: stockAnterior,
            stock_nuevo: controlaInventario === 1
                ? redondearCantidad(stockAnterior - cantidad)
                : stockAnterior,

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
        });
    }

    return {
        ok: true,
        items: itemsPreparados,
    };
}

function calcularResumenVentaDesdeRemision(detalle) {
    return detalle.reduce((resumen, item) => {
        const cantidad = normalizarNumero(item.cantidad);
        const descuentoUnitario = normalizarEntero(item.descuento_unitario);

        resumen.subtotal += normalizarEntero(item.subtotal);
        resumen.descuento_total += normalizarEntero(descuentoUnitario * cantidad);
        resumen.impuesto_total += normalizarEntero(item.impuesto_total);
        resumen.total += normalizarEntero(item.total_linea);
        resumen.total_costo += normalizarEntero(item.costo_total);
        resumen.utilidad_bruta += normalizarEntero(item.utilidad_bruta);

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

function convertirRemisionAVenta({ idRemision, idUsuario, payload = {} } = {}) {
    const idUsuarioNormalizado = normalizarId(idUsuario);

    if (!idUsuarioNormalizado) {
        return crearError('No se pudo identificar el usuario autenticado.', 401);
    }

    const preparacion = prepararConversionRemision(idRemision);

    if (!preparacion.ok) {
        return preparacion;
    }

    if (!preparacion.puede_convertir) {
        return crearError(preparacion.problemas.join(' '));
    }

    const remision = preparacion.remision;
    const detalle = preparacion.detalle || [];

    if (normalizarEntero(remision.afecta_inventario) === 1) {
        return crearError(
            'Esta remisión ya afecta inventario. La conversión sin doble descuento se habilitará en una fase posterior.'
        );
    }

    const idMedioPago = normalizarId(payload.pago && payload.pago.id_medio_pago);

    if (!idMedioPago) {
        return crearError('Selecciona un medio de pago válido.');
    }

    const medioPagoRaw = ventasRepository.obtenerMedioPagoPorId(idMedioPago);

    if (!medioPagoRaw) {
        return crearError('El medio de pago seleccionado no existe o no está activo.');
    }

    const medioPago = prepararMedioPagoConversion(medioPagoRaw);

    const resultadoItems = prepararItemsRemisionParaVenta(detalle);

    if (!resultadoItems.ok) {
        return resultadoItems;
    }

    const resumen = calcularResumenVentaDesdeRemision(resultadoItems.items);

    if (resumen.total <= 0) {
        return crearError('El total de la remisión debe ser mayor a cero.');
    }

    const resultadoPago = prepararPagoConversionVenta(payload.pago, medioPago, resumen.total);

    if (!resultadoPago.ok) {
        return resultadoPago;
    }

    const cliente = ventasRepository.obtenerClientePorId(remision.id_cliente);

    if (!cliente) {
        return crearError('El cliente de la remisión ya no existe o no está activo.');
    }

    const turnoAbierto = ventasRepository.obtenerTurnoAbierto();

    if (!turnoAbierto) {
        return crearError('No hay caja abierta para convertir la remisión a venta.');
    }

    const totalesTurno = calcularTotalesTurnoConversion(medioPago, resumen.total);

    try {
        const registro = ventasRepository.registrarVentaPOS({
            id_usuario: idUsuarioNormalizado,
            turno: turnoAbierto,
            cliente,
            fecha_venta: obtenerFechaVentaSQL(payload.fecha_venta),
            observaciones: limpiarTexto(
                payload.observaciones || `Venta generada desde remisión ${remision.numero_remision}`
            ),
            requiere_factura: 0,
            codigo_documento: 'factura_venta',
            tipo_comprobante: 'recibo_interno',
            prefijo_comprobante: 'FV',

            items: resultadoItems.items,
            resumen,
            pago: resultadoPago.pago,
            totales_turno: totalesTurno,

            datos_fiscales: {
                origen: 'remision',
                id_remision: remision.id_remision,
                numero_remision: remision.numero_remision,
                cliente: {
                    id_cliente: cliente.id_cliente,
                    nombre: cliente.nombre,
                    documento: cliente.documento,
                    tipo_documento: cliente.tipo_documento,
                },
                medio_pago: {
                    id_medio_pago: medioPago.id_medio_pago,
                    codigo: medioPago.codigo,
                    nombre: medioPago.nombre,
                    tipo: medioPago.tipo,
                },
                resumen,
            },

            afterRegistrarVenta: ({ id_venta }) => {
                const cambios = remisionesRepository.marcarRemisionConvertida({
                    id_remision: remision.id_remision,
                    id_venta_convertida: id_venta,
                });

                if (cambios === 0) {
                    throw new Error('No se pudo marcar la remisión como convertida.');
                }
            },
        });

        return {
            ok: true,
            mensaje: `Remisión ${remision.numero_remision} convertida a venta correctamente.`,
            remision: {
                id_remision: remision.id_remision,
                numero_remision: remision.numero_remision,
                estado: 'convertida',
            },
            venta: {
                id_venta: registro.id_venta,
                numero_venta: registro.numero_venta,
                subtotal: resumen.subtotal,
                impuesto_total: resumen.impuesto_total,
                total: resumen.total,
                total_pagado: resultadoPago.pago.monto_pago,
                monto_recibido: resultadoPago.pago.monto_recibido,
                cambio_entregado: resultadoPago.pago.cambio_entregado,
            },
            comprobante: registro.comprobante,
        };
    } catch (error) {
        console.error('Error convirtiendo remisión a venta:', error);

        return crearError(
            'No se pudo convertir la remisión a venta. Revisa los datos e intenta nuevamente.',
            500
        );
    }
}

function obtenerTicketRemision(idRemision) {
    const resultado = obtenerDetalleRemision(idRemision);

    if (!resultado.ok) {
        return resultado;
    }

    const configuracion = remisionesRepository.obtenerConfiguracionNegocio();

    return {
        ok: true,
        ticket: {
            comercio: prepararConfiguracionTicket(configuracion),
            remision: resultado.remision,
            detalle: resultado.detalle,
        },
    };
}

module.exports = {
    obtenerSiguienteRemision,
    buscarClientes,
    buscarProductos,
    obtenerProducto,
    crearRemision,
    obtenerListadoRemisiones,
    obtenerDetalleRemision,
    obtenerTicketRemision,
    prepararConversionRemision,
    convertirRemisionAVenta,
};