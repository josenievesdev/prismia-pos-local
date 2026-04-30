const db = require('../../config/db');

const TABLAS = [
    'turnos_caja',
    'movimientos_caja',
    'ventas',
    'detalle_ventas',
    'pagos_venta',
    'medios_pago',
    'comprobantes',
];

function tablaExiste(nombreTabla) {
    const resultado = db
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
            LIMIT 1
        `)
        .get(nombreTabla);

    return Boolean(resultado);
}

function obtenerColumnas(nombreTabla) {
    if (!tablaExiste(nombreTabla)) {
        return [];
    }

    return db.prepare(`PRAGMA table_info(${nombreTabla})`).all();
}

function tieneColumna(nombreTabla, nombreColumna) {
    return obtenerColumnas(nombreTabla).some((columna) => columna.name === nombreColumna);
}

function imprimirTitulo(titulo) {
    console.log('\n====================================');
    console.log(titulo);
    console.log('====================================');
}

function imprimirSubtitulo(titulo) {
    console.log('\n------------------------------------');
    console.log(titulo);
    console.log('------------------------------------');
}

function imprimirColumnas() {
    imprimirTitulo('1. ESTRUCTURA DE TABLAS');

    for (const tabla of TABLAS) {
        imprimirSubtitulo(tabla);

        if (!tablaExiste(tabla)) {
            console.log('No existe.');
            continue;
        }

        const columnas = obtenerColumnas(tabla);

        for (const columna of columnas) {
            console.log(`${columna.name} | ${columna.type} | default: ${columna.dflt_value ?? 'NULL'}`);
        }
    }
}

function obtenerTurnoDiagnostico() {
    const argumento = process.argv[2];

    if (argumento && /^\d+$/.test(argumento)) {
        return db
            .prepare(`
                SELECT *
                FROM turnos_caja
                WHERE id_turno_caja = ?
                LIMIT 1
            `)
            .get(Number(argumento));
    }

    const turnoAbierto = db
        .prepare(`
            SELECT *
            FROM turnos_caja
            WHERE estado = 'abierto'
            ORDER BY fecha_apertura DESC, id_turno_caja DESC
            LIMIT 1
        `)
        .get();

    if (turnoAbierto) {
        return turnoAbierto;
    }

    return db
        .prepare(`
            SELECT *
            FROM turnos_caja
            ORDER BY id_turno_caja DESC
            LIMIT 1
        `)
        .get();
}

function obtenerCondicionPagosValidos() {
    const condiciones = [];

    if (tieneColumna('pagos_venta', 'estado')) {
        condiciones.push(`pv.estado = 'registrado'`);
    }

    if (tieneColumna('pagos_venta', 'anulado_en')) {
        condiciones.push(`pv.anulado_en IS NULL`);
    }

    return condiciones.length > 0 ? `AND ${condiciones.join(' AND ')}` : '';
}

function imprimirTurno(turno) {
    imprimirTitulo('2. TURNO ANALIZADO');

    if (!turno) {
        console.log('No hay turnos de caja registrados.');
        return;
    }

    console.table([{
        id_turno_caja: turno.id_turno_caja,
        estado: turno.estado,
        fecha_apertura: turno.fecha_apertura,
        fecha_cierre: turno.fecha_cierre,
        monto_inicial: turno.monto_inicial,
        total_ventas: turno.total_ventas,
        total_efectivo: turno.total_efectivo,
        total_transferencia: turno.total_transferencia,
        total_tarjeta: turno.total_tarjeta,
        total_otros: turno.total_otros,
        total_ingresos_manuales: turno.total_ingresos_manuales,
        total_egresos_manuales: turno.total_egresos_manuales,
        monto_esperado: turno.monto_esperado,
        monto_contado: turno.monto_contado,
        diferencia: turno.diferencia,
    }]);
}

function imprimirVentasPorTurno(idTurnoCaja) {
    imprimirTitulo('3. VENTAS REALES DEL TURNO');

    const resumenVentas = db
        .prepare(`
            SELECT
                estado,
                COUNT(*) AS cantidad,
                COALESCE(SUM(subtotal), 0) AS subtotal,
                COALESCE(SUM(impuesto_total), 0) AS impuesto_total,
                COALESCE(SUM(total), 0) AS total,
                COALESCE(SUM(total_pagado), 0) AS total_pagado,
                COALESCE(SUM(cambio_entregado), 0) AS cambio_entregado
            FROM ventas
            WHERE id_turno_caja = ?
            GROUP BY estado
            ORDER BY estado ASC
        `)
        .all(idTurnoCaja);

    console.table(resumenVentas);

    const ultimasVentas = db
        .prepare(`
            SELECT
                v.id_venta,
                v.numero_venta,
                v.fecha_venta,
                v.estado,
                v.total,
                v.total_pagado,
                v.cambio_entregado,
                c.nombre AS cliente,
                u.nombre AS cajero
            FROM ventas v
            LEFT JOIN clientes c
                ON c.id_cliente = v.id_cliente
            LEFT JOIN usuarios u
                ON u.id_usuario = v.id_usuario
            WHERE v.id_turno_caja = ?
            ORDER BY v.id_venta DESC
            LIMIT 10
        `)
        .all(idTurnoCaja);

    imprimirSubtitulo('Últimas 10 ventas del turno');
    console.table(ultimasVentas);
}

function imprimirPagosPorTurno(idTurnoCaja) {
    imprimirTitulo('4. PAGOS DE VENTAS POR MEDIO');

    const condicionPagos = obtenerCondicionPagosValidos();

    const pagos = db
        .prepare(`
            SELECT
                pv.metodo_pago,
                pv.id_medio_pago,
                COALESCE(mp.nombre, pv.entidad, 'Sin medio') AS medio_pago,
                COALESCE(mp.tipo, pv.metodo_pago) AS tipo_medio,
                COUNT(*) AS cantidad_pagos,
                COALESCE(SUM(pv.monto), 0) AS total_pagado,
                COALESCE(SUM(pv.monto_recibido), 0) AS total_recibido,
                COALESCE(SUM(pv.cambio_entregado), 0) AS total_cambio
            FROM pagos_venta pv
            INNER JOIN ventas v
                ON v.id_venta = pv.id_venta
            LEFT JOIN medios_pago mp
                ON mp.id_medio_pago = pv.id_medio_pago
            WHERE v.id_turno_caja = ?
              AND v.estado = 'pagada'
              ${condicionPagos}
            GROUP BY
                pv.metodo_pago,
                pv.id_medio_pago,
                COALESCE(mp.nombre, pv.entidad, 'Sin medio'),
                COALESCE(mp.tipo, pv.metodo_pago)
            ORDER BY
                pv.metodo_pago ASC,
                medio_pago ASC
        `)
        .all(idTurnoCaja);

    console.table(pagos);

    const totalesPorMetodo = db
        .prepare(`
            SELECT
                pv.metodo_pago,
                COUNT(*) AS cantidad_pagos,
                COALESCE(SUM(pv.monto), 0) AS total_pagado
            FROM pagos_venta pv
            INNER JOIN ventas v
                ON v.id_venta = pv.id_venta
            WHERE v.id_turno_caja = ?
              AND v.estado = 'pagada'
              ${condicionPagos}
            GROUP BY pv.metodo_pago
            ORDER BY pv.metodo_pago ASC
        `)
        .all(idTurnoCaja);

    imprimirSubtitulo('Totales por metodo_pago general');
    console.table(totalesPorMetodo);
}

function imprimirMovimientosCajaPorTurno(idTurnoCaja) {
    imprimirTitulo('5. MOVIMIENTOS DE CAJA DEL TURNO');

    const tieneIdMedioPago = tieneColumna('movimientos_caja', 'id_medio_pago');

    const movimientosPorTipo = db
        .prepare(`
            SELECT
                tipo_movimiento,
                metodo_pago,
                COUNT(*) AS cantidad,
                COALESCE(SUM(monto), 0) AS total
            FROM movimientos_caja
            WHERE id_turno_caja = ?
            GROUP BY tipo_movimiento, metodo_pago
            ORDER BY tipo_movimiento ASC, metodo_pago ASC
        `)
        .all(idTurnoCaja);

    console.table(movimientosPorTipo);

    if (tieneIdMedioPago) {
        const movimientosPorMedio = db
            .prepare(`
                SELECT
                    m.tipo_movimiento,
                    m.metodo_pago,
                    m.id_medio_pago,
                    COALESCE(mp.nombre, m.entidad_pago, 'Sin medio') AS medio_pago,
                    COALESCE(mp.tipo, m.metodo_pago) AS tipo_medio,
                    COUNT(*) AS cantidad,
                    COALESCE(SUM(m.monto), 0) AS total
                FROM movimientos_caja m
                LEFT JOIN medios_pago mp
                    ON mp.id_medio_pago = m.id_medio_pago
                WHERE m.id_turno_caja = ?
                GROUP BY
                    m.tipo_movimiento,
                    m.metodo_pago,
                    m.id_medio_pago,
                    COALESCE(mp.nombre, m.entidad_pago, 'Sin medio'),
                    COALESCE(mp.tipo, m.metodo_pago)
                ORDER BY
                    m.tipo_movimiento ASC,
                    m.metodo_pago ASC,
                    medio_pago ASC
            `)
            .all(idTurnoCaja);

        imprimirSubtitulo('Movimientos por medio específico');
        console.table(movimientosPorMedio);
    }

    const ultimosMovimientos = db
        .prepare(`
            SELECT
                id_movimiento_caja,
                tipo_movimiento,
                metodo_pago,
                monto,
                descripcion,
                referencia_tipo,
                referencia_id,
                creado_en
            FROM movimientos_caja
            WHERE id_turno_caja = ?
            ORDER BY id_movimiento_caja DESC
            LIMIT 15
        `)
        .all(idTurnoCaja);

    imprimirSubtitulo('Últimos 15 movimientos de caja');
    console.table(ultimosMovimientos);
}

function imprimirComparacionTurnoVsVentas(turno) {
    imprimirTitulo('6. COMPARACIÓN TURNO VS VENTAS REALES');

    const condicionPagos = obtenerCondicionPagosValidos();

    const ventasPagadas = db
        .prepare(`
            SELECT
                COUNT(*) AS cantidad,
                COALESCE(SUM(total), 0) AS total_ventas,
                COALESCE(SUM(total_pagado), 0) AS total_pagado,
                COALESCE(SUM(cambio_entregado), 0) AS cambio_entregado
            FROM ventas
            WHERE id_turno_caja = ?
              AND estado = 'pagada'
        `)
        .get(turno.id_turno_caja);

    const pagosPorMetodo = db
        .prepare(`
            SELECT
                pv.metodo_pago,
                COALESCE(SUM(pv.monto), 0) AS total
            FROM pagos_venta pv
            INNER JOIN ventas v
                ON v.id_venta = pv.id_venta
            WHERE v.id_turno_caja = ?
              AND v.estado = 'pagada'
              ${condicionPagos}
            GROUP BY pv.metodo_pago
        `)
        .all(turno.id_turno_caja);

    const acumuladosPagos = {
        efectivo: 0,
        transferencia: 0,
        tarjeta: 0,
        otro: 0,
    };

    for (const pago of pagosPorMetodo) {
        acumuladosPagos[pago.metodo_pago] = Number(pago.total || 0);
    }

    const movimientosVenta = db
        .prepare(`
            SELECT
                COALESCE(SUM(monto), 0) AS total_movimientos_venta,
                COUNT(*) AS cantidad_movimientos
            FROM movimientos_caja
            WHERE id_turno_caja = ?
              AND tipo_movimiento = 'venta'
        `)
        .get(turno.id_turno_caja);

    const comparacion = [{
        campo: 'total_ventas',
        valor_turno: Number(turno.total_ventas || 0),
        valor_ventas_reales: Number(ventasPagadas.total_ventas || 0),
        diferencia: Number(turno.total_ventas || 0) - Number(ventasPagadas.total_ventas || 0),
    }, {
        campo: 'total_efectivo',
        valor_turno: Number(turno.total_efectivo || 0),
        valor_pagos: acumuladosPagos.efectivo,
        diferencia: Number(turno.total_efectivo || 0) - acumuladosPagos.efectivo,
    }, {
        campo: 'total_transferencia',
        valor_turno: Number(turno.total_transferencia || 0),
        valor_pagos: acumuladosPagos.transferencia,
        diferencia: Number(turno.total_transferencia || 0) - acumuladosPagos.transferencia,
    }, {
        campo: 'total_tarjeta',
        valor_turno: Number(turno.total_tarjeta || 0),
        valor_pagos: acumuladosPagos.tarjeta,
        diferencia: Number(turno.total_tarjeta || 0) - acumuladosPagos.tarjeta,
    }, {
        campo: 'total_otros',
        valor_turno: Number(turno.total_otros || 0),
        valor_pagos: acumuladosPagos.otro,
        diferencia: Number(turno.total_otros || 0) - acumuladosPagos.otro,
    }];

    console.table(comparacion);

    imprimirSubtitulo('Ventas vs movimientos_caja tipo venta');
    console.table([{
        total_ventas_reales: Number(ventasPagadas.total_ventas || 0),
        cantidad_ventas: Number(ventasPagadas.cantidad || 0),
        total_movimientos_venta: Number(movimientosVenta.total_movimientos_venta || 0),
        cantidad_movimientos: Number(movimientosVenta.cantidad_movimientos || 0),
        diferencia:
            Number(ventasPagadas.total_ventas || 0)
            - Number(movimientosVenta.total_movimientos_venta || 0),
    }]);
}

function imprimirMediosPago() {
    imprimirTitulo('7. MEDIOS DE PAGO ACTIVOS');

    if (!tablaExiste('medios_pago')) {
        console.log('No existe tabla medios_pago.');
        return;
    }

    const medios = db
        .prepare(`
            SELECT
                id_medio_pago,
                codigo,
                nombre,
                tipo,
                requiere_referencia,
                afecta_efectivo_caja,
                activo,
                orden
            FROM medios_pago
            ORDER BY orden ASC, nombre ASC
        `)
        .all();

    console.table(medios);
}

function ejecutarDiagnostico() {
    imprimirTitulo('DIAGNÓSTICO CAJA + VENTAS');

    imprimirColumnas();

    const turno = obtenerTurnoDiagnostico();

    imprimirTurno(turno);

    if (!turno) {
        console.log('\nNo se puede continuar sin un turno de caja.');
        return;
    }

    imprimirVentasPorTurno(turno.id_turno_caja);
    imprimirPagosPorTurno(turno.id_turno_caja);
    imprimirMovimientosCajaPorTurno(turno.id_turno_caja);
    imprimirComparacionTurnoVsVentas(turno);
    imprimirMediosPago();

    imprimirTitulo('FIN DEL DIAGNÓSTICO');
    console.log(`Turno analizado: #${turno.id_turno_caja}`);
    console.log('Este script no modificó la base de datos.');
}

ejecutarDiagnostico();