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

function prepararClienteParaVenta(cliente) {
    if (!cliente) {
        return null;
    }

    const tipoDocumento = cliente.tipo_documento || 'CC';
    const documento = cliente.documento || '0000000000';

    const nombreCliente = limpiarTexto(cliente.nombre)
        || limpiarTexto(cliente.razon_social)
        || limpiarTexto(cliente.nombre_comercial)
        || `Cliente #${cliente.id_cliente}`;

    const telefonoCliente = limpiarTexto(cliente.telefono)
        || limpiarTexto(cliente.celular);

    const correoCliente = limpiarTexto(cliente.correo)
        || limpiarTexto(cliente.correo_facturacion);

    return {
        id_cliente: cliente.id_cliente,
        tipo_documento: tipoDocumento,
        documento,
        nombre: nombreCliente,
        telefono: telefonoCliente,
        celular: limpiarTexto(cliente.celular),
        correo: correoCliente,
        direccion: cliente.direccion || '',
        es_consumidor_final: normalizarEntero(cliente.es_consumidor_final),
        estado: cliente.estado,
        etiqueta_documento: `${tipoDocumento} ${documento}`,
        texto_secundario: [
            documento ? `${tipoDocumento} ${documento}` : null,
            telefonoCliente || null,
            correoCliente || null,
        ].filter(Boolean).join(' · '),
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

function prepararNumeracionDocumento(numeracion) {
    if (!numeracion) {
        return {
            codigo_documento: 'factura_venta',
            nombre_documento: 'Factura de venta',
            prefijo: 'FV',
            longitud_consecutivo: 6,
            ultimo_consecutivo: 0,
            siguiente_consecutivo: 1,
            siguiente_numero: 'FV-000001',
            tipo_comprobante: 'recibo_interno',
        };
    }

    return {
        ...numeracion,
        longitud_consecutivo: normalizarEntero(numeracion.longitud_consecutivo, 6),
        ultimo_consecutivo: normalizarEntero(numeracion.ultimo_consecutivo),
        siguiente_consecutivo: normalizarEntero(numeracion.siguiente_consecutivo),
        siguiente_numero: limpiarTexto(numeracion.siguiente_numero) || 'FV-000001',
        activo: normalizarEntero(numeracion.activo),
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

    const siguienteFactura = prepararNumeracionDocumento(
        ventasRepository.obtenerSiguienteNumeroDocumento('factura_venta')
    );

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
        siguienteFactura,
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

function buscarClientes({ busqueda = '', limite = 10 } = {}) {
    const termino = limpiarTexto(busqueda);

    if (!termino) {
        return [];
    }

    return ventasRepository
        .buscarClientesParaVenta({
            busqueda: termino,
            limite,
        })
        .map(prepararClienteParaVenta);
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

function crearErrorVenta(mensaje, codigoEstado = 400) {
    return {
        ok: false,
        mensaje,
        codigoEstado,
    };
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

function obtenerFechaVentaSQL(fechaVenta) {
    const texto = limpiarTexto(fechaVenta);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        const ahora = new Date();
        return ahora.toISOString().slice(0, 19).replace('T', ' ');
    }

    const horaActual = new Date().toTimeString().slice(0, 8);
    return `${texto} ${horaActual}`;
}

function obtenerClienteParaRegistro(idCliente) {
    const id = normalizarId(idCliente);

    if (id) {
        const cliente = ventasRepository.obtenerClientePorId(id);

        if (!cliente) {
            return {
                ok: false,
                mensaje: 'El cliente seleccionado no existe o no está activo.',
            };
        }

        return {
            ok: true,
            cliente: prepararCliente(cliente),
        };
    }

    const consumidorFinal = ventasRepository.obtenerClienteConsumidorFinal();

    if (!consumidorFinal) {
        return {
            ok: false,
            mensaje: 'No existe consumidor final activo para registrar la venta.',
        };
    }

    return {
        ok: true,
        cliente: prepararCliente(consumidorFinal),
    };
}

function consolidarItemsVenta(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return {
            ok: false,
            mensaje: 'Agrega al menos un producto para registrar la venta.',
        };
    }

    const mapa = new Map();

    for (const item of items) {
        const idProducto = normalizarId(item.id_producto);
        const cantidad = normalizarNumero(item.cantidad);

        if (!idProducto) {
            return {
                ok: false,
                mensaje: 'Uno de los productos enviados no es válido.',
            };
        }

        if (cantidad <= 0) {
            return {
                ok: false,
                mensaje: 'Todas las cantidades deben ser mayores a cero.',
            };
        }

        const acumulado = mapa.get(idProducto) || 0;
        mapa.set(idProducto, redondearCantidad(acumulado + cantidad));
    }

    return {
        ok: true,
        items: Array.from(mapa.entries()).map(([id_producto, cantidad]) => ({
            id_producto,
            cantidad,
        })),
    };
}

function calcularLineaVenta(producto, cantidad) {
    const precioUnitario = normalizarEntero(producto.precio_venta);
    const precioCostoUnitario = normalizarEntero(producto.precio_costo_referencia);

    const brutoLinea = redondearDinero(precioUnitario * cantidad);

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
        precio_unitario: precioUnitario,
        precio_costo_unitario: precioCostoUnitario,
        descuento_unitario: 0,
        porcentaje_iva: manejaIva ? porcentajeIva : 0,
        impuesto_unitario: cantidad > 0 ? redondearDinero(impuestoTotal / cantidad) : 0,
        impuesto_total: impuestoTotal,
        subtotal,
        total_linea: totalLinea,
        costo_total: costoTotal,
        utilidad_bruta: utilidadBruta,
    };
}

function prepararItemsParaRegistro(itemsConsolidados) {
    const itemsPreparados = [];

    for (const item of itemsConsolidados) {
        const productoRaw = ventasRepository.obtenerProductoParaVenta(item.id_producto);

        if (!productoRaw) {
            return {
                ok: false,
                mensaje: `El producto con ID ${item.id_producto} no existe o no está activo.`,
            };
        }

        const producto = prepararProductoParaVenta(productoRaw);

        let cantidad = redondearCantidad(item.cantidad);

        if (producto.permite_cantidad_decimal !== 1) {
            if (tieneParteDecimal(cantidad)) {
                return {
                    ok: false,
                    mensaje: `El producto "${producto.nombre}" no permite cantidades decimales.`,
                };
            }

            cantidad = Math.trunc(cantidad);
        }

        if (cantidad <= 0) {
            return {
                ok: false,
                mensaje: `La cantidad del producto "${producto.nombre}" debe ser mayor a cero.`,
            };
        }

        if (
            producto.controla_inventario === 1
            && producto.permite_venta_sin_stock !== 1
            && cantidad > producto.stock_disponible
        ) {
            return {
                ok: false,
                mensaje: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock_disponible}.`,
            };
        }

        const linea = calcularLineaVenta(producto, cantidad);

        const stockAnterior = normalizarNumero(producto.stock_actual);
        const stockNuevo = producto.controla_inventario === 1
            ? redondearCantidad(stockAnterior - cantidad)
            : stockAnterior;

        itemsPreparados.push({
            id_producto: producto.id_producto,
            id_unidad_medida: producto.id_unidad_medida || null,
            unidad_abreviatura: producto.unidad_abreviatura || 'und',
            codigo_interno: producto.codigo_interno || null,
            codigo_barras: producto.codigo_barras || null,
            nombre_producto: producto.nombre,
            cantidad,
            controla_inventario: producto.controla_inventario,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            ...linea,
        });
    }

    return {
        ok: true,
        items: itemsPreparados,
    };
}

function calcularResumenRegistroVenta(items) {
    return items.reduce((resumen, item) => {
        resumen.subtotal += item.subtotal;
        resumen.descuento_total += item.descuento_unitario * item.cantidad;
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

function prepararPagoRegistroVenta(pago, medioPago, totalVenta) {
    if (!pago || typeof pago !== 'object') {
        return {
            ok: false,
            mensaje: 'Debes registrar el pago de la venta.',
        };
    }

    const montoRecibido = redondearDinero(pago.monto_recibido);
    const referencia = limpiarTexto(pago.referencia || '');

    if (montoRecibido < totalVenta) {
        return {
            ok: false,
            mensaje: 'El valor recibido no cubre el total de la venta.',
        };
    }

    if (normalizarEntero(medioPago.requiere_referencia) === 1 && !referencia) {
        return {
            ok: false,
            mensaje: `El medio de pago "${medioPago.nombre}" requiere referencia.`,
        };
    }

    const afectaEfectivo = normalizarEntero(medioPago.afecta_efectivo_caja) === 1;

    if (!afectaEfectivo && montoRecibido > totalVenta) {
        return {
            ok: false,
            mensaje: 'El cambio solo aplica para pagos en efectivo.',
        };
    }

    const cambioEntregado = afectaEfectivo
        ? Math.max(montoRecibido - totalVenta, 0)
        : 0;

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
            observaciones: null,
            monto_pago: totalVenta,
            monto_recibido: montoRecibido,
            cambio_entregado: cambioEntregado,
            saldo_pendiente: 0,
        },
    };
}

function calcularTotalesTurno(medioPago, totalVenta) {
    const tipo = medioPago.tipo;
    const afectaEfectivo = normalizarEntero(medioPago.afecta_efectivo_caja) === 1;

    return {
        total_efectivo: tipo === 'efectivo' ? totalVenta : 0,
        total_transferencia: tipo === 'transferencia' ? totalVenta : 0,
        total_tarjeta: tipo === 'tarjeta' ? totalVenta : 0,
        total_otros: !['efectivo', 'transferencia', 'tarjeta'].includes(tipo) ? totalVenta : 0,
        monto_esperado: afectaEfectivo ? totalVenta : 0,
    };
}

function registrarVentaPOS({ idUsuario, payload = {} } = {}) {
    const idUsuarioNormalizado = normalizarId(idUsuario);

    if (!idUsuarioNormalizado) {
        return crearErrorVenta('No se pudo identificar el usuario autenticado.', 401);
    }

    const turnoAbierto = prepararTurno(ventasRepository.obtenerTurnoAbierto());

    if (!turnoAbierto) {
        return crearErrorVenta('Debes abrir caja antes de registrar ventas.');
    }

    const resultadoCliente = obtenerClienteParaRegistro(payload.id_cliente);

    if (!resultadoCliente.ok) {
        return crearErrorVenta(resultadoCliente.mensaje);
    }

    const idMedioPago = normalizarId(payload.pago && payload.pago.id_medio_pago);

    if (!idMedioPago) {
        return crearErrorVenta('Selecciona un medio de pago válido.');
    }

    const medioPagoRaw = ventasRepository.obtenerMedioPagoPorId(idMedioPago);

    if (!medioPagoRaw) {
        return crearErrorVenta('El medio de pago seleccionado no existe o no está activo.');
    }

    const medioPago = prepararMedioPago(medioPagoRaw);

    const resultadoItemsConsolidados = consolidarItemsVenta(payload.items);

    if (!resultadoItemsConsolidados.ok) {
        return crearErrorVenta(resultadoItemsConsolidados.mensaje);
    }

    const resultadoItems = prepararItemsParaRegistro(resultadoItemsConsolidados.items);

    if (!resultadoItems.ok) {
        return crearErrorVenta(resultadoItems.mensaje);
    }

    const resumen = calcularResumenRegistroVenta(resultadoItems.items);

    if (resumen.total <= 0) {
        return crearErrorVenta('El total de la venta debe ser mayor a cero.');
    }

    const resultadoPago = prepararPagoRegistroVenta(payload.pago, medioPago, resumen.total);

    if (!resultadoPago.ok) {
        return crearErrorVenta(resultadoPago.mensaje);
    }

    const totalesTurno = calcularTotalesTurno(medioPago, resumen.total);

    try {
        const registro = ventasRepository.registrarVentaPOS({
            id_usuario: idUsuarioNormalizado,
            turno: turnoAbierto,
            cliente: resultadoCliente.cliente,
            fecha_venta: obtenerFechaVentaSQL(payload.fecha_venta),
            observaciones: limpiarTexto(payload.observaciones || ''),
            requiere_factura: 0,
            codigo_documento: 'factura_venta',
            tipo_comprobante: 'recibo_interno',
            prefijo_comprobante: 'FV',
            items: resultadoItems.items,
            resumen,
            pago: resultadoPago.pago,
            totales_turno: totalesTurno,
            datos_fiscales: {
                cliente: {
                    id_cliente: resultadoCliente.cliente.id_cliente,
                    nombre: resultadoCliente.cliente.nombre,
                    documento: resultadoCliente.cliente.documento,
                    tipo_documento: resultadoCliente.cliente.tipo_documento,
                },
                medio_pago: {
                    id_medio_pago: medioPago.id_medio_pago,
                    codigo: medioPago.codigo,
                    nombre: medioPago.nombre,
                    tipo: medioPago.tipo,
                },
                resumen,
            },
        });

        return {
            ok: true,
            mensaje: 'Venta registrada correctamente.',
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
        console.error('Error registrando venta POS:', error);

        return crearErrorVenta(
            'No se pudo registrar la venta. Revisa los datos e intenta nuevamente.',
            500
        );
    }
}

function normalizarFechaFiltro(valor) {
    const texto = limpiarTexto(valor);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return '';
    }

    return texto;
}

function normalizarEstadoVenta(valor) {
    const estado = limpiarTexto(valor).toLowerCase();
    const estadosPermitidos = ['pagada', 'pendiente', 'anulada'];

    return estadosPermitidos.includes(estado) ? estado : '';
}

function normalizarPaginaHistorial(valor) {
    const pagina = Number.parseInt(valor, 10);

    if (!Number.isInteger(pagina) || pagina < 1) {
        return 1;
    }

    return pagina;
}

function normalizarLimiteHistorial(valor) {
    const limite = Number.parseInt(valor, 10);
    const limitesPermitidos = [25, 50, 100];

    if (!limitesPermitidos.includes(limite)) {
        return 50;
    }

    return limite;
}

function normalizarFiltrosHistorialVentas(query = {}) {
    const pagina = normalizarPaginaHistorial(query.pagina);
    const limite = normalizarLimiteHistorial(query.limite);
    const offset = (pagina - 1) * limite;

    return {
        fecha_desde: normalizarFechaFiltro(query.fecha_desde),
        fecha_hasta: normalizarFechaFiltro(query.fecha_hasta),
        factura: limpiarTexto(query.factura),
        cliente: limpiarTexto(query.cliente),
        id_medio_pago: normalizarId(query.id_medio_pago),
        estado: normalizarEstadoVenta(query.estado),
        id_turno_caja: normalizarId(query.id_turno_caja),
        id_cajero: normalizarId(query.id_cajero),
        pagina,
        limite,
        offset,
    };
}

function prepararVentaHistorial(venta) {
    const clienteNombre = limpiarTexto(venta.cliente_nombre) || 'Consumidor final';
    const clienteDocumento = limpiarTexto(venta.cliente_documento);
    const clienteTipoDocumento = limpiarTexto(venta.cliente_tipo_documento) || 'CF';

    const numeroComprobante =
        limpiarTexto(venta.comprobante_numero)
        || limpiarTexto(venta.numero_venta)
        || `Venta #${venta.id_venta}`;

    return {
        ...venta,
        numero_venta: limpiarTexto(venta.numero_venta) || numeroComprobante,
        numero_comprobante: numeroComprobante,
        fecha_venta: limpiarTexto(venta.fecha_venta),
        subtotal: normalizarEntero(venta.subtotal),
        descuento_total: normalizarEntero(venta.descuento_total),
        impuesto_total: normalizarEntero(venta.impuesto_total),
        total: normalizarEntero(venta.total),
        total_pagado: normalizarEntero(venta.total_pagado || venta.total_pagado_calculado),
        saldo_pendiente: normalizarEntero(venta.saldo_pendiente),
        cambio_entregado: normalizarEntero(venta.cambio_entregado),
        total_costo: normalizarEntero(venta.total_costo),
        utilidad_bruta: normalizarEntero(venta.utilidad_bruta),
        estado: limpiarTexto(venta.estado) || 'pagada',
        cliente_nombre: clienteNombre,
        cliente_documento: clienteDocumento,
        cliente_tipo_documento: clienteTipoDocumento,
        cliente_etiqueta: clienteDocumento
            ? `${clienteTipoDocumento} ${clienteDocumento}`
            : 'Sin documento',
        cajero_nombre: limpiarTexto(venta.cajero_nombre) || 'Usuario',
        medio_pago_nombre: limpiarTexto(venta.medios_pago_nombre) || 'Sin pago registrado',
        medio_pago_tipo: limpiarTexto(venta.medios_pago_tipo || venta.metodos_pago) || 'sin_tipo',
    };
}

function prepararCajeroFiltro(cajero) {
    return {
        id_usuario: cajero.id_usuario,
        nombre: limpiarTexto(cajero.nombre) || `Usuario #${cajero.id_usuario}`,
    };
}

function prepararTurnoFiltro(turno) {
    return {
        id_turno_caja: turno.id_turno_caja,
        fecha_apertura: limpiarTexto(turno.fecha_apertura),
        estado: limpiarTexto(turno.estado) || 'sin_estado',
    };
}

function obtenerHistorialVentas({ query = {} } = {}) {
    const filtros = normalizarFiltrosHistorialVentas(query);

    const totalResultados = ventasRepository.contarHistorialVentas(filtros);
    const totalPaginas = Math.max(1, Math.ceil(totalResultados / filtros.limite));

    if (filtros.pagina > totalPaginas) {
        filtros.pagina = totalPaginas;
        filtros.offset = (filtros.pagina - 1) * filtros.limite;
    }

    const ventas = ventasRepository
        .listarHistorialVentas(filtros)
        .map(prepararVentaHistorial);

    const mediosPago = ventasRepository
        .listarMediosPagoActivos()
        .map(prepararMedioPago);

    const cajeros = ventasRepository
        .listarCajerosConVentas()
        .map(prepararCajeroFiltro);

    const turnos = ventasRepository
        .listarTurnosConVentas(100)
        .map(prepararTurnoFiltro);

    return {
        filtros,
        ventas,
        mediosPago,
        cajeros,
        turnos,
        total_resultados: totalResultados,
        limite_resultados: filtros.limite,
        pagina_actual: filtros.pagina,
        total_paginas: totalPaginas,
        tiene_pagina_anterior: filtros.pagina > 1,
        tiene_pagina_siguiente: filtros.pagina < totalPaginas,
        pagina_anterior: filtros.pagina > 1 ? filtros.pagina - 1 : 1,
        pagina_siguiente: filtros.pagina < totalPaginas ? filtros.pagina + 1 : totalPaginas,
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

function obtenerPrimerValorPorClaveParcial(objeto, fragmentos, defecto = '') {
    if (!objeto) {
        return defecto;
    }

    const entradas = Object.entries(objeto);

    for (const [clave, valor] of entradas) {
        const claveNormalizada = String(clave || '').toLowerCase();

        const coincide = fragmentos.some((fragmento) => {
            return claveNormalizada.includes(String(fragmento).toLowerCase());
        });

        if (coincide && valor !== undefined && valor !== null && String(valor).trim() !== '') {
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
            'Gracias por su compra.'
        ),
        software: 'Prismia POS Local',
    };
}

function prepararVentaTicket(venta) {
    const clienteNombre = limpiarTexto(venta.cliente_nombre) || 'Consumidor final';
    const clienteDocumento = limpiarTexto(venta.cliente_documento) || '0000000000';
    const clienteTipoDocumento = limpiarTexto(venta.cliente_tipo_documento) || 'CF';

    const cajeroNombre =
        limpiarTexto(venta.cajero_nombre)
        || limpiarTexto(venta.usuario_nombre)
        || 'Usuario';

    const estadoVenta = limpiarTexto(venta.estado) || 'pagada';

    return {
        ...venta,
        numero_venta: limpiarTexto(venta.numero_venta) || 'FV-SIN-NUMERO',

        subtotal: normalizarEntero(venta.subtotal),
        descuento_total: normalizarEntero(venta.descuento_total),
        impuesto_total: normalizarEntero(venta.impuesto_total),
        total: normalizarEntero(venta.total),
        total_pagado: normalizarEntero(venta.total_pagado),
        saldo_pendiente: normalizarEntero(venta.saldo_pendiente),
        cambio_entregado: normalizarEntero(venta.cambio_entregado),
        total_costo: normalizarEntero(venta.total_costo),
        utilidad_bruta: normalizarEntero(venta.utilidad_bruta),

        cliente_nombre: clienteNombre,
        cliente_documento: clienteDocumento,
        cliente_tipo_documento: clienteTipoDocumento,

        cajero_nombre: cajeroNombre,
        estado: estadoVenta,
    };
}

function prepararDetalleTicket(detalle) {
    return detalle.map((item) => ({
        ...item,
        cantidad: normalizarNumero(item.cantidad),
        precio_unitario: normalizarEntero(item.precio_unitario),
        descuento_unitario: normalizarEntero(item.descuento_unitario),
        porcentaje_iva: normalizarEntero(item.porcentaje_iva),
        impuesto_unitario: normalizarEntero(item.impuesto_unitario),
        impuesto_total: normalizarEntero(item.impuesto_total),
        subtotal: normalizarEntero(item.subtotal),
        total_linea: normalizarEntero(item.total_linea),
        costo_total: normalizarEntero(item.costo_total),
        utilidad_bruta: normalizarEntero(item.utilidad_bruta),
        unidad_abreviatura: item.unidad_abreviatura || 'und',
    }));
}

function prepararPagosTicket(pagos) {
    return pagos.map((pago) => ({
        ...pago,
        monto: normalizarEntero(pago.monto),
        monto_recibido: normalizarEntero(pago.monto_recibido),
        cambio_entregado: normalizarEntero(pago.cambio_entregado),
        metodo_pago: pago.metodo_pago || 'efectivo',
        medio_pago_nombre: pago.medio_pago_nombre || pago.entidad || pago.metodo_pago || 'Pago',
        medio_pago_tipo: pago.medio_pago_tipo || pago.metodo_pago || 'otro',
        referencia: pago.referencia || '',
    }));
}

function obtenerDetalleVenta(idVenta) {
    const idVentaNormalizado = normalizarId(idVenta);

    if (!idVentaNormalizado) {
        return {
            ok: false,
            codigoEstado: 400,
            mensaje: 'La venta solicitada no es válida.',
        };
    }

    const ventaRaw = ventasRepository.obtenerVentaDetallePorId(idVentaNormalizado);

    if (!ventaRaw) {
        return {
            ok: false,
            codigoEstado: 404,
            mensaje: 'No se encontró la venta solicitada.',
        };
    }

    const detalleRaw = ventasRepository.listarDetalleVentaPorId(idVentaNormalizado);
    const pagosRaw = ventasRepository.listarPagosVentaPorId(idVentaNormalizado);
    const comprobante = ventasRepository.obtenerComprobanteVentaPorId(idVentaNormalizado);

    return {
        ok: true,
        detalleVenta: {
            venta: prepararVentaTicket(ventaRaw),
            detalle: prepararDetalleTicket(detalleRaw),
            pagos: prepararPagosTicket(pagosRaw),
            comprobante: comprobante || {
                numero: ventaRaw.numero_venta || 'FV-SIN-NUMERO',
                prefijo: 'FV',
                consecutivo: null,
                estado: ventaRaw.estado || 'pagada',
                fecha_emision: ventaRaw.fecha_venta,
            },
        },
    };
}

function obtenerTicketVenta(idVenta) {
    const id = Number(idVenta);

    if (!Number.isInteger(id) || id <= 0) {
        return {
            ok: false,
            mensaje: 'La venta solicitada no es válida.',
        };
    }

    const ventaRaw = ventasRepository.obtenerVentaTicketPorId(id);

    if (!ventaRaw) {
        return {
            ok: false,
            mensaje: 'No se encontró la venta solicitada.',
        };
    }

    const detalleRaw = ventasRepository.listarDetalleVentaTicket(id);
    const pagosRaw = ventasRepository.listarPagosVentaTicket(id);
    const comprobante = ventasRepository.obtenerComprobanteVentaTicket(id);
    const configuracion = ventasRepository.obtenerConfiguracionNegocio();

    const venta = prepararVentaTicket(ventaRaw);
    const detalle = prepararDetalleTicket(detalleRaw);
    const pagos = prepararPagosTicket(pagosRaw);

    return {
        ok: true,
        ticket: {
            comercio: prepararConfiguracionTicket(configuracion),
            venta,
            detalle,
            pagos,
            comprobante: comprobante || {
                numero: venta.numero_venta || 'FV-SIN-NUMERO',
                prefijo: 'FV',
                consecutivo: null,
                estado: venta.estado || 'pagada',
                fecha_emision: venta.fecha_venta,
            },
        },
    };
}

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

function crearError(mensaje, codigoEstado = 400) {
    return {
        ok: false,
        mensaje,
        codigoEstado,
    };
}

function obtenerNombreClienteVenta(venta) {
    return (
        limpiarTexto(venta.cliente_razon_social)
        || limpiarTexto(venta.cliente_nombre_comercial)
        || limpiarTexto(venta.cliente_nombre)
        || 'Consumidor final'
    );
}

function prepararVentaParaAnulacion(venta) {
    return {
        ...venta,
        subtotal: normalizarEntero(venta.subtotal),
        descuento_total: normalizarEntero(venta.descuento_total),
        impuesto_total: normalizarEntero(venta.impuesto_total),
        total: normalizarEntero(venta.total),
        total_pagado: normalizarEntero(venta.total_pagado),
        saldo_pendiente: normalizarEntero(venta.saldo_pendiente),
        cambio_entregado: normalizarEntero(venta.cambio_entregado),
        total_costo: normalizarEntero(venta.total_costo),
        utilidad_bruta: normalizarEntero(venta.utilidad_bruta),
        cliente_nombre_mostrar: obtenerNombreClienteVenta(venta),
        cliente_etiqueta: venta.cliente_documento
            ? `${venta.cliente_tipo_documento || 'CC'} ${venta.cliente_documento}`
            : 'Sin documento',
    };
}

function prepararPagoParaAnulacion(pago) {
    const tipo = limpiarTexto(pago.medio_pago_tipo || pago.metodo_pago || 'otro');

    return {
        ...pago,
        monto: normalizarEntero(pago.monto),
        monto_recibido: normalizarEntero(pago.monto_recibido),
        cambio_entregado: normalizarEntero(pago.cambio_entregado),
        id_medio_pago: normalizarEntero(pago.id_medio_pago),
        id_usuario: normalizarEntero(pago.id_usuario),
        medio_pago_tipo: tipo,
        medio_pago_afecta_efectivo_caja: normalizarEntero(pago.medio_pago_afecta_efectivo_caja),
        medio_pago_nombre: limpiarTexto(pago.medio_pago_nombre || pago.entidad || pago.metodo_pago),
    };
}

function calcularReversaCajaAnulacion({ venta, pagos }) {
    const reversa = {
        total_ventas: normalizarEntero(venta.total),
        total_efectivo: 0,
        total_transferencia: 0,
        total_tarjeta: 0,
        total_otros: 0,
        monto_esperado: 0,
    };

    pagos.forEach((pago) => {
        if (pago.estado !== 'registrado') {
            return;
        }

        const tipo = limpiarTexto(pago.medio_pago_tipo || pago.metodo_pago || 'otro');
        const monto = normalizarEntero(pago.monto);
        const afectaEfectivo = normalizarEntero(pago.medio_pago_afecta_efectivo_caja) === 1;

        if (tipo === 'efectivo') {
            reversa.total_efectivo += monto;
        } else if (tipo === 'transferencia') {
            reversa.total_transferencia += monto;
        } else if (tipo === 'tarjeta') {
            reversa.total_tarjeta += monto;
        } else {
            reversa.total_otros += monto;
        }

        if (afectaEfectivo) {
            reversa.monto_esperado += monto;
        }
    });

    return reversa;
}

function prepararPlanInventarioAnulacion({ detalle, movimientos }) {
    const problemas = [];
    const plan = [];

    detalle.forEach((item) => {
        const idProducto = normalizarId(item.id_producto);

        if (!idProducto) {
            problemas.push(`El producto "${item.nombre_producto}" no tiene ID de producto asociado.`);
            return;
        }

        const producto = ventasRepository.obtenerProductoBasicoParaAnulacion(idProducto);

        if (!producto) {
            problemas.push(`El producto "${item.nombre_producto}" ya no existe.`);
            return;
        }

        if (producto.eliminado_en) {
            problemas.push(`El producto "${item.nombre_producto}" fue eliminado.`);
            return;
        }

        const controlaInventario = normalizarEntero(producto.controla_inventario);
        const cantidad = normalizarNumero(item.cantidad);
        const stockActual = normalizarNumero(producto.stock_actual);
        const stockNuevo = controlaInventario === 1
            ? Math.round((stockActual + cantidad) * 1000) / 1000
            : stockActual;

        const movimientoOriginal = movimientos.find((movimiento) => (
            normalizarEntero(movimiento.id_producto) === idProducto
            && limpiarTexto(movimiento.tipo_movimiento) === 'venta'
        ));

        plan.push({
            id_producto: idProducto,
            nombre_producto: item.nombre_producto,
            codigo_interno: item.codigo_interno,
            unidad_abreviatura: item.unidad_abreviatura,
            cantidad_vendida: cantidad,
            controla_inventario: controlaInventario,
            stock_actual: stockActual,
            stock_despues_anulacion: stockNuevo,
            costo_unitario: normalizarEntero(item.precio_costo_unitario),
            costo_total: normalizarEntero(item.costo_total),
            movimiento_original_encontrado: Boolean(movimientoOriginal),
        });
    });

    return {
        problemas,
        plan,
    };
}

function prepararAnulacionVenta(idVenta) {
    const id = normalizarId(idVenta);

    if (!id) {
        return crearError('La venta solicitada no es válida.');
    }

    const ventaRaw = ventasRepository.obtenerVentaParaAnulacion(id);

    if (!ventaRaw) {
        return crearError('No se encontró la venta solicitada.', 404);
    }

    const venta = prepararVentaParaAnulacion(ventaRaw);
    const detalle = ventasRepository.listarDetalleVentaParaAnulacion(id);
    const pagos = ventasRepository
        .listarPagosVentaParaAnulacion(id)
        .map(prepararPagoParaAnulacion);
    const movimientos = ventasRepository.listarMovimientosInventarioVenta(id);
    const anulacionExistente = ventasRepository.obtenerAnulacionVentaPorVenta(id);

    const problemas = [];

    if (venta.estado === 'anulada') {
        return {
            ok: true,
            puede_anular: false,
            mensaje: 'La venta ya está anulada.',
            problemas: [
                `La venta ${venta.numero_venta} ya está anulada.`,
            ],
            venta,
            detalle: [],
            pagos: [],
            movimientos_inventario: [],
            plan_inventario: [],
            reversa_caja: {
                total_ventas: 0,
                total_efectivo: 0,
                total_transferencia: 0,
                total_tarjeta: 0,
                total_otros: 0,
                monto_esperado: 0,
            },
        };
    }

    if (anulacionExistente) {
        return {
            ok: true,
            puede_anular: false,
            mensaje: 'La venta ya tiene una anulación registrada.',
            problemas: [
                `Ya existe una anulación registrada para la venta ${venta.numero_venta}.`,
            ],
            venta,
            detalle: [],
            pagos: [],
            movimientos_inventario: [],
            plan_inventario: [],
            reversa_caja: {
                total_ventas: 0,
                total_efectivo: 0,
                total_transferencia: 0,
                total_tarjeta: 0,
                total_otros: 0,
                monto_esperado: 0,
            },
        };
    }

    if (venta.estado !== 'pagada') {
        problemas.push(`La venta ${venta.numero_venta} no está pagada. Estado actual: ${venta.estado}.`);
    }

    if (!detalle.length) {
        problemas.push('La venta no tiene detalle de productos.');
    }

    const pagosRegistrados = pagos.filter((pago) => pago.estado === 'registrado');

    if (!pagosRegistrados.length) {
        problemas.push('La venta no tiene pagos registrados activos para reversar.');
    }

    if (!venta.id_turno_caja) {
        problemas.push('La venta no tiene turno de caja asociado.');
    }

    if (venta.turno_estado !== 'abierto') {
        problemas.push('El turno de caja asociado a esta venta no está abierto. En esta fase solo se anulan ventas del turno abierto.');
    }

    const inventario = prepararPlanInventarioAnulacion({
        detalle,
        movimientos,
    });

    inventario.problemas.forEach((problema) => problemas.push(problema));

    const reversaCaja = calcularReversaCajaAnulacion({
        venta,
        pagos,
    });

    return {
        ok: true,
        puede_anular: problemas.length === 0,
        mensaje: problemas.length === 0
            ? 'La venta puede anularse.'
            : 'La venta tiene pendientes antes de anularse.',
        problemas,
        venta,
        detalle: detalle.map((item) => ({
            ...item,
            cantidad: normalizarNumero(item.cantidad),
            precio_unitario: normalizarEntero(item.precio_unitario),
            precio_costo_unitario: normalizarEntero(item.precio_costo_unitario),
            subtotal: normalizarEntero(item.subtotal),
            impuesto_total: normalizarEntero(item.impuesto_total),
            total_linea: normalizarEntero(item.total_linea),
            costo_total: normalizarEntero(item.costo_total),
        })),
        pagos,
        movimientos_inventario: movimientos,
        plan_inventario: inventario.plan,
        reversa_caja: reversaCaja,
    };
}

function anularVentaCompleta({ idVenta, idUsuario, payload = {} } = {}) {
    const idUsuarioNormalizado = normalizarId(idUsuario);

    if (!idUsuarioNormalizado) {
        return crearError('No se pudo identificar el usuario autenticado.', 401);
    }

    const motivoAnulacion = limpiarTexto(payload.motivo_anulacion || payload.motivo);

    if (!motivoAnulacion) {
        return crearError('Debes digitar el motivo de la anulación.');
    }

    if (motivoAnulacion.length < 8) {
        return crearError('El motivo de anulación debe ser más descriptivo.');
    }

    const preparacion = prepararAnulacionVenta(idVenta);

    if (!preparacion.ok) {
        return preparacion;
    }

    if (!preparacion.puede_anular) {
        return crearError(preparacion.problemas.join(' '));
    }

    try {
        const registro = ventasRepository.anularVentaCompleta({
            venta: preparacion.venta,
            detalle: preparacion.detalle,
            pagos: preparacion.pagos,
            reversa_caja: preparacion.reversa_caja,
            id_usuario: idUsuarioNormalizado,
            motivo_anulacion: motivoAnulacion,
            observaciones: limpiarTexto(payload.observaciones),
        });

        return {
            ok: true,
            mensaje: `Venta ${registro.numero_venta} anulada correctamente.`,
            anulacion: {
                id_anulacion_venta: registro.id_anulacion_venta,
                id_venta: registro.id_venta,
                numero_venta: registro.numero_venta,
                estado: registro.estado,
                motivo_anulacion: motivoAnulacion,
            },
        };
    } catch (error) {
        console.error('Error anulando venta completa:', error);

        return crearError(
            'No se pudo anular la venta. Revisa los datos e intenta nuevamente.',
            500
        );
    }
}

module.exports = {
    obtenerEstadoPOS,
    buscarProductos,
    buscarClientes,
    obtenerProductoParaVenta,
    registrarVentaPOS,
    obtenerHistorialVentas,
    obtenerDetalleVenta,
    obtenerTicketVenta,
    obtenerCarritoInicial,
    prepararProductoParaVenta,
    agruparMediosPago,

    prepararAnulacionVenta,
    anularVentaCompleta,
};