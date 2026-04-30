const XLSX = require('xlsx');

const cajaRepository = require('./caja.repository');

const TIPOS_MOVIMIENTO_MANUAL = ['ingreso_manual', 'egreso_manual'];

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarMontoEntero(valor) {
    const texto = String(valor ?? '')
        .trim()
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    if (!texto) {
        return 0;
    }

    const numero = Number(texto);

    if (!Number.isFinite(numero)) {
        return null;
    }

    return Math.round(numero);
}

function normalizarMontoEnteroObligatorio(valor) {
    const textoOriginal = String(valor ?? '').trim();

    if (!textoOriginal) {
        return null;
    }

    return normalizarMontoEntero(valor);
}

function normalizarIdEntero(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

function prepararTurno(turno) {
    if (!turno) {
        return null;
    }

    const montoInicial = Number(turno.monto_inicial || 0);
    const totalEfectivo = Number(turno.total_efectivo || 0);
    const totalIngresosManuales = Number(turno.total_ingresos_manuales || 0);
    const totalEgresosManuales = Number(turno.total_egresos_manuales || 0);

    const montoEsperadoCalculado =
        montoInicial + totalEfectivo + totalIngresosManuales - totalEgresosManuales;

    return {
        ...turno,
        monto_inicial: montoInicial,
        total_ventas: Number(turno.total_ventas || 0),
        total_efectivo: totalEfectivo,
        total_transferencia: Number(turno.total_transferencia || 0),
        total_tarjeta: Number(turno.total_tarjeta || 0),
        total_otros: Number(turno.total_otros || 0),
        total_ingresos_manuales: totalIngresosManuales,
        total_egresos_manuales: totalEgresosManuales,
        monto_esperado: Number(turno.monto_esperado || montoEsperadoCalculado),
        monto_esperado_calculado: montoEsperadoCalculado,
        monto_contado:
            turno.monto_contado === null || typeof turno.monto_contado === 'undefined'
                ? null
                : Number(turno.monto_contado),
        diferencia:
            turno.diferencia === null || typeof turno.diferencia === 'undefined'
                ? null
                : Number(turno.diferencia),
    };
}

function prepararMedioPago(medioPago) {
    if (!medioPago) {
        return null;
    }

    return {
        ...medioPago,
        requiere_referencia: Number(medioPago.requiere_referencia || 0),
        afecta_efectivo_caja: Number(medioPago.afecta_efectivo_caja || 0),
        activo: Number(medioPago.activo || 0),
    };
}

function prepararCategoriaGasto(categoriaGasto) {
    if (!categoriaGasto) {
        return null;
    }

    return {
        ...categoriaGasto,
        estado: categoriaGasto.estado || 'inactivo',
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

function prepararResumenMedioPago(item) {
    return {
        ...item,
        requiere_referencia: Number(item.requiere_referencia || 0),
        afecta_efectivo_caja: Number(item.afecta_efectivo_caja || 0),
        activo: Number(item.activo || 0),
        cantidad_operaciones: Number(item.cantidad_operaciones || 0),
        total_ingresos: Number(item.total_ingresos || 0),
        total_egresos: Number(item.total_egresos || 0),
        saldo_neto: Number(item.saldo_neto || 0),
    };
}

function agruparResumenMediosPago(resumenMediosPago) {
    const grupos = {
        efectivo: [],
        transferencias: [],
        tarjetas: [],
        otros: [],
    };

    for (const item of resumenMediosPago) {
        if (item.tipo === 'efectivo') {
            grupos.efectivo.push(item);
            continue;
        }

        if (item.tipo === 'transferencia') {
            grupos.transferencias.push(item);
            continue;
        }

        if (item.tipo === 'tarjeta') {
            grupos.tarjetas.push(item);
            continue;
        }

        grupos.otros.push(item);
    }

    return grupos;
}

function calcularTotalesResumenMediosPago(resumenMediosPago) {
    return resumenMediosPago.reduce(
        (totales, item) => {
            totales.cantidad_operaciones += item.cantidad_operaciones;
            totales.total_ingresos += item.total_ingresos;
            totales.total_egresos += item.total_egresos;
            totales.saldo_neto += item.saldo_neto;

            if (item.tipo === 'efectivo') {
                totales.efectivo.ingresos += item.total_ingresos;
                totales.efectivo.egresos += item.total_egresos;
                totales.efectivo.saldo += item.saldo_neto;
            }

            if (item.tipo === 'transferencia') {
                totales.transferencias.ingresos += item.total_ingresos;
                totales.transferencias.egresos += item.total_egresos;
                totales.transferencias.saldo += item.saldo_neto;
            }

            if (item.tipo === 'tarjeta') {
                totales.tarjetas.ingresos += item.total_ingresos;
                totales.tarjetas.egresos += item.total_egresos;
                totales.tarjetas.saldo += item.saldo_neto;
            }

            if (item.tipo === 'otro') {
                totales.otros.ingresos += item.total_ingresos;
                totales.otros.egresos += item.total_egresos;
                totales.otros.saldo += item.saldo_neto;
            }

            return totales;
        },
        {
            cantidad_operaciones: 0,
            total_ingresos: 0,
            total_egresos: 0,
            saldo_neto: 0,
            efectivo: {
                ingresos: 0,
                egresos: 0,
                saldo: 0,
            },
            transferencias: {
                ingresos: 0,
                egresos: 0,
                saldo: 0,
            },
            tarjetas: {
                ingresos: 0,
                egresos: 0,
                saldo: 0,
            },
            otros: {
                ingresos: 0,
                egresos: 0,
                saldo: 0,
            },
        }
    );
}

function traducirTipoMovimiento(tipoMovimiento) {
    const traducciones = {
        ingreso_manual: 'Ingreso manual',
        egreso_manual: 'Egreso manual',
        venta: 'Venta',
        devolucion: 'Devolución',
        anulacion: 'Anulación',
        ajuste: 'Ajuste',
    };

    return traducciones[tipoMovimiento] || 'Movimiento';
}

function traducirMetodoPago(metodoPago) {
    const traducciones = {
        efectivo: 'Efectivo',
        transferencia: 'Transferencia',
        tarjeta: 'Tarjeta',
        otro: 'Otro',
    };

    return traducciones[metodoPago] || 'No definido';
}

function prepararMovimiento(movimiento) {
    return {
        ...movimiento,
        monto: Number(movimiento.monto || 0),
        afecta_efectivo_caja: Number(movimiento.afecta_efectivo_caja || 0),
        tipo_movimiento_texto: traducirTipoMovimiento(movimiento.tipo_movimiento),
        metodo_pago_texto:
            movimiento.nombre_medio_pago || traducirMetodoPago(movimiento.metodo_pago),
        tipo_medio_pago_texto: traducirMetodoPago(movimiento.tipo_medio_pago),
    };
}

function prepararGastoTurno(gasto) {
    return {
        ...gasto,
        monto: Number(gasto.monto || 0),
        afecta_caja: Number(gasto.afecta_caja || 0),
        afecta_efectivo_caja: Number(gasto.afecta_efectivo_caja || 0),
        metodo_pago_texto:
            gasto.nombre_medio_pago || traducirMetodoPago(gasto.metodo_pago),
        tipo_medio_pago_texto: traducirMetodoPago(gasto.tipo_medio_pago),
        estado_texto: gasto.estado === 'anulado' ? 'Anulado' : 'Registrado',
    };
}

function calcularTotalesGastosTurno(gastos) {
    return gastos.reduce(
        (totales, gasto) => {
            if (gasto.estado === 'anulado') {
                totales.anulados += gasto.monto;
                totales.cantidad_anulados += 1;
                return totales;
            }

            totales.total += gasto.monto;
            totales.cantidad += 1;

            if (gasto.afecta_efectivo_caja === 1) {
                totales.efectivo += gasto.monto;
            } else {
                totales.otros_medios += gasto.monto;
            }

            return totales;
        },
        {
            total: 0,
            efectivo: 0,
            otros_medios: 0,
            anulados: 0,
            cantidad: 0,
            cantidad_anulados: 0,
        }
    );
}

function prepararFacturaVentaTurno(factura) {
    const numeroComprobante =
        limpiarTexto(factura.comprobante_numero)
        || limpiarTexto(factura.numero_venta)
        || `Venta #${factura.id_venta}`;

    const clienteNombre =
        limpiarTexto(factura.cliente_nombre)
        || 'Consumidor final';

    const clienteDocumento = limpiarTexto(factura.cliente_documento);
    const clienteTipoDocumento =
        limpiarTexto(factura.cliente_tipo_documento)
        || 'CF';

    return {
        ...factura,
        id_venta: Number(factura.id_venta || 0),
        id_turno_caja: Number(factura.id_turno_caja || 0),
        numero_venta: limpiarTexto(factura.numero_venta) || numeroComprobante,
        numero_comprobante: numeroComprobante,
        fecha_venta: limpiarTexto(factura.fecha_venta),
        subtotal: Number(factura.subtotal || 0),
        descuento_total: Number(factura.descuento_total || 0),
        impuesto_total: Number(factura.impuesto_total || 0),
        total: Number(factura.total || 0),
        total_pagado: Number(factura.total_pagado || factura.total_pagado_calculado || 0),
        saldo_pendiente: Number(factura.saldo_pendiente || 0),
        cambio_entregado: Number(factura.cambio_entregado || 0),
        estado: limpiarTexto(factura.estado) || 'pagada',
        cliente_nombre: clienteNombre,
        cliente_tipo_documento: clienteTipoDocumento,
        cliente_documento: clienteDocumento,
        cliente_etiqueta: clienteDocumento
            ? `${clienteTipoDocumento} ${clienteDocumento}`
            : 'Sin documento',
        cajero_nombre: limpiarTexto(factura.cajero_nombre) || 'Usuario',
        medio_pago_nombre:
            limpiarTexto(factura.medios_pago_nombre)
            || 'Sin pago registrado',
        medio_pago_tipo:
            limpiarTexto(factura.medios_pago_tipo || factura.metodos_pago)
            || 'sin_tipo',
        cantidad_items: Number(factura.cantidad_items || 0),
        total_unidades: Number(factura.total_unidades || 0),
    };
}

function calcularTotalesFacturasTurno(facturas) {
    return facturas.reduce(
        (totales, factura) => {
            totales.cantidad += 1;
            totales.subtotal += factura.subtotal;
            totales.impuesto_total += factura.impuesto_total;
            totales.descuento_total += factura.descuento_total;
            totales.total += factura.total;
            totales.total_pagado += factura.total_pagado;
            totales.saldo_pendiente += factura.saldo_pendiente;
            totales.cambio_entregado += factura.cambio_entregado;
            totales.cantidad_items += factura.cantidad_items;
            totales.total_unidades += factura.total_unidades;

            if (factura.estado === 'pagada') {
                totales.pagadas.cantidad += 1;
                totales.pagadas.total += factura.total;
            } else if (factura.estado === 'anulada') {
                totales.anuladas.cantidad += 1;
                totales.anuladas.total += factura.total;
            } else {
                totales.otras.cantidad += 1;
                totales.otras.total += factura.total;
            }

            return totales;
        },
        {
            cantidad: 0,
            subtotal: 0,
            impuesto_total: 0,
            descuento_total: 0,
            total: 0,
            total_pagado: 0,
            saldo_pendiente: 0,
            cambio_entregado: 0,
            cantidad_items: 0,
            total_unidades: 0,
            pagadas: {
                cantidad: 0,
                total: 0,
            },
            anuladas: {
                cantidad: 0,
                total: 0,
            },
            otras: {
                cantidad: 0,
                total: 0,
            },
        }
    );
}

function obtenerGrupoMedioPago(tipo) {
    const grupos = {
        efectivo: 'Efectivo',
        transferencia: 'Transferencias',
        tarjeta: 'Tarjetas',
        otro: 'Otros',
    };

    return grupos[tipo] || 'Otros';
}

function obtenerMontoOperativoFirmado(movimiento) {
    const esEgreso = [
        'egreso_manual',
        'devolucion',
        'anulacion',
    ].includes(movimiento.tipo_movimiento);

    return esEgreso ? -Number(movimiento.monto || 0) : Number(movimiento.monto || 0);
}

function agregarHojaExcel(workbook, nombreHoja, filas, anchos = []) {
    const hoja = XLSX.utils.aoa_to_sheet(filas);

    if (anchos.length > 0) {
        hoja['!cols'] = anchos.map((ancho) => ({
            wch: ancho,
        }));
    }

    XLSX.utils.book_append_sheet(workbook, hoja, nombreHoja);
}

function obtenerDetalleArqueoTurno(idTurnoCaja) {
    const idTurno = normalizarIdEntero(idTurnoCaja);

    if (!idTurno) {
        return {
            ok: false,
            mensaje: 'El turno solicitado no es válido.',
        };
    }

    const turno = prepararTurno(cajaRepository.obtenerTurnoPorId(idTurno));

    if (!turno) {
        return {
            ok: false,
            mensaje: 'No se encontró el turno de caja solicitado.',
        };
    }

    const movimientos = cajaRepository
        .listarMovimientosCompletosPorTurno(idTurno)
        .map(prepararMovimiento);

    const resumenMediosPago = cajaRepository
        .listarResumenMovimientosPorMedio(idTurno)
        .map(prepararResumenMedioPago);

    const resumenMediosPagoAgrupado = agruparResumenMediosPago(resumenMediosPago);
    const totalesResumenMediosPago =
        calcularTotalesResumenMediosPago(resumenMediosPago);

    const gastos = cajaRepository
        .listarGastosPorTurno(idTurno)
        .map(prepararGastoTurno);

    const totalesGastos = calcularTotalesGastosTurno(gastos);

    const facturas = cajaRepository
        .listarFacturasVentasPorTurno(idTurno)
        .map(prepararFacturaVentaTurno);

    const totalesFacturas = calcularTotalesFacturasTurno(facturas);

    return {
        ok: true,
        arqueo: {
            turno,
            movimientos,
            resumenMediosPago,
            resumenMediosPagoAgrupado,
            totalesResumenMediosPago,
            gastos,
            totalesGastos,
            facturas,
            totalesFacturas,
            facturasPendientesDeIntegracion: false,
            mensajeFacturas: null,
        },
    };
}
function generarExcelArqueoTurno(idTurnoCaja) {
    const resultado = obtenerDetalleArqueoTurno(idTurnoCaja);

    if (!resultado.ok) {
        return resultado;
    }

    const { arqueo } = resultado;
    const {
        turno,
        movimientos,
        resumenMediosPago,
        gastos,
        totalesResumenMediosPago,
        totalesGastos,
        facturasPendientesDeIntegracion,
        mensajeFacturas,
    } = arqueo;

    const workbook = XLSX.utils.book_new();

    const filasResumen = [
        ['PRISMIA POS LOCAL - ARQUEO DE CAJA'],
        [],
        ['Turno', `#${turno.id_turno_caja}`],
        ['Estado', turno.estado],
        ['Usuario apertura', turno.usuario_apertura_nombre || 'Usuario'],
        ['Usuario cierre', turno.usuario_cierre_nombre || ''],
        ['Fecha apertura', turno.fecha_apertura || ''],
        ['Fecha cierre', turno.fecha_cierre || ''],
        [],
        ['RESUMEN DEL EFECTIVO'],
        ['Base inicial', turno.monto_inicial],
        ['Ventas en efectivo', turno.total_efectivo],
        ['Ingresos manuales', turno.total_ingresos_manuales],
        ['Egresos manuales', turno.total_egresos_manuales],
        ['Efectivo esperado', turno.monto_esperado_calculado],
        ['Efectivo contado', turno.monto_contado === null ? '' : turno.monto_contado],
        ['Diferencia', turno.diferencia === null ? '' : turno.diferencia],
        [],
        ['RESUMEN OPERATIVO'],
        ['Total ingresos', totalesResumenMediosPago.total_ingresos],
        ['Total egresos', totalesResumenMediosPago.total_egresos],
        ['Saldo neto operativo', totalesResumenMediosPago.saldo_neto],
        ['Cantidad operaciones', totalesResumenMediosPago.cantidad_operaciones],
        [],
        ['GASTOS'],
        ['Total gastos', totalesGastos.total],
        ['Gastos en efectivo', totalesGastos.efectivo],
        ['Gastos otros medios', totalesGastos.otros_medios],
        ['Gastos anulados', totalesGastos.anulados],
        ['Cantidad gastos registrados', totalesGastos.cantidad],
        ['Cantidad gastos anulados', totalesGastos.cantidad_anulados],
        [],
        ['OBSERVACIONES'],
        ['Observación apertura', turno.observaciones_apertura || ''],
        ['Observación cierre', turno.observaciones_cierre || ''],
    ];

    agregarHojaExcel(workbook, 'Resumen', filasResumen, [30, 35]);

    const filasMediosPago = [
        [
            'Grupo',
            'Medio',
            'Tipo',
            'Afecta efectivo físico',
            'Operaciones',
            'Ingresos',
            'Egresos',
            'Neto',
        ],
        ...resumenMediosPago.map((medio) => [
            obtenerGrupoMedioPago(medio.tipo),
            medio.nombre,
            medio.tipo,
            Number(medio.afecta_efectivo_caja || 0) === 1 ? 'Sí' : 'No',
            medio.cantidad_operaciones,
            medio.total_ingresos,
            medio.total_egresos,
            medio.saldo_neto,
        ]),
    ];

    agregarHojaExcel(
        workbook,
        'Medios de pago',
        filasMediosPago,
        [18, 22, 18, 22, 14, 16, 16, 16]
    );

    const filasMovimientos = [
        [
            'ID movimiento',
            'Fecha',
            'Tipo movimiento',
            'Medio pago',
            'Tipo medio',
            'Afecta efectivo físico',
            'Descripción',
            'Referencia tipo',
            'Referencia ID',
            'Referencia pago',
            'Entidad pago',
            'Usuario',
            'Monto',
            'Monto operativo',
        ],
        ...movimientos.map((movimiento) => [
            movimiento.id_movimiento_caja,
            movimiento.creado_en || '',
            movimiento.tipo_movimiento_texto || movimiento.tipo_movimiento,
            movimiento.metodo_pago_texto || movimiento.metodo_pago,
            movimiento.tipo_medio_pago_texto || movimiento.tipo_medio_pago || '',
            Number(movimiento.afecta_efectivo_caja || 0) === 1 ? 'Sí' : 'No',
            movimiento.descripcion || '',
            movimiento.referencia_tipo || '',
            movimiento.referencia_id || '',
            movimiento.referencia_pago || '',
            movimiento.entidad_pago || '',
            movimiento.usuario_nombre || '',
            movimiento.monto,
            obtenerMontoOperativoFirmado(movimiento),
        ]),
    ];

    agregarHojaExcel(
        workbook,
        'Movimientos',
        filasMovimientos,
        [14, 22, 20, 20, 18, 22, 36, 18, 14, 20, 20, 20, 14, 18]
    );

    const filasGastos = [
        [
            'ID gasto',
            'Fecha',
            'Categoría',
            'Descripción',
            'Medio pago',
            'Tipo medio',
            'Afecta caja',
            'Afecta efectivo físico',
            'Referencia pago',
            'Entidad pago',
            'Comprobante',
            'Estado',
            'Usuario',
            'Monto',
            'Anulado en',
            'Anulado por',
            'Motivo anulación',
        ],
        ...gastos.map((gasto) => [
            gasto.id_gasto,
            gasto.fecha_gasto || gasto.creado_en || '',
            gasto.categoria_nombre || '',
            gasto.descripcion || '',
            gasto.metodo_pago_texto || gasto.metodo_pago || '',
            gasto.tipo_medio_pago_texto || gasto.tipo_medio_pago || '',
            Number(gasto.afecta_caja || 0) === 1 ? 'Sí' : 'No',
            Number(gasto.afecta_efectivo_caja || 0) === 1 ? 'Sí' : 'No',
            gasto.referencia_pago || '',
            gasto.entidad_pago || '',
            gasto.comprobante_url || '',
            gasto.estado_texto || gasto.estado || '',
            gasto.usuario_nombre || '',
            gasto.monto,
            gasto.anulado_en || '',
            gasto.usuario_anulacion_nombre || '',
            gasto.motivo_anulacion || '',
        ]),
    ];

    agregarHojaExcel(
        workbook,
        'Gastos',
        filasGastos,
        [12, 22, 18, 36, 20, 18, 14, 22, 20, 20, 22, 16, 20, 14, 22, 20, 35]
    );

    const filasFacturas = facturasPendientesDeIntegracion
        ? [
            ['FACTURAS / VENTAS DEL TURNO'],
            [],
            ['Estado', 'Pendiente de integración POS/Ventas'],
            ['Nota', mensajeFacturas || ''],
            [],
            [
                'Columnas futuras',
                'Factura',
                'Fecha',
                'Cliente',
                'Cajero',
                'Estado',
                'Medio de pago',
                'Total',
                'Pagado',
                'Pendiente',
                'Devolución',
                'Anulación',
            ],
        ]
        : [
            ['Factura', 'Fecha', 'Cliente', 'Cajero', 'Estado', 'Medio pago', 'Total', 'Pagado', 'Pendiente'],
        ];

    agregarHojaExcel(
        workbook,
        'Facturas',
        filasFacturas,
        [22, 24, 24, 24, 18, 20, 16, 16, 16, 16, 18, 18]
    );

    const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
    });

    return {
        ok: true,
        buffer,
        nombreArchivo: `arqueo_caja_turno_${turno.id_turno_caja}.xlsx`,
    };
}

function obtenerEstadoCaja() {
    const turnoAbierto = prepararTurno(cajaRepository.obtenerTurnoAbierto());

    const movimientos = turnoAbierto
        ? cajaRepository
            .listarMovimientosPorTurno(turnoAbierto.id_turno_caja)
            .map(prepararMovimiento)
        : [];

    const resumenMediosPago = turnoAbierto
        ? cajaRepository
            .listarResumenMovimientosPorMedio(turnoAbierto.id_turno_caja)
            .map(prepararResumenMedioPago)
        : [];

    const resumenMediosPagoAgrupado = agruparResumenMediosPago(resumenMediosPago);
    const totalesResumenMediosPago =
        calcularTotalesResumenMediosPago(resumenMediosPago);

    const turnosRecientes = cajaRepository
        .listarTurnosRecientes(10)
        .map(prepararTurno);

    const mediosPago = cajaRepository
        .listarMediosPagoActivos()
        .map(prepararMedioPago);

    const mediosPagoAgrupados = agruparMediosPago(mediosPago);

    return {
        turnoAbierto,
        movimientos,
        resumenMediosPago,
        resumenMediosPagoAgrupado,
        totalesResumenMediosPago,
        turnosRecientes,
        mediosPago,
        mediosPagoAgrupados,
    };
}

function obtenerDatosFormularioMovimiento() {
    const turnoAbierto = prepararTurno(cajaRepository.obtenerTurnoAbierto());

    const mediosPago = cajaRepository
        .listarMediosPagoActivos()
        .map(prepararMedioPago);

    const mediosPagoAgrupados = agruparMediosPago(mediosPago);

    return {
        turnoAbierto,
        mediosPago,
        mediosPagoAgrupados,
        valores: obtenerValoresMovimientoPorDefecto(),
    };
}

function obtenerDatosFormularioGasto() {
    const turnoAbierto = prepararTurno(cajaRepository.obtenerTurnoAbierto());

    const mediosPago = cajaRepository
        .listarMediosPagoActivos()
        .map(prepararMedioPago);

    const mediosPagoAgrupados = agruparMediosPago(mediosPago);

    const categoriasGasto = cajaRepository
        .listarCategoriasGastoActivas()
        .map(prepararCategoriaGasto);

    return {
        turnoAbierto,
        mediosPago,
        mediosPagoAgrupados,
        categoriasGasto,
        valores: obtenerValoresGastoPorDefecto(),
    };
}

function obtenerDatosFormularioCierre() {
    const turnoAbierto = prepararTurno(cajaRepository.obtenerTurnoAbierto());

    const movimientos = turnoAbierto
        ? cajaRepository
            .listarMovimientosPorTurno(turnoAbierto.id_turno_caja)
            .map(prepararMovimiento)
        : [];

    const resumenMediosPago = turnoAbierto
        ? cajaRepository
            .listarResumenMovimientosPorMedio(turnoAbierto.id_turno_caja)
            .map(prepararResumenMedioPago)
        : [];

    const resumenMediosPagoAgrupado = agruparResumenMediosPago(resumenMediosPago);
    const totalesResumenMediosPago =
        calcularTotalesResumenMediosPago(resumenMediosPago);

    return {
        turnoAbierto,
        movimientos,
        resumenMediosPago,
        resumenMediosPagoAgrupado,
        totalesResumenMediosPago,
        valores: obtenerValoresCierrePorDefecto(turnoAbierto),
    };
}

function obtenerValoresMovimientoPorDefecto() {
    return {
        tipo_movimiento: 'ingreso_manual',
        id_medio_pago: '',
        monto: '',
        descripcion: '',
        referencia_pago: '',
        entidad_pago: '',
    };
}

function obtenerValoresGastoPorDefecto() {
    return {
        id_categoria_gasto: '',
        id_medio_pago: '',
        monto: '',
        descripcion: '',
        referencia_pago: '',
        entidad_pago: '',
        comprobante_url: '',
    };
}

function obtenerValoresCierrePorDefecto(turnoAbierto = null) {
    return {
        monto_contado: turnoAbierto
            ? String(turnoAbierto.monto_esperado_calculado || 0)
            : '',
        observaciones_cierre: '',
    };
}

function prepararValoresMovimiento(datosFormulario = {}) {
    return {
        tipo_movimiento: limpiarTexto(datosFormulario.tipo_movimiento || 'ingreso_manual'),
        id_medio_pago: datosFormulario.id_medio_pago || '',
        monto: datosFormulario.monto || '',
        descripcion: limpiarTexto(datosFormulario.descripcion),
        referencia_pago: limpiarTexto(datosFormulario.referencia_pago),
        entidad_pago: limpiarTexto(datosFormulario.entidad_pago),
    };
}

function prepararValoresGasto(datosFormulario = {}) {
    return {
        id_categoria_gasto: datosFormulario.id_categoria_gasto || '',
        id_medio_pago: datosFormulario.id_medio_pago || '',
        monto: datosFormulario.monto || '',
        descripcion: limpiarTexto(datosFormulario.descripcion),
        referencia_pago: limpiarTexto(datosFormulario.referencia_pago),
        entidad_pago: limpiarTexto(datosFormulario.entidad_pago),
        comprobante_url: limpiarTexto(datosFormulario.comprobante_url),
    };
}

function prepararValoresCierre(datosFormulario = {}) {
    return {
        monto_contado: datosFormulario.monto_contado || '',
        observaciones_cierre: limpiarTexto(datosFormulario.observaciones_cierre),
    };
}

function validarAperturaCaja({ montoInicial, observacionesApertura }) {
    if (montoInicial === null) {
        return 'La base inicial debe ser un número válido.';
    }

    if (montoInicial < 0) {
        return 'La base inicial no puede ser negativa.';
    }

    if (!Number.isInteger(montoInicial)) {
        return 'La base inicial debe registrarse en pesos enteros.';
    }

    if (montoInicial > 999999999) {
        return 'La base inicial es demasiado alta. Revisa el valor ingresado.';
    }

    if (observacionesApertura.length > 500) {
        return 'La observación de apertura no puede superar 500 caracteres.';
    }

    return null;
}

function abrirCaja({ datosFormulario, usuario, ip, userAgent }) {
    if (!usuario?.id_usuario) {
        return {
            ok: false,
            mensaje: 'No hay un usuario válido en sesión.',
        };
    }

    const turnoAbierto = cajaRepository.obtenerTurnoAbierto();

    if (turnoAbierto) {
        return {
            ok: false,
            mensaje: 'Ya existe una caja abierta. Debes cerrarla antes de abrir otra.',
        };
    }

    const montoInicial = normalizarMontoEntero(datosFormulario?.monto_inicial);
    const observacionesApertura = limpiarTexto(
        datosFormulario?.observaciones_apertura
    );

    const errorValidacion = validarAperturaCaja({
        montoInicial,
        observacionesApertura,
    });

    if (errorValidacion) {
        return {
            ok: false,
            mensaje: errorValidacion,
        };
    }

    const idTurnoCaja = cajaRepository.crearTurnoCaja({
        usuario,
        montoInicial,
        observacionesApertura,
        ip,
        userAgent,
    });

    return {
        ok: true,
        idTurnoCaja,
        mensaje: 'Caja abierta correctamente.',
    };
}

function validarMovimientoManual({
    turnoAbierto,
    usuario,
    tipoMovimiento,
    monto,
    medioPago,
    descripcion,
    referenciaPago,
    entidadPago,
}) {
    if (!usuario?.id_usuario) {
        return 'No hay un usuario válido en sesión.';
    }

    if (!turnoAbierto) {
        return 'No hay una caja abierta. Debes abrir caja antes de registrar movimientos.';
    }

    if (!TIPOS_MOVIMIENTO_MANUAL.includes(tipoMovimiento)) {
        return 'El tipo de movimiento no es válido.';
    }

    if (monto === null) {
        return 'El monto debe ser un número válido.';
    }

    if (!Number.isInteger(monto)) {
        return 'El monto debe registrarse en pesos enteros.';
    }

    if (monto <= 0) {
        return 'El monto debe ser mayor a cero.';
    }

    if (monto > 999999999) {
        return 'El monto es demasiado alto. Revisa el valor ingresado.';
    }

    if (!medioPago) {
        return 'Debes seleccionar un medio de pago válido.';
    }

    if (Number(medioPago.activo || 0) !== 1) {
        return 'El medio de pago seleccionado no está activo.';
    }

    if (!descripcion || descripcion.length < 3) {
        return 'La descripción del movimiento es obligatoria.';
    }

    if (descripcion.length > 300) {
        return 'La descripción no puede superar 300 caracteres.';
    }

    if (referenciaPago.length > 120) {
        return 'La referencia de pago no puede superar 120 caracteres.';
    }

    if (entidadPago.length > 120) {
        return 'La entidad de pago no puede superar 120 caracteres.';
    }

    if (Number(medioPago.requiere_referencia || 0) === 1 && !referenciaPago) {
        return `El medio de pago ${medioPago.nombre} requiere una referencia o comprobante.`;
    }

    const afectaEfectivo = Number(medioPago.afecta_efectivo_caja || 0) === 1;

    if (
        tipoMovimiento === 'egreso_manual'
        && afectaEfectivo
        && monto > Number(turnoAbierto.monto_esperado_calculado || 0)
    ) {
        return 'No puedes registrar un egreso en efectivo mayor al efectivo esperado actual.';
    }

    return null;
}

function validarGastoDesdeCaja({
    turnoAbierto,
    usuario,
    categoriaGasto,
    medioPago,
    monto,
    descripcion,
    referenciaPago,
    entidadPago,
    comprobanteUrl,
}) {
    if (!usuario?.id_usuario) {
        return 'No hay un usuario válido en sesión.';
    }

    if (!turnoAbierto) {
        return 'No hay una caja abierta. Debes abrir caja antes de registrar gastos.';
    }

    if (!categoriaGasto) {
        return 'Debes seleccionar una categoría de gasto válida.';
    }

    if (categoriaGasto.estado !== 'activo') {
        return 'La categoría de gasto seleccionada no está activa.';
    }

    if (!medioPago) {
        return 'Debes seleccionar un medio de pago válido.';
    }

    if (Number(medioPago.activo || 0) !== 1) {
        return 'El medio de pago seleccionado no está activo.';
    }

    if (monto === null) {
        return 'El monto del gasto debe ser un número válido.';
    }

    if (!Number.isInteger(monto)) {
        return 'El monto del gasto debe registrarse en pesos enteros.';
    }

    if (monto <= 0) {
        return 'El monto del gasto debe ser mayor a cero.';
    }

    if (monto > 999999999) {
        return 'El monto del gasto es demasiado alto. Revisa el valor ingresado.';
    }

    if (!descripcion || descripcion.length < 3) {
        return 'La descripción del gasto es obligatoria.';
    }

    if (descripcion.length > 300) {
        return 'La descripción del gasto no puede superar 300 caracteres.';
    }

    if (referenciaPago.length > 120) {
        return 'La referencia de pago no puede superar 120 caracteres.';
    }

    if (entidadPago.length > 120) {
        return 'La entidad de pago no puede superar 120 caracteres.';
    }

    if (comprobanteUrl.length > 300) {
        return 'La URL o ruta del comprobante no puede superar 300 caracteres.';
    }

    if (Number(medioPago.requiere_referencia || 0) === 1 && !referenciaPago) {
        return `El medio de pago ${medioPago.nombre} requiere una referencia o comprobante.`;
    }

    const afectaEfectivo = Number(medioPago.afecta_efectivo_caja || 0) === 1;

    if (afectaEfectivo && monto > Number(turnoAbierto.monto_esperado_calculado || 0)) {
        return 'No puedes registrar un gasto en efectivo mayor al efectivo esperado actual.';
    }

    return null;
}

function validarCierreCaja({
    turnoAbierto,
    usuario,
    montoContado,
    observacionesCierre,
}) {
    if (!usuario?.id_usuario) {
        return 'No hay un usuario válido en sesión.';
    }

    if (!turnoAbierto) {
        return 'No hay una caja abierta para cerrar.';
    }

    if (montoContado === null) {
        return 'El efectivo contado es obligatorio y debe ser un número válido.';
    }

    if (!Number.isInteger(montoContado)) {
        return 'El efectivo contado debe registrarse en pesos enteros.';
    }

    if (montoContado < 0) {
        return 'El efectivo contado no puede ser negativo.';
    }

    if (montoContado > 999999999) {
        return 'El efectivo contado es demasiado alto. Revisa el valor ingresado.';
    }

    if (observacionesCierre.length > 500) {
        return 'La observación de cierre no puede superar 500 caracteres.';
    }

    return null;
}

function registrarMovimientoManual({ datosFormulario, usuario, ip, userAgent }) {
    const valores = prepararValoresMovimiento(datosFormulario);

    const turnoAbierto = prepararTurno(cajaRepository.obtenerTurnoAbierto());

    const idMedioPago = normalizarIdEntero(valores.id_medio_pago);
    const medioPago = idMedioPago
        ? prepararMedioPago(cajaRepository.obtenerMedioPagoPorId(idMedioPago))
        : null;

    const monto = normalizarMontoEntero(valores.monto);

    const errorValidacion = validarMovimientoManual({
        turnoAbierto,
        usuario,
        tipoMovimiento: valores.tipo_movimiento,
        monto,
        medioPago,
        descripcion: valores.descripcion,
        referenciaPago: valores.referencia_pago,
        entidadPago: valores.entidad_pago,
    });

    if (errorValidacion) {
        return {
            ok: false,
            mensaje: errorValidacion,
            valores,
        };
    }

    const idMovimientoCaja = cajaRepository.crearMovimientoManual({
        turno: turnoAbierto,
        usuario,
        medioPago,
        tipoMovimiento: valores.tipo_movimiento,
        monto,
        descripcion: valores.descripcion,
        referenciaPago: valores.referencia_pago,
        entidadPago: valores.entidad_pago,
        ip,
        userAgent,
    });

    return {
        ok: true,
        idMovimientoCaja,
        mensaje: 'Movimiento de caja registrado correctamente.',
    };
}

function registrarGastoDesdeCaja({ datosFormulario, usuario, ip, userAgent }) {
    const valores = prepararValoresGasto(datosFormulario);

    const turnoAbierto = prepararTurno(cajaRepository.obtenerTurnoAbierto());

    const idCategoriaGasto = normalizarIdEntero(valores.id_categoria_gasto);
    const categoriaGasto = idCategoriaGasto
        ? prepararCategoriaGasto(
            cajaRepository.obtenerCategoriaGastoPorId(idCategoriaGasto)
        )
        : null;

    const idMedioPago = normalizarIdEntero(valores.id_medio_pago);
    const medioPago = idMedioPago
        ? prepararMedioPago(cajaRepository.obtenerMedioPagoPorId(idMedioPago))
        : null;

    const monto = normalizarMontoEntero(valores.monto);

    const errorValidacion = validarGastoDesdeCaja({
        turnoAbierto,
        usuario,
        categoriaGasto,
        medioPago,
        monto,
        descripcion: valores.descripcion,
        referenciaPago: valores.referencia_pago,
        entidadPago: valores.entidad_pago,
        comprobanteUrl: valores.comprobante_url,
    });

    if (errorValidacion) {
        return {
            ok: false,
            mensaje: errorValidacion,
            valores,
        };
    }

    const resultado = cajaRepository.crearGastoDesdeCaja({
        turno: turnoAbierto,
        usuario,
        categoriaGasto,
        medioPago,
        monto,
        descripcion: valores.descripcion,
        referenciaPago: valores.referencia_pago,
        entidadPago: valores.entidad_pago,
        comprobanteUrl: valores.comprobante_url,
        ip,
        userAgent,
    });

    return {
        ok: true,
        idGasto: resultado.idGasto,
        idMovimientoCaja: resultado.idMovimientoCaja,
        mensaje: 'Gasto registrado desde caja correctamente.',
    };
}

function cerrarCaja({ datosFormulario, usuario, ip, userAgent }) {
    const valores = prepararValoresCierre(datosFormulario);

    const turnoAbierto = prepararTurno(cajaRepository.obtenerTurnoAbierto());

    const montoContado = normalizarMontoEnteroObligatorio(valores.monto_contado);

    const errorValidacion = validarCierreCaja({
        turnoAbierto,
        usuario,
        montoContado,
        observacionesCierre: valores.observaciones_cierre,
    });

    if (errorValidacion) {
        return {
            ok: false,
            mensaje: errorValidacion,
            valores,
        };
    }

    const montoEsperado = Number(turnoAbierto.monto_esperado_calculado || 0);
    const diferencia = montoContado - montoEsperado;

    const turnoCerrado = cajaRepository.cerrarTurnoCaja({
        turno: turnoAbierto,
        usuario,
        montoContado,
        diferencia,
        observacionesCierre: valores.observaciones_cierre,
        ip,
        userAgent,
    });

    return {
        ok: true,
        turnoCerrado: prepararTurno(turnoCerrado),
        mensaje: 'Caja cerrada correctamente.',
    };
}

module.exports = {
    obtenerEstadoCaja,
    obtenerDetalleArqueoTurno,
    generarExcelArqueoTurno,
    obtenerDatosFormularioMovimiento,
    obtenerDatosFormularioGasto,
    obtenerDatosFormularioCierre,
    obtenerValoresMovimientoPorDefecto,
    obtenerValoresGastoPorDefecto,
    obtenerValoresCierrePorDefecto,
    prepararValoresMovimiento,
    prepararValoresGasto,
    prepararValoresCierre,
    abrirCaja,
    registrarMovimientoManual,
    registrarGastoDesdeCaja,
    cerrarCaja,
    normalizarMontoEntero,
    normalizarMontoEnteroObligatorio,
    traducirTipoMovimiento,
    traducirMetodoPago,
};