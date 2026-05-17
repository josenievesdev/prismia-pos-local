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

function columnaExiste(nombreTabla, nombreColumna) {
    const columnas = db.prepare(`PRAGMA table_info(${nombreTabla})`).all();

    return columnas.some((columna) => columna.name === nombreColumna);
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

function agregarColumnaSiNoExiste(nombreTabla, nombreColumna, sql) {
    if (columnaExiste(nombreTabla, nombreColumna)) {
        console.log(`Columna ${nombreColumna} ya existe en ${nombreTabla}. Se omite.`);
        return;
    }

    db.exec(sql);
    console.log(`Columna ${nombreColumna} agregada en ${nombreTabla}.`);
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
    if (!tablaExiste('pagos_compras_proveedores')) {
        throw new Error('No existe la tabla pagos_compras_proveedores. Ejecuta primero la migración 035.');
    }
}

function agregarOrigenPago() {
    agregarColumnaSiNoExiste(
        'pagos_compras_proveedores',
        'origen_pago',
        `
            ALTER TABLE pagos_compras_proveedores
            ADD COLUMN origen_pago TEXT NOT NULL DEFAULT 'tesoreria'
        `
    );

    db.prepare(`
        UPDATE pagos_compras_proveedores
        SET origen_pago = 'tesoreria'
        WHERE origen_pago IS NULL
           OR TRIM(origen_pago) = ''
    `).run();

    crearIndiceSiNoExiste(
        'idx_pagos_compras_proveedores_origen_pago',
        `
            CREATE INDEX idx_pagos_compras_proveedores_origen_pago
            ON pagos_compras_proveedores (origen_pago)
        `
    );
}

function registrarAuditoriaMigracion() {
    if (!tablaExiste('auditoria')) {
        console.log('Tabla auditoria no existe. Se omite registro de auditoría.');
        return;
    }

    db.prepare(`
        INSERT INTO auditoria (
            id_usuario,
            accion,
            tabla_afectada,
            id_registro_afectado,
            datos_anteriores,
            datos_nuevos,
            ip,
            user_agent
        ) VALUES (
            NULL,
            'migracion_origen_pago_proveedor',
            'pagos_compras_proveedores',
            NULL,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_036'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            version: '036',
            mensaje: 'Se agregó origen_pago a pagos_compras_proveedores para separar pagos por tesorería y futuros pagos desde caja.',
            valor_por_defecto: 'tesoreria',
        }),
    });

    console.log('Auditoría de migración 036 registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 036...');
    console.log('Origen de pago proveedor');
    console.log('====================================');

    const transaccion = db.transaction(() => {
        validarDependencias();
        agregarOrigenPago();
        registrarAuditoriaMigracion();
    });

    transaccion();

    console.log('====================================');
    console.log('Migración 036 ejecutada correctamente.');
    console.log('====================================');
}

ejecutarMigracion();