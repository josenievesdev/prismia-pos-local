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

function normalizarIvaProductos() {
    if (!columnaExiste('productos', 'porcentaje_iva')) {
        console.log('Columna productos.porcentaje_iva no existe. Se omite.');
        return;
    }

    const resultado = db.prepare(`
        UPDATE productos
        SET porcentaje_iva = ROUND(porcentaje_iva / 100.0, 2)
        WHERE porcentaje_iva > 100
          AND porcentaje_iva <= 10000
    `).run();

    console.log(`Productos normalizados: ${resultado.changes}`);
}

function normalizarIvaConfiguracion() {
    if (!columnaExiste('configuracion_negocio', 'impuesto_por_defecto')) {
        console.log('Columna configuracion_negocio.impuesto_por_defecto no existe. Se omite.');
        return;
    }

    const resultado = db.prepare(`
        UPDATE configuracion_negocio
        SET impuesto_por_defecto = ROUND(impuesto_por_defecto / 100.0, 2)
        WHERE impuesto_por_defecto > 100
          AND impuesto_por_defecto <= 10000
    `).run();

    console.log(`Configuraciones normalizadas: ${resultado.changes}`);
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
            'migracion_normalizar_iva_venta_porcentaje',
            'productos/configuracion_negocio',
            NULL,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_037'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            version: '037',
            mensaje: 'Se normalizó el IVA de venta para usar porcentaje humano: 19 = 19%, no 1900.',
        }),
    });

    console.log('Auditoría de migración 037 registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 037...');
    console.log('Normalizar IVA de venta');
    console.log('====================================');

    const transaccion = db.transaction(() => {
        normalizarIvaProductos();
        normalizarIvaConfiguracion();
        registrarAuditoriaMigracion();
    });

    transaccion();

    console.log('====================================');
    console.log('Migración 037 ejecutada correctamente.');
    console.log('====================================');
}

ejecutarMigracion();