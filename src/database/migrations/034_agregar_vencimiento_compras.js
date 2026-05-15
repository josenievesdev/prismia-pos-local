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

function obtenerColumnas(nombreTabla) {
    return db
        .prepare(`PRAGMA table_info(${nombreTabla})`)
        .all()
        .map((columna) => columna.name);
}

function columnaExiste(nombreTabla, nombreColumna) {
    return obtenerColumnas(nombreTabla).includes(nombreColumna);
}

function agregarColumnaSiNoExiste(nombreTabla, nombreColumna, definicionSql) {
    if (columnaExiste(nombreTabla, nombreColumna)) {
        console.log(`Columna ${nombreTabla}.${nombreColumna} ya existe. Se omite.`);
        return;
    }

    db.exec(`
        ALTER TABLE ${nombreTabla}
        ADD COLUMN ${definicionSql}
    `);

    console.log(`Columna ${nombreTabla}.${nombreColumna} creada.`);
}

function validarDependencias() {
    if (!tablaExiste('compras')) {
        throw new Error('No existe la tabla compras. Ejecuta primero la migración 032.');
    }
}

function agregarCamposPagoCompras() {
    agregarColumnaSiNoExiste(
        'compras',
        'condicion_pago',
        `condicion_pago TEXT NOT NULL DEFAULT 'contado'
            CHECK (condicion_pago IN ('contado', 'credito'))`
    );

    agregarColumnaSiNoExiste(
        'compras',
        'dias_plazo',
        'dias_plazo INTEGER NOT NULL DEFAULT 0 CHECK (dias_plazo >= 0)'
    );

    agregarColumnaSiNoExiste(
        'compras',
        'fecha_vencimiento',
        'fecha_vencimiento TEXT'
    );

    agregarColumnaSiNoExiste(
        'compras',
        'estado_pago',
        `estado_pago TEXT NOT NULL DEFAULT 'pagada'
            CHECK (estado_pago IN ('pendiente', 'pagada', 'vencida', 'parcial'))`
    );

    agregarColumnaSiNoExiste(
        'compras',
        'fecha_pago',
        'fecha_pago TEXT'
    );

    agregarColumnaSiNoExiste(
        'compras',
        'total_pagado',
        'total_pagado INTEGER NOT NULL DEFAULT 0 CHECK (total_pagado >= 0)'
    );

    agregarColumnaSiNoExiste(
        'compras',
        'saldo_pendiente',
        'saldo_pendiente INTEGER NOT NULL DEFAULT 0 CHECK (saldo_pendiente >= 0)'
    );
}

function normalizarComprasExistentes() {
    db.exec(`
        UPDATE compras
        SET
            condicion_pago = COALESCE(NULLIF(condicion_pago, ''), 'contado'),
            dias_plazo = COALESCE(dias_plazo, 0),
            fecha_vencimiento = COALESCE(fecha_vencimiento, fecha_compra),
            estado_pago = COALESCE(NULLIF(estado_pago, ''), 'pagada'),
            fecha_pago = COALESCE(fecha_pago, fecha_compra),
            total_pagado = CASE
                WHEN COALESCE(total_pagado, 0) <= 0 THEN COALESCE(total, 0)
                ELSE total_pagado
            END,
            saldo_pendiente = CASE
                WHEN COALESCE(estado_pago, 'pagada') = 'pagada' THEN 0
                ELSE COALESCE(saldo_pendiente, total, 0)
            END,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE condicion_pago IS NULL
           OR condicion_pago = ''
           OR fecha_vencimiento IS NULL
           OR estado_pago IS NULL
           OR estado_pago = ''
           OR fecha_pago IS NULL
           OR total_pagado IS NULL
           OR saldo_pendiente IS NULL
    `);

    console.log('Compras existentes normalizadas como contado/pagadas.');
}

function crearIndices() {
    crearIndiceSiNoExiste(
        'idx_compras_condicion_pago',
        'CREATE INDEX idx_compras_condicion_pago ON compras (condicion_pago)'
    );

    crearIndiceSiNoExiste(
        'idx_compras_estado_pago',
        'CREATE INDEX idx_compras_estado_pago ON compras (estado_pago)'
    );

    crearIndiceSiNoExiste(
        'idx_compras_fecha_vencimiento',
        'CREATE INDEX idx_compras_fecha_vencimiento ON compras (fecha_vencimiento)'
    );
}

function ejecutarMigracion() {
    const transaccion = db.transaction(() => {
        validarDependencias();
        agregarCamposPagoCompras();
        normalizarComprasExistentes();
        crearIndices();
    });

    transaccion();

    console.log('Migración 034 ejecutada correctamente.');
}

ejecutarMigracion();