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
        throw new Error('No existe la tabla licencia_local. Ejecuta primero la migración 038.');
    }
}

function ampliarLicenciaLocal() {
    agregarColumnaSiNoExiste(
        'licencia_local',
        'plan',
        `
            ALTER TABLE licencia_local
            ADD COLUMN plan TEXT NOT NULL DEFAULT 'prueba'
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'dias_gracia',
        `
            ALTER TABLE licencia_local
            ADD COLUMN dias_gracia INTEGER NOT NULL DEFAULT 3
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'fecha_ultimo_uso',
        `
            ALTER TABLE licencia_local
            ADD COLUMN fecha_ultimo_uso TEXT
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'fecha_activacion',
        `
            ALTER TABLE licencia_local
            ADD COLUMN fecha_activacion TEXT
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'huella_equipo',
        `
            ALTER TABLE licencia_local
            ADD COLUMN huella_equipo TEXT
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'codigo_firmado',
        `
            ALTER TABLE licencia_local
            ADD COLUMN codigo_firmado TEXT
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'firma_valida',
        `
            ALTER TABLE licencia_local
            ADD COLUMN firma_valida INTEGER NOT NULL DEFAULT 0
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'motivo_bloqueo',
        `
            ALTER TABLE licencia_local
            ADD COLUMN motivo_bloqueo TEXT
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'origen_activacion',
        `
            ALTER TABLE licencia_local
            ADD COLUMN origen_activacion TEXT NOT NULL DEFAULT 'local'
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'ultima_validacion_online',
        `
            ALTER TABLE licencia_local
            ADD COLUMN ultima_validacion_online TEXT
        `
    );

    agregarColumnaSiNoExiste(
        'licencia_local',
        'ultimo_intento_online',
        `
            ALTER TABLE licencia_local
            ADD COLUMN ultimo_intento_online TEXT
        `
    );
}

function normalizarRegistroLicencia() {
    db.prepare(`
        UPDATE licencia_local
        SET
            plan = COALESCE(NULLIF(TRIM(plan), ''), 'prueba'),
            dias_gracia = CASE
                WHEN dias_gracia IS NULL OR dias_gracia < 0 THEN 3
                ELSE dias_gracia
            END,
            firma_valida = CASE
                WHEN firma_valida = 1 THEN 1
                ELSE 0
            END,
            origen_activacion = COALESCE(NULLIF(TRIM(origen_activacion), ''), 'local'),
            actualizado_en = datetime('now', 'localtime')
        WHERE id_licencia = 1
    `).run();

    console.log('Registro licencia_local normalizado.');
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
            'migracion_ampliar_licencia_mensualidades',
            'licencia_local',
            1,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_039'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            version: '039',
            mensaje: 'Se amplió licencia_local para mensualidades, periodo de gracia, activación firmada y futura validación online.',
            modo_recomendado: 'hibrido_local_primero',
        }),
    });

    console.log('Auditoría de migración 039 registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 039...');
    console.log('Ampliar licencia local para mensualidades');
    console.log('====================================');

    const transaccion = db.transaction(() => {
        validarDependencias();
        ampliarLicenciaLocal();
        normalizarRegistroLicencia();
        registrarAuditoriaMigracion();
    });

    transaccion();

    console.log('====================================');
    console.log('Migración 039 ejecutada correctamente.');
    console.log('====================================');
}

ejecutarMigracion();