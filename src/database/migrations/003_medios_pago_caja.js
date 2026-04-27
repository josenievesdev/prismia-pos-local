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

function crearTablaMediosPago() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS medios_pago (
            id_medio_pago INTEGER PRIMARY KEY AUTOINCREMENT,

            codigo TEXT NOT NULL UNIQUE,
            nombre TEXT NOT NULL,

            tipo TEXT NOT NULL
                CHECK (tipo IN (
                    'efectivo',
                    'transferencia',
                    'tarjeta',
                    'otro'
                )),

            requiere_referencia INTEGER NOT NULL DEFAULT 0
                CHECK (requiere_referencia IN (0, 1)),

            afecta_efectivo_caja INTEGER NOT NULL DEFAULT 0
                CHECK (afecta_efectivo_caja IN (0, 1)),

            activo INTEGER NOT NULL DEFAULT 1
                CHECK (activo IN (0, 1)),

            orden INTEGER NOT NULL DEFAULT 0,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT
        );
    `);

    console.log('Tabla medios_pago verificada.');
}

function insertarMediosPagoIniciales() {
    const mediosPago = [
        {
            codigo: 'efectivo',
            nombre: 'Efectivo',
            tipo: 'efectivo',
            requiere_referencia: 0,
            afecta_efectivo_caja: 1,
            activo: 1,
            orden: 10,
        },
        {
            codigo: 'nequi',
            nombre: 'Nequi',
            tipo: 'transferencia',
            requiere_referencia: 1,
            afecta_efectivo_caja: 0,
            activo: 1,
            orden: 20,
        },
        {
            codigo: 'daviplata',
            nombre: 'Daviplata',
            tipo: 'transferencia',
            requiere_referencia: 1,
            afecta_efectivo_caja: 0,
            activo: 1,
            orden: 30,
        },
        {
            codigo: 'bre_b',
            nombre: 'Bre-B',
            tipo: 'transferencia',
            requiere_referencia: 1,
            afecta_efectivo_caja: 0,
            activo: 1,
            orden: 40,
        },
        {
            codigo: 'bancolombia',
            nombre: 'Bancolombia',
            tipo: 'transferencia',
            requiere_referencia: 1,
            afecta_efectivo_caja: 0,
            activo: 1,
            orden: 50,
        },
        {
            codigo: 'tarjeta_debito',
            nombre: 'Tarjeta débito',
            tipo: 'tarjeta',
            requiere_referencia: 1,
            afecta_efectivo_caja: 0,
            activo: 1,
            orden: 60,
        },
        {
            codigo: 'tarjeta_credito',
            nombre: 'Tarjeta crédito',
            tipo: 'tarjeta',
            requiere_referencia: 1,
            afecta_efectivo_caja: 0,
            activo: 1,
            orden: 70,
        },
        {
            codigo: 'otro',
            nombre: 'Otro',
            tipo: 'otro',
            requiere_referencia: 0,
            afecta_efectivo_caja: 0,
            activo: 1,
            orden: 80,
        },
    ];

    const insertar = db.prepare(`
        INSERT OR IGNORE INTO medios_pago (
            codigo,
            nombre,
            tipo,
            requiere_referencia,
            afecta_efectivo_caja,
            activo,
            orden
        ) VALUES (
            @codigo,
            @nombre,
            @tipo,
            @requiere_referencia,
            @afecta_efectivo_caja,
            @activo,
            @orden
        )
    `);

    const transaccion = db.transaction(() => {
        for (const medioPago of mediosPago) {
            insertar.run(medioPago);
        }
    });

    transaccion();

    console.log('Medios de pago iniciales verificados.');
}

function crearIndices() {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_medios_pago_codigo
        ON medios_pago(codigo);

        CREATE INDEX IF NOT EXISTS idx_medios_pago_tipo
        ON medios_pago(tipo);

        CREATE INDEX IF NOT EXISTS idx_medios_pago_activo
        ON medios_pago(activo);
    `);

    console.log('Índices de medios de pago verificados.');
}

function registrarMigracion() {
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
            'migracion_medios_pago',
            'medios_pago',
            NULL,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_003'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            mensaje: 'Migración inicial de medios de pago ejecutada correctamente.',
            version: '003',
            paso: '003_A_medios_pago',
        }),
    });

    console.log('Auditoría de migración registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 003...');
    console.log('Medios de pago para Caja');
    console.log('====================================');

    crearTablaMediosPago();
    insertarMediosPagoIniciales();
    crearIndices();
    registrarMigracion();

    console.log('====================================');
    console.log('Migración 003 ejecutada correctamente.');
    console.log('====================================');
}

try {
    ejecutarMigracion();
} catch (error) {
    console.error('Error ejecutando migración 003:', error);
    process.exit(1);
}