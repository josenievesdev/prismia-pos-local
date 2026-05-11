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
    if (!tablaExiste('compras_detalle')) {
        throw new Error('No existe la tabla compras_detalle. Ejecuta primero la migración 032.');
    }
}

function ampliarComprasDetalle() {
    agregarColumnaSiNoExiste(
        'compras_detalle',
        'descuento_porcentaje',
        'descuento_porcentaje REAL NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'compras_detalle',
        'descuento_linea',
        'descuento_linea INTEGER NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'compras_detalle',
        'costo_unitario_neto',
        'costo_unitario_neto INTEGER NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'compras_detalle',
        'iva_unitario',
        'iva_unitario INTEGER NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'compras_detalle',
        'costo_unitario_final',
        'costo_unitario_final INTEGER NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'compras_detalle',
        'precio_venta_anterior',
        'precio_venta_anterior INTEGER NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'compras_detalle',
        'ganancia_sobre_costo_porcentaje',
        'ganancia_sobre_costo_porcentaje REAL NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'compras_detalle',
        'precio_venta_sugerido',
        'precio_venta_sugerido INTEGER NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'compras_detalle',
        'actualizar_precio_venta',
        'actualizar_precio_venta INTEGER NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'compras_detalle',
        'precio_venta_nuevo',
        'precio_venta_nuevo INTEGER NOT NULL DEFAULT 0'
    );
}

function ejecutarMigracion() {
    const transaccion = db.transaction(() => {
        validarDependencias();
        ampliarComprasDetalle();
    });

    transaccion();

    console.log('Migración 033 ejecutada correctamente.');
}

ejecutarMigracion();