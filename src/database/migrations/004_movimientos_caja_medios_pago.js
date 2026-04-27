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

function agregarColumnaSiNoExiste(nombreTabla, nombreColumna, definicionSql) {
    if (columnaExiste(nombreTabla, nombreColumna)) {
        console.log(`Columna ${nombreTabla}.${nombreColumna} ya existe. Se omite.`);
        return;
    }

    db.exec(`
        ALTER TABLE ${nombreTabla}
        ADD COLUMN ${definicionSql};
    `);

    console.log(`Columna ${nombreTabla}.${nombreColumna} agregada.`);
}

function agregarColumnasMovimientosCaja() {
    if (!tablaExiste('movimientos_caja')) {
        throw new Error('No existe la tabla movimientos_caja. Ejecuta primero la inicialización de base de datos.');
    }

    if (!tablaExiste('medios_pago')) {
        throw new Error('No existe la tabla medios_pago. Ejecuta primero la migración 003.');
    }

    agregarColumnaSiNoExiste(
        'movimientos_caja',
        'id_medio_pago',
        'id_medio_pago INTEGER REFERENCES medios_pago(id_medio_pago) ON UPDATE CASCADE ON DELETE RESTRICT'
    );

    agregarColumnaSiNoExiste(
        'movimientos_caja',
        'referencia_pago',
        'referencia_pago TEXT'
    );

    agregarColumnaSiNoExiste(
        'movimientos_caja',
        'entidad_pago',
        'entidad_pago TEXT'
    );
}

function sincronizarMovimientosExistentes() {
    if (!columnaExiste('movimientos_caja', 'id_medio_pago')) {
        console.log('No existe movimientos_caja.id_medio_pago. Se omite sincronización.');
        return;
    }

    const efectivo = db
        .prepare(`SELECT id_medio_pago FROM medios_pago WHERE codigo = 'efectivo' LIMIT 1`)
        .get();

    const otro = db
        .prepare(`SELECT id_medio_pago FROM medios_pago WHERE codigo = 'otro' LIMIT 1`)
        .get();

    const tarjetaDebito = db
        .prepare(`SELECT id_medio_pago FROM medios_pago WHERE codigo = 'tarjeta_debito' LIMIT 1`)
        .get();

    const nequi = db
        .prepare(`SELECT id_medio_pago FROM medios_pago WHERE codigo = 'nequi' LIMIT 1`)
        .get();

    if (efectivo) {
        db.prepare(`
            UPDATE movimientos_caja
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'efectivo'
        `).run(efectivo.id_medio_pago);
    }

    if (tarjetaDebito) {
        db.prepare(`
            UPDATE movimientos_caja
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'tarjeta'
        `).run(tarjetaDebito.id_medio_pago);
    }

    if (nequi) {
        db.prepare(`
            UPDATE movimientos_caja
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'transferencia'
        `).run(nequi.id_medio_pago);
    }

    if (otro) {
        db.prepare(`
            UPDATE movimientos_caja
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'otro'
        `).run(otro.id_medio_pago);
    }

    console.log('Movimientos de caja existentes sincronizados con medios de pago cuando fue posible.');
}

function crearIndices() {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_movimientos_caja_medio_pago
        ON movimientos_caja(id_medio_pago);

        CREATE INDEX IF NOT EXISTS idx_movimientos_caja_turno_medio_pago
        ON movimientos_caja(id_turno_caja, id_medio_pago);
    `);

    console.log('Índices de movimientos_caja por medio de pago verificados.');
}

function registrarAuditoria() {
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
            'migracion_movimientos_caja_medios_pago',
            'movimientos_caja',
            NULL,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_004'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            mensaje: 'Se agregaron columnas de medio de pago a movimientos_caja.',
            columnas: [
                'id_medio_pago',
                'referencia_pago',
                'entidad_pago',
            ],
            version: '004',
        }),
    });

    console.log('Auditoría de migración 004 registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 004...');
    console.log('Movimientos de caja con medios de pago');
    console.log('====================================');

    agregarColumnasMovimientosCaja();
    sincronizarMovimientosExistentes();
    crearIndices();
    registrarAuditoria();

    console.log('====================================');
    console.log('Migración 004 ejecutada correctamente.');
    console.log('====================================');
}

try {
    ejecutarMigracion();
} catch (error) {
    console.error('Error ejecutando migración 004:', error);
    process.exit(1);
}