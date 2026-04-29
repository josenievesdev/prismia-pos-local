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

module.exports = {
    obtenerEstadoCaja,
    obtenerDatosFormularioMovimiento,
    obtenerDatosFormularioGasto,
    obtenerValoresMovimientoPorDefecto,
    obtenerValoresGastoPorDefecto,
    prepararValoresMovimiento,
    prepararValoresGasto,
    abrirCaja,
    registrarMovimientoManual,
    registrarGastoDesdeCaja,
    normalizarMontoEntero,
    traducirTipoMovimiento,
    traducirMetodoPago,
};