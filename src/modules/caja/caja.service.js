const cajaRepository = require('./caja.repository');

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
    return {
        ...medioPago,
        requiere_referencia: Number(medioPago.requiere_referencia || 0),
        afecta_efectivo_caja: Number(medioPago.afecta_efectivo_caja || 0),
        activo: Number(medioPago.activo || 0),
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
        tipo_movimiento_texto: traducirTipoMovimiento(movimiento.tipo_movimiento),
        metodo_pago_texto: movimiento.nombre_medio_pago
            || traducirMetodoPago(movimiento.metodo_pago),
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
        turnosRecientes,
        mediosPago,
        mediosPagoAgrupados,
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

module.exports = {
    obtenerEstadoCaja,
    abrirCaja,
    normalizarMontoEntero,
    traducirTipoMovimiento,
    traducirMetodoPago,
};