const db = require('../../config/db');

const TABLA_ORIGINAL = 'productos';
const TABLA_TEMPORAL = 'productos_nueva_011_stock_real';

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

function obtenerSqlTabla(nombreTabla) {
    const resultado = db
        .prepare(`
            SELECT sql
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
            LIMIT 1
        `)
        .get(nombreTabla);

    return resultado ? resultado.sql : null;
}

function obtenerColumnas(nombreTabla) {
    return db
        .prepare(`PRAGMA table_info(${nombreTabla})`)
        .all();
}

function obtenerTipoColumna(nombreTabla, nombreColumna) {
    const columna = obtenerColumnas(nombreTabla).find((item) => item.name === nombreColumna);
    return columna ? String(columna.type || '').toUpperCase() : null;
}

function obtenerObjetosDependientesProductos() {
    return db
        .prepare(`
            SELECT
                type,
                name,
                sql
            FROM sqlite_master
            WHERE tbl_name = ?
              AND sql IS NOT NULL
              AND type IN ('index', 'trigger')
            ORDER BY
                CASE type
                    WHEN 'index' THEN 1
                    WHEN 'trigger' THEN 2
                    ELSE 3
                END,
                name ASC
        `)
        .all(TABLA_ORIGINAL);
}

function envolverIdentificador(nombre) {
    return `"${String(nombre).replace(/"/g, '""')}"`;
}

function reemplazarTipoColumna(sql, nombreColumna, nuevoTipo) {
    const patron = new RegExp(
        `((?:["'\`])?${nombreColumna}(?:["'\`])?\\s+)INTEGER\\b`,
        'i'
    );

    if (!patron.test(sql)) {
        return sql;
    }

    return sql.replace(patron, `$1${nuevoTipo}`);
}

function construirSqlTablaTemporal(sqlOriginal) {
    let sqlTemporal = sqlOriginal.replace(
        /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?["'`]?\s*productos\s*["'`]?/i,
        `CREATE TABLE ${TABLA_TEMPORAL}`
    );

    sqlTemporal = reemplazarTipoColumna(sqlTemporal, 'stock_actual', 'REAL');
    sqlTemporal = reemplazarTipoColumna(sqlTemporal, 'stock_minimo', 'REAL');

    return sqlTemporal;
}

function validarAntes() {
    if (!tablaExiste(TABLA_ORIGINAL)) {
        throw new Error('No existe la tabla productos.');
    }

    const columnas = obtenerColumnas(TABLA_ORIGINAL);
    const nombresColumnas = columnas.map((columna) => columna.name);

    const columnasRequeridas = [
        'id_producto',
        'stock_actual',
        'stock_minimo',
    ];

    for (const columna of columnasRequeridas) {
        if (!nombresColumnas.includes(columna)) {
            throw new Error(`No existe la columna requerida productos.${columna}`);
        }
    }

    const sqlOriginal = obtenerSqlTabla(TABLA_ORIGINAL);

    if (!sqlOriginal) {
        throw new Error('No se pudo leer el SQL original de la tabla productos.');
    }

    return {
        columnas,
        sqlOriginal,
    };
}

function actualizarSecuenciaAutoincrement() {
    const existeSqliteSequence = tablaExiste('sqlite_sequence');

    if (!existeSqliteSequence) {
        return;
    }

    const maximo = db
        .prepare(`
            SELECT COALESCE(MAX(id_producto), 0) AS maximo
            FROM productos
        `)
        .get();

    const secuencia = db
        .prepare(`
            SELECT name
            FROM sqlite_sequence
            WHERE name = 'productos'
            LIMIT 1
        `)
        .get();

    if (secuencia) {
        db.prepare(`
            UPDATE sqlite_sequence
            SET seq = ?
            WHERE name = 'productos'
        `).run(maximo.maximo);

        return;
    }

    db.prepare(`
        INSERT INTO sqlite_sequence (name, seq)
        VALUES ('productos', ?)
    `).run(maximo.maximo);
}

function validarDespues() {
    const tipoStockActual = obtenerTipoColumna('productos', 'stock_actual');
    const tipoStockMinimo = obtenerTipoColumna('productos', 'stock_minimo');

    if (tipoStockActual !== 'REAL') {
        throw new Error(`productos.stock_actual quedó como ${tipoStockActual}, se esperaba REAL.`);
    }

    if (tipoStockMinimo !== 'REAL') {
        throw new Error(`productos.stock_minimo quedó como ${tipoStockMinimo}, se esperaba REAL.`);
    }

    const erroresFk = db.prepare('PRAGMA foreign_key_check').all();

    if (erroresFk.length > 0) {
        console.table(erroresFk);
        throw new Error('La migración dejó errores de llaves foráneas.');
    }
}

function migrarProductosStockReal() {
    const tipoStockActual = obtenerTipoColumna('productos', 'stock_actual');
    const tipoStockMinimo = obtenerTipoColumna('productos', 'stock_minimo');

    if (tipoStockActual === 'REAL' && tipoStockMinimo === 'REAL') {
        console.log('productos.stock_actual y productos.stock_minimo ya están en REAL. No hay cambios pendientes.');
        return;
    }

    const { columnas, sqlOriginal } = validarAntes();
    const objetosDependientes = obtenerObjetosDependientesProductos();
    const sqlTablaTemporal = construirSqlTablaTemporal(sqlOriginal);

    const columnasSql = columnas
        .map((columna) => envolverIdentificador(columna.name))
        .join(', ');

    db.pragma('foreign_keys = OFF');

    const transaccion = db.transaction(() => {
        db.prepare(`DROP TABLE IF EXISTS ${TABLA_TEMPORAL}`).run();

        db.prepare(sqlTablaTemporal).run();

        db.prepare(`
            INSERT INTO ${TABLA_TEMPORAL} (${columnasSql})
            SELECT ${columnasSql}
            FROM ${TABLA_ORIGINAL}
        `).run();

        db.prepare(`DROP TABLE ${TABLA_ORIGINAL}`).run();

        db.prepare(`
            ALTER TABLE ${TABLA_TEMPORAL}
            RENAME TO ${TABLA_ORIGINAL}
        `).run();

        for (const objeto of objetosDependientes) {
            db.prepare(objeto.sql).run();
        }

        actualizarSecuenciaAutoincrement();
    });

    try {
        transaccion();
    } finally {
        db.pragma('foreign_keys = ON');
    }

    validarDespues();

    console.log('Migración 011_productos_stock_real ejecutada correctamente.');
    console.log('Columnas actualizadas:');
    console.log('- productos.stock_actual REAL');
    console.log('- productos.stock_minimo REAL');
}

try {
    migrarProductosStockReal();
} catch (error) {
    console.error('Error ejecutando migración 011_productos_stock_real:');
    console.error(error);
    process.exit(1);
}