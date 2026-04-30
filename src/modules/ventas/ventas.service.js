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

    return {
        id_cliente: cliente.id_cliente,
        tipo_documento: tipoDocumento,
        documento,
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        correo: cliente.correo || '',
        direccion: cliente.direccion || '',
        es_consumidor_final: normalizarEntero(cliente.es_consumidor_final),
        estado: cliente.estado,
        etiqueta_documento: `${tipoDocumento} ${documento}`,
        texto_secundario: [
            documento ? `${tipoDocumento} ${documento}` : null,
            cliente.telefono || null,
            cliente.correo || null,
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

module.exports = {
    obtenerEstadoPOS,
    buscarProductos,
    buscarClientes,
    obtenerProductoParaVenta,
    registrarVentaPOS,
    obtenerTicketVenta,
    obtenerCarritoInicial,
    prepararProductoParaVenta,
    agruparMediosPago,
};