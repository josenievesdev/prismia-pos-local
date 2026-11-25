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
    if (!tablaExiste(nombreTabla)) {
        return false;
    }

    const columnas = db.prepare(`PRAGMA table_info(${nombreTabla})`).all();

    return columnas.some((columna) => columna.name === nombreColumna);
}

function agregarColumnaSiNoExiste(nombreTabla, nombreColumna, sql) {
    if (columnaExiste(nombreTabla, nombreColumna)) {
        console.log(`Columna ${nombreTabla}.${nombreColumna} ya existe. Se omite.`);
        return;
    }

    db.exec(sql);
    console.log(`Columna ${nombreTabla}.${nombreColumna} agregada.`);
}

function validarDependencias() {
    if (!tablaExiste('licencia_local')) {
        throw new Error('No existe la tabla licencia_local.');
    }
}

function ampliarLicenciaActivada() {
    agregarColumnaSiNoExiste(
        'licencia_local',
        'cliente_licencia',
        `
            ALTER TABLE licencia_local
            ADD COLUMN cliente_licencia TEXT
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'ultimo_nonce_licencia',
        `
            ALTER TABLE licencia_local
            ADD COLUMN ultimo_nonce_licencia TEXT
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'fecha_emision_codigo',
        `
            ALTER TABLE licencia_local
            ADD COLUMN fecha_emision_codigo TEXT
        `
    );
}

function registrarAuditoriaMigracion() {
    if (!tablaExiste('auditoria')) {
        console.log('Tabla auditoria no existe. Se omite registro de auditoría.');
        return;
    }

    const auditoriaExistente = db
        .prepare(`
            SELECT id_auditoria
            FROM auditoria
            WHERE accion = 'migracion_ampliar_datos_licencia_activada'
              AND tabla_afectada = 'licencia_local'
              AND id_registro_afectado = 1
            LIMIT 1
        `)
        .get();

    if (auditoriaExistente) {
        console.log('Auditoría de migración 040 ya existe. Se omite.');
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
            'migracion_ampliar_datos_licencia_activada',
            'licencia_local',
            1,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_040'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            version: '040',
            mensaje: 'Se agregaron datos comerciales y trazabilidad del último código firmado de licencia.',
        }),
    });

    console.log('Auditoría de migración 040 registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 040...');
    console.log('Ampliar datos de licencia activada');
    console.log('====================================');

    const transaccion = db.transaction(() => {
        validarDependencias();
        ampliarLicenciaActivada();
        registrarAuditoriaMigracion();
    });

    transaccion();

    console.log('====================================');
    console.log('Migración 040 ejecutada correctamente.');
    console.log('====================================');
}

ejecutarMigracion();