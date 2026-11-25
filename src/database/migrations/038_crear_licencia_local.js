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

function crearTablaLicenciaLocal() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS licencia_local (
            id_licencia INTEGER PRIMARY KEY CHECK (id_licencia = 1),

            estado TEXT NOT NULL DEFAULT 'prueba'
                CHECK (estado IN ('prueba', 'activa', 'vencida', 'bloqueada')),

            fecha_inicio_prueba TEXT,
            fecha_fin_prueba TEXT,

            fecha_inicio_periodo TEXT,
            fecha_fin_periodo TEXT,

            dias_prueba INTEGER NOT NULL DEFAULT 30,

            codigo_activacion TEXT,
            nota TEXT,

            creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            actualizado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
    `);

    console.log('Tabla licencia_local verificada.');
}

function insertarRegistroInicialLicencia() {
    const existe = db
        .prepare(`
            SELECT id_licencia
            FROM licencia_local
            WHERE id_licencia = 1
            LIMIT 1
        `)
        .get();

    if (existe) {
        console.log('Registro inicial de licencia_local ya existe.');
        return;
    }

    db.prepare(`
        INSERT INTO licencia_local (
            id_licencia,
            estado,
            dias_prueba,
            nota
        ) VALUES (
            1,
            'prueba',
            30,
            'Registro inicial para prueba local de Prismia POS Local.'
        )
    `).run();

    console.log('Registro inicial de licencia_local creado.');
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
            'migracion_crear_licencia_local',
            'licencia_local',
            1,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_038'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            version: '038',
            mensaje: 'Se creó la tabla licencia_local como base para prueba de 30 días y activación local.',
        }),
    });

    console.log('Auditoría de migración 038 registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 038...');
    console.log('Crear licencia local');
    console.log('====================================');

    const transaccion = db.transaction(() => {
        crearTablaLicenciaLocal();
        insertarRegistroInicialLicencia();
        registrarAuditoriaMigracion();
    });

    transaccion();

    console.log('====================================');
    console.log('Migración 038 ejecutada correctamente.');
    console.log('====================================');
}

ejecutarMigracion();