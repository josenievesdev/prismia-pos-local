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

    const columnas = db
        .prepare(`PRAGMA table_info(${nombreTabla})`)
        .all();

    return columnas.some((columna) => columna.name === nombreColumna);
}

function agregarColumnaSiNoExiste(nombreTabla, nombreColumna, sql) {
    if (columnaExiste(nombreTabla, nombreColumna)) {
        console.log(`La columna ${nombreTabla}.${nombreColumna} ya existe. Se omite.`);
        return;
    }

    db.exec(sql);
    console.log(`Columna ${nombreTabla}.${nombreColumna} creada.`);
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

function crearIndiceSiNoExiste(nombreIndice, sql) {
    if (indiceExiste(nombreIndice)) {
        console.log(`Índice ${nombreIndice} ya existe. Se omite.`);
        return;
    }

    db.exec(sql);
    console.log(`Índice ${nombreIndice} creado.`);
}

function ejecutarMigracion() {
    if (!tablaExiste('productos')) {
        throw new Error('No existe la tabla productos. Ejecuta primero las migraciones base.');
    }

    agregarColumnaSiNoExiste(
        'productos',
        'mostrar_en_pos_tactil',
        `
            ALTER TABLE productos
            ADD COLUMN mostrar_en_pos_tactil INTEGER NOT NULL DEFAULT 0
        `
    );

    agregarColumnaSiNoExiste(
        'productos',
        'orden_pos_tactil',
        `
            ALTER TABLE productos
            ADD COLUMN orden_pos_tactil INTEGER
        `
    );

    crearIndiceSiNoExiste(
        'idx_productos_pos_tactil',
        `
            CREATE INDEX idx_productos_pos_tactil
            ON productos (mostrar_en_pos_tactil, orden_pos_tactil, nombre)
            WHERE eliminado_en IS NULL
        `
    );

    const resumen = db
        .prepare(`
            SELECT
                COUNT(*) AS total_productos,
                COALESCE(SUM(CASE WHEN mostrar_en_pos_tactil = 1 THEN 1 ELSE 0 END), 0) AS productos_pos_tactil
            FROM productos
            WHERE eliminado_en IS NULL
        `)
        .get();

    console.log('Migración 030 completada correctamente.');
    console.log(`Productos activos en base: ${resumen.total_productos}`);
    console.log(`Productos marcados para POS táctil: ${resumen.productos_pos_tactil}`);
}

try {
    ejecutarMigracion();
} catch (error) {
    console.error('Error ejecutando migración 030_productos_pos_tactil_fotos.js');
    console.error(error);
    process.exit(1);
}