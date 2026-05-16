const comprasRepository = require('./compras.repository');

const ESTADOS_PERMITIDOS = ['borrador', 'registrada', 'anulada'];
const LIMITE_POR_PAGINA = 20;
const CONDICIONES_PAGO_PERMITIDAS = ['contado', 'credito'];
const ESTADOS_PAGO_PERMITIDOS = ['pendiente', 'pagada', 'vencida', 'parcial'];

const TIPOS_SOPORTE_COMPRA = [
    {
        valor: 'factura_proveedor',
        etiqueta: 'Factura de proveedor',
    },
    {
        valor: 'cuenta_cobro',
        etiqueta: 'Cuenta de cobro',
    },
    {
        valor: 'remision',
        etiqueta: 'Remisión',
    },
    {
        valor: 'otro',
        etiqueta: 'Otro soporte',
    },
];

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(Number(valor || 0));
}

function obtenerFechaActualISO() {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
}

function normalizarEntero(valor, defecto = 0) {
    const numero = Number(String(valor ?? '').replace(',', '.'));

    if (!Number.isFinite(numero)) {
        return defecto;
    }

    return Math.max(0, Math.round(numero));
}

function normalizarNumero(valor, defecto = 0) {
    const numero = Number(String(valor ?? '').replace(',', '.'));

    if (!Number.isFinite(numero)) {
        return defecto;
    }

    return Math.max(0, numero);
}

function normalizarPorcentaje(valor, defecto = 0) {
    const numero = normalizarNumero(valor, defecto);

    if (numero > 100) {
        return 100;
    }

    return numero;
}

function normalizarPorcentajeIva(valor, defecto = 0) {
    const numero = normalizarNumero(valor, defecto);

    if (numero > 0 && numero <= 1) {
        return Math.min(numero * 100, 100);
    }

    return Math.min(numero, 100);
}

function formatearFecha(valor) {
    if (!valor) {
        return 'Sin fecha';
    }

    const fecha = new Date(`${valor}T00:00:00`);

    if (Number.isNaN(fecha.getTime())) {
        return valor;
    }

    return fecha.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

function esFechaISOValida(valor) {
    const texto = limpiarTexto(valor);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return false;
    }

    const [anio, mes, dia] = texto.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);

    return fecha.getFullYear() === anio
        && fecha.getMonth() === mes - 1
        && fecha.getDate() === dia;
}

function sumarDiasFechaISO(fechaISO, dias) {
    if (!esFechaISOValida(fechaISO)) {
        return '';
    }

    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    fecha.setDate(fecha.getDate() + normalizarEntero(dias, 0));

    const anioFinal = fecha.getFullYear();
    const mesFinal = String(fecha.getMonth() + 1).padStart(2, '0');
    const diaFinal = String(fecha.getDate()).padStart(2, '0');

    return `${anioFinal}-${mesFinal}-${diaFinal}`;
}

function compararFechasISO(fechaA, fechaB) {
    if (!esFechaISOValida(fechaA) || !esFechaISOValida(fechaB)) {
        return 0;
    }

    return fechaA.localeCompare(fechaB);
}

function calcularDiferenciaDiasISO(fechaInicio, fechaFin) {
    if (!esFechaISOValida(fechaInicio) || !esFechaISOValida(fechaFin)) {
        return 0;
    }

    const [anioInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [anioFin, mesFin, diaFin] = fechaFin.split('-').map(Number);

    const inicio = Date.UTC(anioInicio, mesInicio - 1, diaInicio);
    const fin = Date.UTC(anioFin, mesFin - 1, diaFin);

    return Math.max(0, Math.round((fin - inicio) / 86400000));
}

function prepararDatosPagoCompra(datos = {}, { fechaCompra = '', total = 0 } = {}) {
    const condicionPagoFormulario = limpiarTexto(datos.condicion_pago || 'contado').toLowerCase();
    const condicionPago = condicionPagoFormulario || 'contado';
    const totalSeguro = normalizarEntero(total, 0);

    if (condicionPago !== 'credito') {
        return {
            condicion_pago: 'contado',
            dias_plazo: 0,
            fecha_vencimiento: fechaCompra,
            estado_pago: 'pagada',
            fecha_pago: fechaCompra,
            total_pagado: totalSeguro,
            saldo_pendiente: 0,
        };
    }

    const fechaVencimientoFormulario = limpiarTexto(datos.fecha_vencimiento);
    const diasPlazoFormulario = normalizarEntero(datos.dias_plazo, 0);

    const fechaVencimiento = fechaVencimientoFormulario
        || sumarDiasFechaISO(fechaCompra, diasPlazoFormulario);

    const diasPlazoCalculado = calcularDiferenciaDiasISO(fechaCompra, fechaVencimiento);

    return {
        condicion_pago: 'credito',
        dias_plazo: diasPlazoCalculado,
        fecha_vencimiento: fechaVencimiento,
        estado_pago: 'pendiente',
        fecha_pago: null,
        total_pagado: 0,
        saldo_pendiente: totalSeguro,
    };
}

function obtenerEtiquetaCondicionPago(condicionPago) {
    return {
        contado: 'Contado',
        credito: 'Crédito',
    }[condicionPago] || 'Contado';
}

function obtenerEtiquetaEstadoPago(estadoPago) {
    return {
        pendiente: 'Pendiente',
        pagada: 'Pagada',
        vencida: 'Vencida',
        parcial: 'Parcial',
    }[estadoPago] || 'Pendiente';
}

function obtenerFechaActualISO() {
    const fecha = new Date();

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
}

function calcularDiasEntreFechasISO(fechaInicio, fechaFin) {
    if (!esFechaISOValida(fechaInicio) || !esFechaISOValida(fechaFin)) {
        return 0;
    }

    const [anioInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [anioFin, mesFin, diaFin] = fechaFin.split('-').map(Number);

    const inicio = Date.UTC(anioInicio, mesInicio - 1, diaInicio);
    const fin = Date.UTC(anioFin, mesFin - 1, diaFin);

    return Math.round((fin - inicio) / 86400000);
}

function prepararEstadoPagoVista(compra = {}) {
    const estadoDocumento = limpiarTexto(compra.estado).toLowerCase();
    const estadoPago = limpiarTexto(compra.estado_pago || 'pendiente').toLowerCase();
    const condicionPago = limpiarTexto(compra.condicion_pago || 'contado').toLowerCase();

    if (estadoDocumento === 'anulada') {
        return {
            estado_pago_visual: 'anulada',
            estado_pago_etiqueta: 'Anulada',
            estado_pago_badge: 'badge-muted',
            vencimiento_resumen: 'Compra anulada',
            dias_para_vencer: null,
        };
    }

    if (estadoPago === 'pagada' || condicionPago === 'contado') {
        return {
            estado_pago_visual: 'pagada',
            estado_pago_etiqueta: 'Pagada',
            estado_pago_badge: 'badge-success',
            vencimiento_resumen: 'Compra pagada',
            dias_para_vencer: 0,
        };
    }

    if (!esFechaISOValida(compra.fecha_vencimiento)) {
        return {
            estado_pago_visual: 'pendiente',
            estado_pago_etiqueta: 'Pendiente',
            estado_pago_badge: 'badge-warning',
            vencimiento_resumen: 'Sin fecha de vencimiento',
            dias_para_vencer: null,
        };
    }

    const hoy = obtenerFechaActualISO();
    const diasParaVencer = calcularDiasEntreFechasISO(hoy, compra.fecha_vencimiento);

    if (diasParaVencer < 0) {
        const diasVencidos = Math.abs(diasParaVencer);

        return {
            estado_pago_visual: 'vencida',
            estado_pago_etiqueta: 'Vencida',
            estado_pago_badge: 'badge-danger',
            vencimiento_resumen: `Venció hace ${diasVencidos} día(s)`,
            dias_para_vencer: diasParaVencer,
        };
    }

    if (diasParaVencer <= 7) {
        return {
            estado_pago_visual: 'proxima',
            estado_pago_etiqueta: 'Próxima a vencer',
            estado_pago_badge: 'badge-warning',
            vencimiento_resumen: diasParaVencer === 0
                ? 'Vence hoy'
                : `Vence en ${diasParaVencer} día(s)`,
            dias_para_vencer: diasParaVencer,
        };
    }

    return {
        estado_pago_visual: 'pendiente',
        estado_pago_etiqueta: 'Pendiente',
        estado_pago_badge: 'badge-muted',
        vencimiento_resumen: `Vence en ${diasParaVencer} día(s)`,
        dias_para_vencer: diasParaVencer,
    };
}

function prepararFiltros(query = {}) {
    const paginaSolicitada = Number(query.pagina);
    const pagina = paginaSolicitada > 0 ? Math.floor(paginaSolicitada) : 1;

    const estado = limpiarTexto(query.estado);

    return {
        busqueda: limpiarTexto(query.busqueda),
        estado: ESTADOS_PERMITIDOS.includes(estado) ? estado : '',
        pagina,
        limite: LIMITE_POR_PAGINA,
        offset: (pagina - 1) * LIMITE_POR_PAGINA,
    };
}

function prepararProveedorParaCompra(proveedor) {
    const nombre =
        proveedor.nombre_comercial ||
        proveedor.razon_social ||
        `Proveedor #${proveedor.id_proveedor}`;

    const documento = proveedor.documento
        ? `${proveedor.tipo_documento || 'Doc'} ${proveedor.documento}`
        : 'Sin documento';

    return {
        ...proveedor,
        nombre_mostrar: nombre,
        documento_mostrar: documento,
    };
}

function calcularLineaCompra(linea = {}) {
    const cantidad = normalizarNumero(linea.cantidad, 0);
    const costoUnitario = normalizarEntero(linea.costo_unitario, 0);
    const descuentoPorcentaje = normalizarPorcentaje(linea.descuento_porcentaje, 0);
    const porcentajeIva = normalizarPorcentajeIva(linea.porcentaje_iva, 0);
    const gananciaPorcentaje = normalizarNumero(linea.ganancia_sobre_costo_porcentaje, 0);

    const descuentoUnitario = costoUnitario * (descuentoPorcentaje / 100);
    const costoUnitarioNeto = Math.max(0, costoUnitario - descuentoUnitario);
    const ivaUnitario = costoUnitarioNeto * (porcentajeIva / 100);
    const costoUnitarioFinal = costoUnitarioNeto + ivaUnitario;

    const subtotalLinea = costoUnitarioNeto * cantidad;
    const descuentoLinea = descuentoUnitario * cantidad;
    const ivaLinea = ivaUnitario * cantidad;
    const totalLinea = costoUnitarioFinal * cantidad;

    const precioVentaSugerido = costoUnitarioFinal * (1 + gananciaPorcentaje / 100);

    return {
        id_producto: Number(linea.id_producto || 0),
        cantidad,
        costo_unitario: costoUnitario,
        descuento_porcentaje: descuentoPorcentaje,
        porcentaje_iva: porcentajeIva,
        ganancia_sobre_costo_porcentaje: gananciaPorcentaje,

        descuento_linea: normalizarEntero(descuentoLinea),
        costo_unitario_neto: normalizarEntero(costoUnitarioNeto),
        iva_unitario: normalizarEntero(ivaUnitario),
        costo_unitario_final: normalizarEntero(costoUnitarioFinal),

        subtotal_linea: normalizarEntero(subtotalLinea),
        iva_linea: normalizarEntero(ivaLinea),
        total_linea: normalizarEntero(totalLinea),

        precio_venta_anterior: normalizarEntero(linea.precio_venta_anterior || linea.precio_venta_actual || 0),
        precio_venta_sugerido: normalizarEntero(precioVentaSugerido),
        actualizar_precio_venta: Number(linea.actualizar_precio_venta || 0) === 1 ? 1 : 0,
        precio_venta_nuevo: normalizarEntero(
            linea.precio_venta_nuevo || precioVentaSugerido
        ),
    };
}

function normalizarLineasFormulario(lineasFormulario) {
    if (Array.isArray(lineasFormulario)) {
        return lineasFormulario;
    }

    if (!lineasFormulario || typeof lineasFormulario !== 'object') {
        return [];
    }

    return Object.values(lineasFormulario);
}

function validarYCalcularCompra(datos = {}) {
    const errores = [];

    const idProveedor = Number(datos.id_proveedor || 0);
    const fechaCompra = limpiarTexto(datos.fecha_compra);
    const tipoSoporte = limpiarTexto(datos.tipo_soporte || 'factura_proveedor');
    const numeroSoporte = limpiarTexto(datos.numero_soporte);
    const observaciones = limpiarTexto(datos.observaciones);

    if (!idProveedor) {
        errores.push('Selecciona un proveedor para la compra.');
    }

    if (!fechaCompra) {
        errores.push('Selecciona la fecha de compra.');
    }

    if (!TIPOS_SOPORTE_COMPRA.some((tipo) => tipo.valor === tipoSoporte)) {
        errores.push('Selecciona un tipo de soporte válido.');
    }

    const lineasOriginales = normalizarLineasFormulario(datos.lineas);

    if (lineasOriginales.length === 0) {
        errores.push('Agrega al menos un producto a la compra.');
    }

    const idsProductos = new Set();
    const lineasCalculadas = [];

    lineasOriginales.forEach((linea, indice) => {
        const calculada = calcularLineaCompra(linea);
        const numeroLinea = indice + 1;

        if (!calculada.id_producto) {
            errores.push(`La línea ${numeroLinea} no tiene un producto válido.`);
        }

        if (idsProductos.has(calculada.id_producto)) {
            errores.push(`La línea ${numeroLinea} tiene un producto repetido.`);
        }

        idsProductos.add(calculada.id_producto);

        if (calculada.cantidad <= 0) {
            errores.push(`La línea ${numeroLinea} debe tener una cantidad mayor a cero.`);
        }

        if (calculada.costo_unitario <= 0) {
            errores.push(`La línea ${numeroLinea} debe tener un costo unitario mayor a cero.`);
        }

        if (calculada.actualizar_precio_venta === 1 && calculada.precio_venta_nuevo <= 0) {
            errores.push(`La línea ${numeroLinea} debe tener un precio de venta nuevo válido.`);
        }

        lineasCalculadas.push(calculada);
    });

    const totales = lineasCalculadas.reduce(
        (acumulado, linea) => {
            acumulado.subtotal += linea.subtotal_linea;
            acumulado.descuento += linea.descuento_linea;
            acumulado.iva_total += linea.iva_linea;
            acumulado.total += linea.total_linea;

            return acumulado;
        },
        {
            subtotal: 0,
            descuento: 0,
            iva_total: 0,
            total: 0,
        }
    );

    if (lineasCalculadas.length > 0 && totales.total <= 0) {
        errores.push('El total de la compra debe ser mayor a cero.');
    }

    const datosPago = prepararDatosPagoCompra(datos, {
        fechaCompra,
        total: totales.total,
    });

    if (!CONDICIONES_PAGO_PERMITIDAS.includes(datosPago.condicion_pago)) {
        errores.push('Selecciona una condición de pago válida.');
    }

    if (datosPago.condicion_pago === 'credito') {
        if (!limpiarTexto(datos.fecha_vencimiento) && normalizarEntero(datos.dias_plazo, 0) <= 0) {
            errores.push('Para una compra a crédito indica la fecha de vencimiento.');
        }

        if (!esFechaISOValida(datosPago.fecha_vencimiento)) {
            errores.push('La fecha de vencimiento no es válida.');
        }

        if (
            esFechaISOValida(fechaCompra)
            && esFechaISOValida(datosPago.fecha_vencimiento)
            && compararFechasISO(datosPago.fecha_vencimiento, fechaCompra) < 0
        ) {
            errores.push('La fecha de vencimiento no puede ser menor que la fecha de compra.');
        }
    }

    if (idProveedor && numeroSoporte) {
        const soporteYaExiste = comprasRepository.existeSoporteProveedorActivo(
            idProveedor,
            numeroSoporte
        );

        if (soporteYaExiste) {
            errores.push(
                'Este soporte proveedor ya fue registrado para el proveedor seleccionado.'
            );
        }
    }

    return {
        valido: errores.length === 0,
        errores,
        compra: {
            id_proveedor: idProveedor,
            fecha_compra: fechaCompra,
            tipo_soporte: tipoSoporte,
            numero_soporte: numeroSoporte,
            observaciones,
            subtotal: totales.subtotal,
            descuento: totales.descuento,
            iva_total: totales.iva_total,
            total: totales.total,
            condicion_pago: datosPago.condicion_pago,
            dias_plazo: datosPago.dias_plazo,
            fecha_vencimiento: datosPago.fecha_vencimiento,
            estado_pago: datosPago.estado_pago,
            fecha_pago: datosPago.fecha_pago,
            total_pagado: datosPago.total_pagado,
            saldo_pendiente: datosPago.saldo_pendiente,
        },
        lineas: lineasCalculadas,
    };
}

function prepararProductoParaCompra(producto) {
    const porcentajeIvaVentaVisual = normalizarPorcentajeIva(producto.porcentaje_iva);

    const costoReferencia =
        normalizarEntero(producto.costo_promedio) ||
        normalizarEntero(producto.ultimo_costo) ||
        normalizarEntero(producto.precio_costo);

    return {
        id_producto: producto.id_producto,
        codigo_interno: producto.codigo_interno,
        codigo_barras: producto.codigo_barras || '',
        nombre: producto.nombre,
        unidad_nombre: producto.unidad_nombre || 'Unidad',
        unidad_abreviatura: producto.unidad_abreviatura || 'und',
        unidad_permite_decimales: Number(producto.unidad_permite_decimales || 0),
        precio_costo: normalizarEntero(producto.precio_costo),
        precio_venta: normalizarEntero(producto.precio_venta),
        costo_promedio: normalizarEntero(producto.costo_promedio),
        ultimo_costo: normalizarEntero(producto.ultimo_costo),
        costo_referencia_compra: costoReferencia,
        stock_actual: normalizarNumero(producto.stock_actual),
        controla_inventario: Number(producto.controla_inventario || 0),
        maneja_iva_venta: Number(producto.maneja_iva || 0),
        porcentaje_iva_venta_visual: porcentajeIvaVentaVisual,
        precio_incluye_iva: Number(producto.precio_incluye_iva || 0),
        iva_compra_sugerido:
            Number(producto.maneja_iva || 0) === 1 ? porcentajeIvaVentaVisual : 0,
    };
}

function obtenerDatosFormularioNuevaCompra() {
    const proveedores = comprasRepository
        .listarProveedoresActivos({ limite: 300 })
        .map(prepararProveedorParaCompra);

    const siguienteNumero = comprasRepository.obtenerSiguienteNumeroCompra();

    return {
        fecha_compra: obtenerFechaActualISO(),
        numero_compra_sugerido: siguienteNumero.numero_compra,
        tipos_soporte: TIPOS_SOPORTE_COMPRA,
        condiciones_pago: [
            { valor: 'contado', etiqueta: 'Contado' },
            { valor: 'credito', etiqueta: 'Crédito' },
        ],
        proveedores,
    };
}

function buscarProductosParaCompra({ busqueda = '', limite = 20 } = {}) {
    return comprasRepository
        .buscarProductosParaCompra({
            busqueda: limpiarTexto(busqueda),
            limite,
        })
        .map(prepararProductoParaCompra);
}

function prepararCompraVista(compra) {
    const proveedorNombre =
        compra.proveedor_nombre_comercial ||
        compra.proveedor_razon_social ||
        `Proveedor #${compra.id_proveedor}`;

    return {
        ...compra,
        proveedor_nombre: proveedorNombre,
        proveedor_documento_mostrar: compra.proveedor_documento
            ? `${compra.proveedor_tipo_documento || 'Doc'} ${compra.proveedor_documento}`
            : 'Sin documento',
        soporte_mostrar: compra.numero_soporte || 'Sin soporte',
        fecha_compra_mostrar: formatearFecha(compra.fecha_compra),
        subtotal_mostrar: formatearMoneda(compra.subtotal),
        iva_total_mostrar: formatearMoneda(compra.iva_total),
        total_mostrar: formatearMoneda(compra.total),
        condicion_pago_etiqueta: obtenerEtiquetaCondicionPago(compra.condicion_pago),
        fecha_vencimiento_mostrar: formatearFecha(compra.fecha_vencimiento),
        fecha_pago_mostrar: compra.fecha_pago ? formatearFecha(compra.fecha_pago) : 'Sin registrar',
        total_pagado_mostrar: formatearMoneda(compra.total_pagado),
        saldo_pendiente_mostrar: formatearMoneda(compra.saldo_pendiente),
        ...prepararEstadoPagoVista(compra),
        estado_etiqueta: {
            borrador: 'Borrador',
            registrada: 'Registrada',
            anulada: 'Anulada',
        }[compra.estado] || compra.estado,
    };
}

function guardarCompra(datos = {}, contexto = {}) {
    const resultadoValidacion = validarYCalcularCompra(datos);

    if (!resultadoValidacion.valido) {
        return {
            ok: false,
            codigoEstado: 422,
            errores: resultadoValidacion.errores,
        };
    }

    try {
        const resultado = comprasRepository.registrarCompraConInventario({
            compra: resultadoValidacion.compra,
            lineas: resultadoValidacion.lineas,
            usuario: contexto.usuario,
            ip: contexto.ip,
            userAgent: contexto.userAgent,
        });

        return {
            ok: true,
            compra: {
                id_compra: resultado.id_compra,
                numero_compra: resultado.numero_compra,
                total: resultadoValidacion.compra.total,
            },
            mensaje: `Compra ${resultado.numero_compra} registrada correctamente.`,
        };
    } catch (error) {
        const mensajeError = String(error.message || '');
        const esSoporteDuplicado = mensajeError.includes('compras.id_proveedor')
            && mensajeError.includes('compras.numero_soporte');

        return {
            ok: false,
            codigoEstado: esSoporteDuplicado ? 409 : 400,
            errores: [
                esSoporteDuplicado
                    ? 'Este soporte proveedor ya fue registrado para el proveedor seleccionado.'
                    : mensajeError || 'No se pudo registrar la compra.',
            ],
        };
    }
}

function prepararComercioDocumento(configuracion) {
    if (!configuracion) {
        return {
            nombre_mostrar: 'Comercio sin configurar',
            tipo_documento: 'NIT',
            documento: '',
            direccion: '',
            telefono: '',
            correo: '',
            mensaje_recibo: '',
        };
    }

    return {
        ...configuracion,
        nombre_mostrar:
            limpiarTexto(configuracion.nombre_comercial)
            || limpiarTexto(configuracion.nombre_negocio)
            || 'Comercio sin nombre',
        tipo_documento: limpiarTexto(configuracion.tipo_documento) || 'NIT',
        documento: limpiarTexto(configuracion.documento),
        direccion: limpiarTexto(configuracion.direccion),
        telefono: limpiarTexto(configuracion.telefono),
        correo: limpiarTexto(configuracion.correo),
        mensaje_recibo: limpiarTexto(configuracion.mensaje_recibo),
    };
}

function prepararDetalleLineaVista(linea) {
    return {
        ...linea,
        producto_nombre: linea.producto_nombre || `Producto #${linea.id_producto}`,
        producto_codigo: linea.producto_codigo || 'Sin código',
        unidad_abreviatura: linea.unidad_abreviatura || 'und',

        cantidad_mostrar: Number(linea.cantidad || 0).toLocaleString('es-CO'),
        costo_unitario_mostrar: formatearMoneda(linea.costo_unitario),
        descuento_linea_mostrar: formatearMoneda(linea.descuento_linea),
        costo_unitario_neto_mostrar: formatearMoneda(linea.costo_unitario_neto),
        iva_unitario_mostrar: formatearMoneda(linea.iva_unitario),
        costo_unitario_final_mostrar: formatearMoneda(linea.costo_unitario_final),
        subtotal_linea_mostrar: formatearMoneda(linea.subtotal_linea),
        iva_linea_mostrar: formatearMoneda(linea.iva_linea),
        total_linea_mostrar: formatearMoneda(linea.total_linea),

        stock_anterior_mostrar: Number(linea.stock_anterior || 0).toLocaleString('es-CO'),
        stock_nuevo_mostrar: Number(linea.stock_nuevo || 0).toLocaleString('es-CO'),

        ultimo_costo_anterior_mostrar: formatearMoneda(linea.ultimo_costo_anterior),
        costo_promedio_anterior_mostrar: formatearMoneda(linea.costo_promedio_anterior),
        costo_promedio_nuevo_mostrar: formatearMoneda(linea.costo_promedio_nuevo),

        precio_venta_anterior_mostrar: formatearMoneda(linea.precio_venta_anterior),
        precio_venta_sugerido_mostrar: formatearMoneda(linea.precio_venta_sugerido),
        precio_venta_nuevo_mostrar: formatearMoneda(linea.precio_venta_nuevo),
        actualizo_precio: Number(linea.actualizar_precio_venta || 0) === 1,
    };
}

function obtenerDetalleCompra(idCompra) {
    const compra = comprasRepository.obtenerCompraPorId(idCompra);

    if (!compra) {
        return null;
    }

    const proveedorNombre =
        compra.proveedor_nombre_comercial ||
        compra.proveedor_razon_social ||
        `Proveedor #${compra.id_proveedor}`;

    const detalle = comprasRepository
        .listarDetalleCompra(compra.id_compra)
        .map(prepararDetalleLineaVista);

    return {
        compra: {
            ...compra,
            proveedor_nombre: proveedorNombre,
            proveedor_documento_mostrar: compra.proveedor_documento
                ? `${compra.proveedor_tipo_documento || 'Doc'} ${compra.proveedor_documento}`
                : 'Sin documento',
            soporte_mostrar: compra.numero_soporte || 'Sin soporte',
            fecha_compra_mostrar: formatearFecha(compra.fecha_compra),
            fecha_registro_mostrar: compra.fecha_registro || '',
            subtotal_mostrar: formatearMoneda(compra.subtotal),
            iva_total_mostrar: formatearMoneda(compra.iva_total),
            total_mostrar: formatearMoneda(compra.total),
            condicion_pago_etiqueta: obtenerEtiquetaCondicionPago(compra.condicion_pago),
            fecha_vencimiento_mostrar: formatearFecha(compra.fecha_vencimiento),
            fecha_pago_mostrar: compra.fecha_pago ? formatearFecha(compra.fecha_pago) : 'Sin registrar',
            total_pagado_mostrar: formatearMoneda(compra.total_pagado),
            saldo_pendiente_mostrar: formatearMoneda(compra.saldo_pendiente),
            ...prepararEstadoPagoVista(compra),
            estado_etiqueta: {
                borrador: 'Borrador',
                registrada: 'Registrada',
                anulada: 'Anulada',
            }[compra.estado] || compra.estado,
        },
        detalle,
    };
}

function obtenerDocumentoCompraImprimible(idCompra) {
    const resultado = obtenerDetalleCompra(idCompra);

    if (!resultado) {
        return null;
    }

    const configuracion = comprasRepository.obtenerConfiguracionNegocio();

    return {
        comercio: prepararComercioDocumento(configuracion),
        compra: resultado.compra,
        detalle: resultado.detalle,
    };
}

function listarCompras(query = {}) {
    const filtrosIniciales = prepararFiltros(query);
    const totalResultados = comprasRepository.contarCompras(filtrosIniciales);
    const totalPaginas = Math.max(1, Math.ceil(totalResultados / filtrosIniciales.limite));
    const paginaActual = Math.min(filtrosIniciales.pagina, totalPaginas);

    const filtros = {
        ...filtrosIniciales,
        pagina: paginaActual,
        offset: (paginaActual - 1) * filtrosIniciales.limite,
    };

    const compras = comprasRepository
        .listarCompras(filtros)
        .map(prepararCompraVista);

    return {
        filtros,
        compras,
        total_resultados: totalResultados,
        limite_resultados: filtros.limite,
        pagina_actual: paginaActual,
        total_paginas: totalPaginas,
        tiene_pagina_anterior: paginaActual > 1,
        tiene_pagina_siguiente: paginaActual < totalPaginas,
        pagina_anterior: Math.max(1, paginaActual - 1),
        pagina_siguiente: Math.min(totalPaginas, paginaActual + 1),
    };
}

module.exports = {
    listarCompras,
    obtenerDatosFormularioNuevaCompra,
    buscarProductosParaCompra,
    validarYCalcularCompra,
    guardarCompra,
    obtenerDetalleCompra,
    obtenerDocumentoCompraImprimible,
};