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

function obtenerIdMedioPago(codigo) {
    const medioPago = db
        .prepare(`
            SELECT id_medio_pago
            FROM medios_pago
            WHERE codigo = ?
            LIMIT 1
        `)
        .get(codigo);

    return medioPago ? medioPago.id_medio_pago : null;
}

function agregarColumnasGastos() {
    if (!tablaExiste('gastos')) {
        throw new Error('No existe la tabla gastos. Ejecuta primero la inicialización de base de datos.');
    }

    if (!tablaExiste('medios_pago')) {
        throw new Error('No existe la tabla medios_pago. Ejecuta primero la migración 003.');
    }

    agregarColumnaSiNoExiste(
        'gastos',
        'id_medio_pago',
        'id_medio_pago INTEGER REFERENCES medios_pago(id_medio_pago) ON UPDATE CASCADE ON DELETE RESTRICT'
    );

    agregarColumnaSiNoExiste(
        'gastos',
        'referencia_pago',
        'referencia_pago TEXT'
    );

    agregarColumnaSiNoExiste(
        'gastos',
        'entidad_pago',
        'entidad_pago TEXT'
    );
}

function sincronizarGastosExistentes() {
    if (!columnaExiste('gastos', 'id_medio_pago')) {
        console.log('No existe gastos.id_medio_pago. Se omite sincronización.');
        return;
    }

    const idEfectivo = obtenerIdMedioPago('efectivo');
    const idNequi = obtenerIdMedioPago('nequi');
    const idTarjetaDebito = obtenerIdMedioPago('tarjeta_debito');
    const idOtro = obtenerIdMedioPago('otro');

    if (idEfectivo) {
        db.prepare(`
            UPDATE gastos
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'efectivo'
        `).run(idEfectivo);
    }

    /*
      Para datos viejos que solo digan "transferencia", se asigna Nequi
      como medio temporal. En los gastos nuevos, el usuario deberá escoger
      el medio real: Nequi, Daviplata, Bre-B, Bancolombia, etc.
    */
    if (idNequi) {
        db.prepare(`
            UPDATE gastos
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'transferencia'
        `).run(idNequi);
    }

    /*
      Para datos viejos que solo digan "tarjeta", se asigna tarjeta débito
      como medio temporal. Luego el formulario podrá separar débito/crédito.
    */
    if (idTarjetaDebito) {
        db.prepare(`
            UPDATE gastos
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'tarjeta'
        `).run(idTarjetaDebito);
    }

    if (idOtro) {
        db.prepare(`
            UPDATE gastos
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'otro'
        `).run(idOtro);
    }

    console.log('Gastos existentes sincronizados con medios de pago cuando fue posible.');
}

function crearIndices() {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_gastos_medio_pago
        ON gastos(id_medio_pago);

        CREATE INDEX IF NOT EXISTS idx_gastos_turno_medio_pago
        ON gastos(id_turno_caja, id_medio_pago);

        CREATE INDEX IF NOT EXISTS idx_gastos_afecta_caja_medio_pago
        ON gastos(afecta_caja, id_medio_pago);
    `);

    console.log('Índices de gastos por medio de pago verificados.');
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
            'migracion_gastos_medios_pago',
            'gastos',
            NULL,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_006'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            mensaje: 'Se agregaron columnas de medio de pago a gastos.',
            columnas: [
                'id_medio_pago',
                'referencia_pago',
                'entidad_pago',
            ],
            version: '006',
        }),
    });

    console.log('Auditoría de migración 006 registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 006...');
    console.log('Gastos con medios de pago');
    console.log('====================================');

    agregarColumnasGastos();
    sincronizarGastosExistentes();
    crearIndices();
    registrarAuditoria();

    console.log('====================================');
    console.log('Migración 006 ejecutada correctamente.');
    console.log('====================================');
}

try {
    ejecutarMigracion();
} catch (error) {
    console.error('Error ejecutando migración 006:', error);
    process.exit(1);
}