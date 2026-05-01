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

function obtenerUltimoConsecutivoComprobantes(prefijo) {
    if (!tablaExiste('comprobantes')) {
        return 0;
    }

    const resultado = db
        .prepare(`
            SELECT COALESCE(MAX(consecutivo), 0) AS ultimo_consecutivo
            FROM comprobantes
            WHERE prefijo = ?
        `)
        .get(prefijo);

    return Number(resultado?.ultimo_consecutivo || 0);
}

function crearTablaNumeraciones() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS numeraciones_documentos (
            id_numeracion INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo_documento TEXT NOT NULL UNIQUE,
            nombre_documento TEXT NOT NULL,
            prefijo TEXT NOT NULL,
            longitud_consecutivo INTEGER NOT NULL DEFAULT 6,
            ultimo_consecutivo INTEGER NOT NULL DEFAULT 0,
            tipo_comprobante TEXT,
            activo INTEGER NOT NULL DEFAULT 1,
            observaciones TEXT,
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_numeraciones_documentos_codigo
        ON numeraciones_documentos(codigo_documento)
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_numeraciones_documentos_activo
        ON numeraciones_documentos(activo)
    `).run();
}

function insertarSiNoExiste({
    codigo_documento,
    nombre_documento,
    prefijo,
    longitud_consecutivo = 6,
    ultimo_consecutivo = 0,
    tipo_comprobante = null,
    observaciones = null,
}) {
    const existente = db
        .prepare(`
            SELECT *
            FROM numeraciones_documentos
            WHERE codigo_documento = ?
            LIMIT 1
        `)
        .get(codigo_documento);

    if (!existente) {
        db.prepare(`
            INSERT INTO numeraciones_documentos (
                codigo_documento,
                nombre_documento,
                prefijo,
                longitud_consecutivo,
                ultimo_consecutivo,
                tipo_comprobante,
                activo,
                observaciones
            )
            VALUES (
                @codigo_documento,
                @nombre_documento,
                @prefijo,
                @longitud_consecutivo,
                @ultimo_consecutivo,
                @tipo_comprobante,
                1,
                @observaciones
            )
        `).run({
            codigo_documento,
            nombre_documento,
            prefijo,
            longitud_consecutivo,
            ultimo_consecutivo,
            tipo_comprobante,
            observaciones,
        });

        return;
    }

    if (Number(ultimo_consecutivo || 0) > Number(existente.ultimo_consecutivo || 0)) {
        db.prepare(`
            UPDATE numeraciones_documentos
            SET ultimo_consecutivo = @ultimo_consecutivo,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE codigo_documento = @codigo_documento
        `).run({
            codigo_documento,
            ultimo_consecutivo,
        });
    }
}

function sembrarNumeracionesBase() {
    const ultimoFacturaVenta = obtenerUltimoConsecutivoComprobantes('FV');

    insertarSiNoExiste({
        codigo_documento: 'factura_venta',
        nombre_documento: 'Factura de venta',
        prefijo: 'FV',
        longitud_consecutivo: 6,
        ultimo_consecutivo: ultimoFacturaVenta,
        tipo_comprobante: 'recibo_interno',
        observaciones: 'Numeración principal para ventas generadas desde POS.',
    });

    insertarSiNoExiste({
        codigo_documento: 'cotizacion',
        nombre_documento: 'Cotización',
        prefijo: 'COT',
        longitud_consecutivo: 6,
        ultimo_consecutivo: 0,
        tipo_comprobante: 'cotizacion',
        observaciones: 'Numeración reservada para el futuro módulo de cotizaciones.',
    });

    insertarSiNoExiste({
        codigo_documento: 'remision',
        nombre_documento: 'Remisión',
        prefijo: 'RM',
        longitud_consecutivo: 6,
        ultimo_consecutivo: 0,
        tipo_comprobante: 'remision',
        observaciones: 'Numeración reservada para el futuro módulo de remisiones.',
    });
}

function imprimirResultado() {
    const numeraciones = db
        .prepare(`
            SELECT
                id_numeracion,
                codigo_documento,
                nombre_documento,
                prefijo,
                longitud_consecutivo,
                ultimo_consecutivo,
                prefijo || '-' || printf('%0' || longitud_consecutivo || 'd', ultimo_consecutivo + 1) AS siguiente_numero,
                tipo_comprobante,
                activo
            FROM numeraciones_documentos
            ORDER BY id_numeracion ASC
        `)
        .all();

    console.log('\n====================================');
    console.log('NUMERACIONES DOCUMENTALES');
    console.log('====================================');
    console.table(numeraciones);
}

function ejecutarMigracion() {
    const transaccion = db.transaction(() => {
        crearTablaNumeraciones();
        sembrarNumeracionesBase();
    });

    transaccion();

    console.log('Migración ejecutada correctamente.');
    console.log('Tabla numeraciones_documentos lista.');

    imprimirResultado();
}

ejecutarMigracion();