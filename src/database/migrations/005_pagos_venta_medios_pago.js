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

function agregarColumnaPagosVenta() {
    if (!tablaExiste('pagos_venta')) {
        throw new Error('No existe la tabla pagos_venta. Ejecuta primero la inicialización de base de datos.');
    }

    if (!tablaExiste('medios_pago')) {
        throw new Error('No existe la tabla medios_pago. Ejecuta primero la migración 003.');
    }

    agregarColumnaSiNoExiste(
        'pagos_venta',
        'id_medio_pago',
        'id_medio_pago INTEGER REFERENCES medios_pago(id_medio_pago) ON UPDATE CASCADE ON DELETE RESTRICT'
    );
}

function sincronizarPagosExistentes() {
    if (!columnaExiste('pagos_venta', 'id_medio_pago')) {
        console.log('No existe pagos_venta.id_medio_pago. Se omite sincronización.');
        return;
    }

    const idEfectivo = obtenerIdMedioPago('efectivo');
    const idNequi = obtenerIdMedioPago('nequi');
    const idTarjetaDebito = obtenerIdMedioPago('tarjeta_debito');
    const idOtro = obtenerIdMedioPago('otro');

    if (idEfectivo) {
        db.prepare(`
            UPDATE pagos_venta
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'efectivo'
        `).run(idEfectivo);
    }

    /*
      Para datos viejos que solo digan "transferencia", se asigna Nequi
      como medio temporal. Más adelante, las ventas nuevas deberán escoger
      el medio real: Nequi, Daviplata, Bre-B, Bancolombia, etc.
    */
    if (idNequi) {
        db.prepare(`
            UPDATE pagos_venta
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'transferencia'
        `).run(idNequi);
    }

    /*
      Para datos viejos que solo digan "tarjeta", se asigna tarjeta débito
      como medio temporal. Luego el formulario de ventas separará débito/crédito.
    */
    if (idTarjetaDebito) {
        db.prepare(`
            UPDATE pagos_venta
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'tarjeta'
        `).run(idTarjetaDebito);
    }

    if (idOtro) {
        db.prepare(`
            UPDATE pagos_venta
            SET id_medio_pago = ?
            WHERE id_medio_pago IS NULL
              AND metodo_pago = 'otro'
        `).run(idOtro);
    }

    console.log('Pagos de venta existentes sincronizados con medios de pago cuando fue posible.');
}

function crearIndices() {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_pagos_venta_medio_pago
        ON pagos_venta(id_medio_pago);

        CREATE INDEX IF NOT EXISTS idx_pagos_venta_venta_medio_pago
        ON pagos_venta(id_venta, id_medio_pago);
    `);

    console.log('Índices de pagos_venta por medio de pago verificados.');
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
            'migracion_pagos_venta_medios_pago',
            'pagos_venta',
            NULL,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_005'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            mensaje: 'Se agregó id_medio_pago a pagos_venta.',
            columnas: ['id_medio_pago'],
            version: '005',
        }),
    });

    console.log('Auditoría de migración 005 registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 005...');
    console.log('Pagos de venta con medios de pago');
    console.log('====================================');

    agregarColumnaPagosVenta();
    sincronizarPagosExistentes();
    crearIndices();
    registrarAuditoria();

    console.log('====================================');
    console.log('Migración 005 ejecutada correctamente.');
    console.log('====================================');
}

try {
    ejecutarMigracion();
} catch (error) {
    console.error('Error ejecutando migración 005:', error);
    process.exit(1);
}