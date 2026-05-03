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

function validarDependencias() {
    const requeridas = [
        'ventas',
        'detalle_ventas',
        'clientes',
        'usuarios',
        'numeraciones_documentos',
    ];

    const faltantes = requeridas.filter((tabla) => !tablaExiste(tabla));

    if (faltantes.length > 0) {
        throw new Error(
            `Faltan tablas requeridas para notas crédito: ${faltantes.join(', ')}`
        );
    }
}

function sembrarNumeracionNotaCredito() {
    const existente = db
        .prepare(`
            SELECT id_numeracion
            FROM numeraciones_documentos
            WHERE codigo_documento = 'nota_credito'
            LIMIT 1
        `)
        .get();

    if (existente) {
        console.log('Numeración de nota crédito ya existe. Se omite siembra.');
        return;
    }

    db
        .prepare(`
            INSERT INTO numeraciones_documentos (
                codigo_documento,
                nombre_documento,
                prefijo,
                longitud_consecutivo,
                ultimo_consecutivo,
                tipo_comprobante,
                activo,
                observaciones
            ) VALUES (
                'nota_credito',
                'Nota crédito interna',
                'NC',
                6,
                0,
                'nota_credito',
                1,
                'Numeración interna para notas crédito. Preparada para futuras integraciones fiscales.'
            )
        `)
        .run();

    console.log('Numeración de nota crédito sembrada correctamente.');
}

function crearTablaNotasCredito() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS notas_credito (
            id_nota_credito INTEGER PRIMARY KEY AUTOINCREMENT,

            id_venta INTEGER NOT NULL,
            id_cliente INTEGER,
            id_usuario INTEGER NOT NULL,

            numero_nota_credito TEXT NOT NULL UNIQUE,
            prefijo TEXT NOT NULL DEFAULT 'NC',
            consecutivo INTEGER NOT NULL,

            tipo_nota TEXT NOT NULL DEFAULT 'total',
            origen TEXT NOT NULL DEFAULT 'anulacion_venta',

            id_anulacion_venta INTEGER,

            fecha_nota TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            subtotal INTEGER NOT NULL DEFAULT 0,
            descuento_total INTEGER NOT NULL DEFAULT 0,
            impuesto_total INTEGER NOT NULL DEFAULT 0,
            total INTEGER NOT NULL DEFAULT 0,

            motivo TEXT NOT NULL,
            observaciones TEXT,

            estado TEXT NOT NULL DEFAULT 'emitida',

            documento_fiscal_estado TEXT NOT NULL DEFAULT 'interno',
            documento_fiscal_referencia TEXT,
            cude TEXT,
            qr TEXT,
            xml TEXT,
            respuesta_dian TEXT,

            creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizada_en TEXT,
            anulada_en TEXT,
            anulada_por INTEGER,
            motivo_anulacion TEXT,

            FOREIGN KEY (id_venta)
                REFERENCES ventas(id_venta)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_cliente)
                REFERENCES clientes(id_cliente)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (id_usuario)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_anulacion_venta)
                REFERENCES anulaciones_venta(id_anulacion_venta)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (anulada_por)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );
    `);

    console.log('Tabla notas_credito verificada.');
}

function crearTablaDetalleNotasCredito() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS detalle_notas_credito (
            id_detalle_nota_credito INTEGER PRIMARY KEY AUTOINCREMENT,

            id_nota_credito INTEGER NOT NULL,
            id_venta INTEGER NOT NULL,
            id_detalle_venta INTEGER,
            id_producto INTEGER,

            id_unidad_medida INTEGER,
            unidad_abreviatura TEXT,

            codigo_interno TEXT,
            codigo_barras TEXT,
            nombre_producto TEXT NOT NULL,

            cantidad REAL NOT NULL,

            precio_unitario INTEGER NOT NULL DEFAULT 0,
            precio_costo_unitario INTEGER NOT NULL DEFAULT 0,
            descuento_unitario INTEGER NOT NULL DEFAULT 0,

            porcentaje_iva INTEGER NOT NULL DEFAULT 0,
            impuesto_unitario INTEGER NOT NULL DEFAULT 0,
            impuesto_total INTEGER NOT NULL DEFAULT 0,

            subtotal INTEGER NOT NULL DEFAULT 0,
            total_linea INTEGER NOT NULL DEFAULT 0,
            costo_total INTEGER NOT NULL DEFAULT 0,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (id_nota_credito)
                REFERENCES notas_credito(id_nota_credito)
                ON UPDATE CASCADE
                ON DELETE CASCADE,

            FOREIGN KEY (id_venta)
                REFERENCES ventas(id_venta)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_detalle_venta)
                REFERENCES detalle_ventas(id_detalle_venta)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (id_producto)
                REFERENCES productos(id_producto)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );
    `);

    console.log('Tabla detalle_notas_credito verificada.');
}

function crearIndices() {
    crearIndiceSiNoExiste(
        'idx_notas_credito_numero',
        `CREATE INDEX idx_notas_credito_numero
         ON notas_credito(numero_nota_credito)`
    );

    crearIndiceSiNoExiste(
        'idx_notas_credito_venta',
        `CREATE INDEX idx_notas_credito_venta
         ON notas_credito(id_venta)`
    );

    crearIndiceSiNoExiste(
        'idx_notas_credito_cliente',
        `CREATE INDEX idx_notas_credito_cliente
         ON notas_credito(id_cliente)`
    );

    crearIndiceSiNoExiste(
        'idx_notas_credito_estado',
        `CREATE INDEX idx_notas_credito_estado
         ON notas_credito(estado)`
    );

    crearIndiceSiNoExiste(
        'idx_notas_credito_fecha',
        `CREATE INDEX idx_notas_credito_fecha
         ON notas_credito(fecha_nota)`
    );

    crearIndiceSiNoExiste(
        'idx_notas_credito_anulacion',
        `CREATE INDEX idx_notas_credito_anulacion
         ON notas_credito(id_anulacion_venta)`
    );

    crearIndiceSiNoExiste(
        'idx_detalle_notas_credito_nota',
        `CREATE INDEX idx_detalle_notas_credito_nota
         ON detalle_notas_credito(id_nota_credito)`
    );

    crearIndiceSiNoExiste(
        'idx_detalle_notas_credito_venta',
        `CREATE INDEX idx_detalle_notas_credito_venta
         ON detalle_notas_credito(id_venta)`
    );

    crearIndiceSiNoExiste(
        'idx_detalle_notas_credito_producto',
        `CREATE INDEX idx_detalle_notas_credito_producto
         ON detalle_notas_credito(id_producto)`
    );
}

function validarColumnasMinimas() {
    const columnasNotas = [
        'id_nota_credito',
        'id_venta',
        'numero_nota_credito',
        'tipo_nota',
        'origen',
        'subtotal',
        'impuesto_total',
        'total',
        'motivo',
        'estado',
    ];

    const columnasDetalle = [
        'id_detalle_nota_credito',
        'id_nota_credito',
        'id_venta',
        'id_producto',
        'nombre_producto',
        'cantidad',
        'subtotal',
        'impuesto_total',
        'total_linea',
    ];

    const faltantesNotas = columnasNotas.filter(
        (columna) => !columnaExiste('notas_credito', columna)
    );

    const faltantesDetalle = columnasDetalle.filter(
        (columna) => !columnaExiste('detalle_notas_credito', columna)
    );

    if (faltantesNotas.length > 0) {
        throw new Error(
            `Faltan columnas en notas_credito: ${faltantesNotas.join(', ')}`
        );
    }

    if (faltantesDetalle.length > 0) {
        throw new Error(
            `Faltan columnas en detalle_notas_credito: ${faltantesDetalle.join(', ')}`
        );
    }

    console.log('Columnas mínimas de notas crédito verificadas.');
}

function imprimirResumen() {
    const resumen = db
        .prepare(`
            SELECT
                (SELECT COUNT(*) FROM notas_credito) AS total_notas_credito,
                (SELECT COUNT(*) FROM detalle_notas_credito) AS total_detalles,
                (
                    SELECT prefijo || '-' || printf('%0' || longitud_consecutivo || 'd', ultimo_consecutivo + 1)
                    FROM numeraciones_documentos
                    WHERE codigo_documento = 'nota_credito'
                    LIMIT 1
                ) AS siguiente_numero
        `)
        .get();

    console.log('\n====================================');
    console.log('MIGRACIÓN 028 - NOTAS CRÉDITO INTERNAS');
    console.log('====================================');
    console.table([resumen]);

    const numeracion = db
        .prepare(`
            SELECT
                codigo_documento,
                nombre_documento,
                prefijo,
                longitud_consecutivo,
                ultimo_consecutivo,
                tipo_comprobante,
                activo
            FROM numeraciones_documentos
            WHERE codigo_documento = 'nota_credito'
            LIMIT 1
        `)
        .get();

    console.log('\nNumeración nota crédito:');
    console.table(numeracion ? [numeracion] : []);
}

function ejecutarMigracion() {
    validarDependencias();

    const transaccion = db.transaction(() => {
        sembrarNumeracionNotaCredito();
        crearTablaNotasCredito();
        crearTablaDetalleNotasCredito();
        crearIndices();
        validarColumnasMinimas();
    });

    transaccion();

    console.log('Migración 028 ejecutada correctamente.');
    imprimirResumen();
}

ejecutarMigracion();