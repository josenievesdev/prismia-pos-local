const db = require('../../config/db');

function imprimirBloque(titulo) {
    console.log('\n====================================');
    console.log(titulo);
    console.log('====================================');
}

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

function listarTablasRelacionadas() {
    return db
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND (
                    name LIKE '%venta%'
                 OR name LIKE '%pago%'
                 OR name LIKE '%caja%'
                 OR name LIKE '%turno%'
                 OR name LIKE '%inventario%'
                 OR name LIKE '%movimiento%'
                 OR name LIKE '%producto%'
                 OR name LIKE '%numeracion%'
                 OR name LIKE '%devolucion%'
                 OR name LIKE '%credito%'
              )
            ORDER BY name ASC
        `)
        .all();
}

function listarColumnas(nombreTabla) {
    if (!tablaExiste(nombreTabla)) {
        return [];
    }

    return db
        .prepare(`PRAGMA table_info(${nombreTabla})`)
        .all()
        .map((columna) => ({
            tabla: nombreTabla,
            columna: columna.name,
            tipo: columna.type,
            requerido: columna.notnull,
            pk: columna.pk,
            valor_defecto: columna.dflt_value,
        }));
}

function contarRegistros(nombreTabla) {
    if (!tablaExiste(nombreTabla)) {
        return null;
    }

    const resultado = db
        .prepare(`SELECT COUNT(*) AS total FROM ${nombreTabla}`)
        .get();

    return resultado.total;
}

function obtenerUltimasVentas() {
    if (!tablaExiste('ventas')) {
        return [];
    }

    return db
        .prepare(`
            SELECT
                id_venta,
                numero_venta,
                id_cliente,
                id_usuario,
                id_turno_caja,
                fecha_venta,
                subtotal,
                impuesto_total,
                total,
                total_pagado,
                cambio_entregado,
                estado,
                observaciones
            FROM ventas
            ORDER BY id_venta DESC
            LIMIT 5
        `)
        .all();
}

function obtenerDetalleUltimaVenta() {
    if (!tablaExiste('detalle_ventas')) {
        return [];
    }

    const ultimaVenta = db
        .prepare(`
            SELECT id_venta
            FROM ventas
            ORDER BY id_venta DESC
            LIMIT 1
        `)
        .get();

    if (!ultimaVenta) {
        return [];
    }

    return db
        .prepare(`
            SELECT
                *
            FROM detalle_ventas
            WHERE id_venta = ?
            ORDER BY id_detalle_venta ASC
        `)
        .all(ultimaVenta.id_venta);
}

function buscarTablaPagos() {
    const candidatas = [
        'pagos_ventas',
        'ventas_pagos',
        'pagos_venta',
        'detalle_pagos_ventas',
        'pagos',
    ];

    return candidatas.find(tablaExiste) || null;
}

function obtenerPagosUltimaVenta() {
    const tablaPagos = buscarTablaPagos();

    if (!tablaPagos || !tablaExiste('ventas')) {
        return {
            tabla_pagos: tablaPagos,
            pagos: [],
        };
    }

    const ultimaVenta = db
        .prepare(`
            SELECT id_venta
            FROM ventas
            ORDER BY id_venta DESC
            LIMIT 1
        `)
        .get();

    if (!ultimaVenta) {
        return {
            tabla_pagos: tablaPagos,
            pagos: [],
        };
    }

    const columnas = listarColumnas(tablaPagos).map((columna) => columna.columna);
    const tieneIdVenta = columnas.includes('id_venta');

    if (!tieneIdVenta) {
        return {
            tabla_pagos: tablaPagos,
            pagos: [],
            aviso: `La tabla ${tablaPagos} no tiene columna id_venta.`,
        };
    }

    return {
        tabla_pagos: tablaPagos,
        pagos: db
            .prepare(`
                SELECT *
                FROM ${tablaPagos}
                WHERE id_venta = ?
                ORDER BY 1 DESC
                LIMIT 10
            `)
            .all(ultimaVenta.id_venta),
    };
}

function buscarTablaMovimientosInventario() {
    const candidatas = [
        'movimientos_inventario',
        'inventario_movimientos',
        'kardex',
        'movimientos_stock',
    ];

    return candidatas.find(tablaExiste) || null;
}

function obtenerMovimientosUltimaVenta() {
    const tablaMovimientos = buscarTablaMovimientosInventario();

    if (!tablaMovimientos || !tablaExiste('ventas')) {
        return {
            tabla_movimientos: tablaMovimientos,
            movimientos: [],
        };
    }

    const ultimaVenta = db
        .prepare(`
            SELECT id_venta
            FROM ventas
            ORDER BY id_venta DESC
            LIMIT 1
        `)
        .get();

    if (!ultimaVenta) {
        return {
            tabla_movimientos: tablaMovimientos,
            movimientos: [],
        };
    }

    const columnas = listarColumnas(tablaMovimientos).map((columna) => columna.columna);

    let where = '';
    let params = [];

    if (columnas.includes('id_venta')) {
        where = 'WHERE id_venta = ?';
        params = [ultimaVenta.id_venta];
    } else if (columnas.includes('referencia_id') && columnas.includes('referencia_tipo')) {
        where = `WHERE referencia_tipo = 'venta' AND referencia_id = ?`;
        params = [ultimaVenta.id_venta];
    } else {
        return {
            tabla_movimientos: tablaMovimientos,
            movimientos: [],
            aviso: `No se encontró relación directa con venta en ${tablaMovimientos}.`,
        };
    }

    return {
        tabla_movimientos: tablaMovimientos,
        movimientos: db
            .prepare(`
                SELECT *
                FROM ${tablaMovimientos}
                ${where}
                ORDER BY 1 DESC
                LIMIT 20
            `)
            .all(...params),
    };
}

function obtenerTurnoAbierto() {
    if (!tablaExiste('turnos_caja')) {
        return null;
    }

    return db
        .prepare(`
            SELECT *
            FROM turnos_caja
            WHERE estado = 'abierto'
            ORDER BY id_turno_caja DESC
            LIMIT 1
        `)
        .get();
}

function obtenerNumeraciones() {
    if (!tablaExiste('numeraciones_documentos')) {
        return [];
    }

    return db
        .prepare(`
            SELECT
                id_numeracion,
                codigo_documento,
                nombre_documento,
                prefijo,
                ultimo_consecutivo,
                activo
            FROM numeraciones_documentos
            ORDER BY id_numeracion ASC
        `)
        .all();
}

function ejecutarDiagnostico() {
    imprimirBloque('DIAGNÓSTICO 026 - ANULACIÓN TOTAL DE VENTAS');

    console.log('\nTablas relacionadas encontradas:');
    console.table(listarTablasRelacionadas());

    const tablasClave = [
        'ventas',
        'detalle_ventas',
        'turnos_caja',
        'medios_pago',
        'productos',
        'numeraciones_documentos',
        'movimientos_inventario',
        'pagos_ventas',
        'ventas_pagos',
        'pagos',
    ];

    console.log('\nConteo de tablas clave:');
    console.table(
        tablasClave.map((tabla) => ({
            tabla,
            existe: tablaExiste(tabla),
            total: contarRegistros(tabla),
        }))
    );

    tablasClave.forEach((tabla) => {
        if (!tablaExiste(tabla)) {
            return;
        }

        console.log(`\nColumnas de ${tabla}:`);
        console.table(listarColumnas(tabla));
    });

    console.log('\nÚltimas ventas:');
    console.table(obtenerUltimasVentas());

    console.log('\nDetalle de la última venta:');
    console.table(obtenerDetalleUltimaVenta());

    const pagos = obtenerPagosUltimaVenta();
    console.log(`\nPagos de última venta. Tabla detectada: ${pagos.tabla_pagos || 'No detectada'}`);
    if (pagos.aviso) console.log(pagos.aviso);
    console.table(pagos.pagos);

    const movimientos = obtenerMovimientosUltimaVenta();
    console.log(`\nMovimientos inventario de última venta. Tabla detectada: ${movimientos.tabla_movimientos || 'No detectada'}`);
    if (movimientos.aviso) console.log(movimientos.aviso);
    console.table(movimientos.movimientos);

    console.log('\nTurno abierto:');
    console.table(obtenerTurnoAbierto() ? [obtenerTurnoAbierto()] : []);

    console.log('\nNumeraciones:');
    console.table(obtenerNumeraciones());

    console.log('\nDiagnóstico 026 finalizado correctamente.');
}

ejecutarDiagnostico();