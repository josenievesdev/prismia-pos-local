const db = require('../../config/db');

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

function indiceExiste(nombreIndice) {
    const resultado = db
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'index'
              AND name = ?
            LIMIT 1
        `)
        .get(nombreIndice);

    return Boolean(resultado);
}

function crearIndiceSiNoExiste(nombreIndice, sql) {
    if (indiceExiste(nombreIndice)) {
        console.log(`Índice ${nombreIndice} ya existe. Se omite.`);
        return;
    }

    db.exec(sql);
    console.log(`Índice ${nombreIndice} creado.`);
}

function validarDependencias() {
    const requeridas = [
        'ventas',
        'detalle_ventas',
        'pagos_venta',
        'productos',
        'turnos_caja',
        'movimientos_inventario',
        'usuarios',
    ];

    const faltantes = requeridas.filter((tabla) => !tablaExiste(tabla));

    if (faltantes.length > 0) {
        throw new Error(
            `Faltan tablas requeridas para anulación de ventas: ${faltantes.join(', ')}`
        );
    }
}

function crearTablaAnulacionesVenta() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS anulaciones_venta (
            id_anulacion_venta INTEGER PRIMARY KEY AUTOINCREMENT,

            id_venta INTEGER NOT NULL UNIQUE,
            numero_venta TEXT NOT NULL,

            id_cliente INTEGER,
            id_turno_caja INTEGER NOT NULL,

            total_venta INTEGER NOT NULL DEFAULT 0,
            total_pagado INTEGER NOT NULL DEFAULT 0,
            cambio_entregado INTEGER NOT NULL DEFAULT 0,

            total_efectivo_reversado INTEGER NOT NULL DEFAULT 0,
            total_transferencia_reversado INTEGER NOT NULL DEFAULT 0,
            total_tarjeta_reversado INTEGER NOT NULL DEFAULT 0,
            total_otros_reversado INTEGER NOT NULL DEFAULT 0,
            monto_esperado_reversado INTEGER NOT NULL DEFAULT 0,

            motivo_anulacion TEXT NOT NULL,
            observaciones TEXT,

            anulada_por INTEGER NOT NULL,
            anulada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (id_venta)
                REFERENCES ventas(id_venta)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_cliente)
                REFERENCES clientes(id_cliente)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (id_turno_caja)
                REFERENCES turnos_caja(id_turno_caja)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (anulada_por)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        );
    `);

    console.log('Tabla anulaciones_venta verificada.');
}

function crearIndices() {
    crearIndiceSiNoExiste(
        'idx_anulaciones_venta_venta',
        `CREATE INDEX idx_anulaciones_venta_venta
         ON anulaciones_venta(id_venta)`
    );

    crearIndiceSiNoExiste(
        'idx_anulaciones_venta_turno',
        `CREATE INDEX idx_anulaciones_venta_turno
         ON anulaciones_venta(id_turno_caja)`
    );

    crearIndiceSiNoExiste(
        'idx_anulaciones_venta_fecha',
        `CREATE INDEX idx_anulaciones_venta_fecha
         ON anulaciones_venta(anulada_en)`
    );

    crearIndiceSiNoExiste(
        'idx_ventas_estado',
        `CREATE INDEX idx_ventas_estado
         ON ventas(estado)`
    );

    crearIndiceSiNoExiste(
        'idx_ventas_turno_estado',
        `CREATE INDEX idx_ventas_turno_estado
         ON ventas(id_turno_caja, estado)`
    );

    crearIndiceSiNoExiste(
        'idx_pagos_venta_venta_estado',
        `CREATE INDEX idx_pagos_venta_venta_estado
         ON pagos_venta(id_venta, estado)`
    );

    crearIndiceSiNoExiste(
        'idx_movimientos_inventario_referencia',
        `CREATE INDEX idx_movimientos_inventario_referencia
         ON movimientos_inventario(referencia_tipo, referencia_id)`
    );
}

function imprimirResumen() {
    const totales = db
        .prepare(`
            SELECT
                (SELECT COUNT(*) FROM anulaciones_venta) AS total_anulaciones,
                (SELECT COUNT(*) FROM ventas WHERE estado = 'anulada') AS ventas_anuladas,
                (SELECT COUNT(*) FROM pagos_venta WHERE estado = 'anulado') AS pagos_anulados
        `)
        .get();

    console.log('\n====================================');
    console.log('MIGRACIÓN 027 - ANULACIONES DE VENTA');
    console.log('====================================');
    console.table([totales]);
}

function ejecutarMigracion() {
    validarDependencias();

    const transaccion = db.transaction(() => {
        crearTablaAnulacionesVenta();
        crearIndices();
    });

    transaccion();

    console.log('Migración 027 ejecutada correctamente.');
    imprimirResumen();
}

ejecutarMigracion();