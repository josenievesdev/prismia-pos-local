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
    const tablasRequeridas = [
        'clientes',
        'usuarios',
        'productos',
        'unidades_medida',
        'ventas',
        'numeraciones_documentos',
    ];

    const faltantes = tablasRequeridas.filter((tabla) => !tablaExiste(tabla));

    if (faltantes.length > 0) {
        throw new Error(
            `Faltan tablas requeridas para cotizaciones: ${faltantes.join(', ')}. `
            + 'Ejecuta primero las migraciones base anteriores.'
        );
    }
}

function asegurarNumeracionCotizacion() {
    const existente = db
        .prepare(`
            SELECT id_numeracion
            FROM numeraciones_documentos
            WHERE codigo_documento = 'cotizacion'
            LIMIT 1
        `)
        .get();

    if (existente) {
        console.log('Numeración de cotizaciones ya existe. Se omite siembra.');
        return;
    }

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
        ) VALUES (
            'cotizacion',
            'Cotización',
            'COT',
            6,
            0,
            'cotizacion',
            1,
            'Numeración para documentos comerciales de cotización.'
        )
    `).run();

    console.log('Numeración COT creada en numeraciones_documentos.');
}

function crearTablaCotizaciones() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS cotizaciones (
            id_cotizacion INTEGER PRIMARY KEY AUTOINCREMENT,

            id_cliente INTEGER,
            id_usuario INTEGER NOT NULL,

            numero_cotizacion TEXT NOT NULL UNIQUE,
            prefijo TEXT NOT NULL DEFAULT 'COT',
            consecutivo INTEGER NOT NULL CHECK (consecutivo > 0),

            fecha_cotizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            fecha_vencimiento TEXT,
            validez_dias INTEGER NOT NULL DEFAULT 15 CHECK (validez_dias >= 0),

            subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
            descuento_total INTEGER NOT NULL DEFAULT 0 CHECK (descuento_total >= 0),
            impuesto_total INTEGER NOT NULL DEFAULT 0 CHECK (impuesto_total >= 0),
            total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),

            total_costo INTEGER NOT NULL DEFAULT 0 CHECK (total_costo >= 0),
            utilidad_bruta INTEGER NOT NULL DEFAULT 0,

            estado TEXT NOT NULL DEFAULT 'emitida'
                CHECK (estado IN (
                    'borrador',
                    'emitida',
                    'aceptada',
                    'rechazada',
                    'vencida',
                    'convertida',
                    'anulada'
                )),

            origen TEXT NOT NULL DEFAULT 'manual'
                CHECK (origen IN ('manual', 'pos', 'importada')),

            observaciones TEXT,
            condiciones_comerciales TEXT,

            id_venta_convertida INTEGER,
            convertida_en TEXT,

            anulada_en TEXT,
            anulada_por INTEGER,
            motivo_anulacion TEXT,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT,

            UNIQUE (prefijo, consecutivo),

            FOREIGN KEY (id_cliente)
                REFERENCES clientes(id_cliente)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (id_usuario)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_venta_convertida)
                REFERENCES ventas(id_venta)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (anulada_por)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );
    `);

    console.log('Tabla cotizaciones verificada.');
}

function crearTablaDetalleCotizaciones() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS detalle_cotizaciones (
            id_detalle_cotizacion INTEGER PRIMARY KEY AUTOINCREMENT,

            id_cotizacion INTEGER NOT NULL,
            id_producto INTEGER,

            id_unidad_medida INTEGER,
            unidad_abreviatura TEXT,

            codigo_interno TEXT,
            codigo_barras TEXT,
            nombre_producto TEXT NOT NULL,
            descripcion_producto TEXT,

            cantidad REAL NOT NULL CHECK (cantidad > 0),

            precio_unitario INTEGER NOT NULL CHECK (precio_unitario >= 0),
            precio_costo_unitario INTEGER NOT NULL DEFAULT 0 CHECK (precio_costo_unitario >= 0),
            descuento_unitario INTEGER NOT NULL DEFAULT 0 CHECK (descuento_unitario >= 0),

            porcentaje_iva INTEGER NOT NULL DEFAULT 0 CHECK (porcentaje_iva >= 0),
            impuesto_unitario INTEGER NOT NULL DEFAULT 0 CHECK (impuesto_unitario >= 0),
            impuesto_total INTEGER NOT NULL DEFAULT 0 CHECK (impuesto_total >= 0),

            subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
            total_linea INTEGER NOT NULL DEFAULT 0 CHECK (total_linea >= 0),

            costo_total INTEGER NOT NULL DEFAULT 0 CHECK (costo_total >= 0),
            utilidad_bruta INTEGER NOT NULL DEFAULT 0,

            orden INTEGER NOT NULL DEFAULT 0,
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (id_cotizacion)
                REFERENCES cotizaciones(id_cotizacion)
                ON UPDATE CASCADE
                ON DELETE CASCADE,

            FOREIGN KEY (id_producto)
                REFERENCES productos(id_producto)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (id_unidad_medida)
                REFERENCES unidades_medida(id_unidad_medida)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );
    `);

    console.log('Tabla detalle_cotizaciones verificada.');
}

function crearIndices() {
    crearIndiceSiNoExiste(
        'idx_cotizaciones_numero',
        `CREATE INDEX idx_cotizaciones_numero
         ON cotizaciones(numero_cotizacion)`
    );

    crearIndiceSiNoExiste(
        'idx_cotizaciones_cliente',
        `CREATE INDEX idx_cotizaciones_cliente
         ON cotizaciones(id_cliente)`
    );

    crearIndiceSiNoExiste(
        'idx_cotizaciones_usuario',
        `CREATE INDEX idx_cotizaciones_usuario
         ON cotizaciones(id_usuario)`
    );

    crearIndiceSiNoExiste(
        'idx_cotizaciones_estado',
        `CREATE INDEX idx_cotizaciones_estado
         ON cotizaciones(estado)`
    );

    crearIndiceSiNoExiste(
        'idx_cotizaciones_fecha',
        `CREATE INDEX idx_cotizaciones_fecha
         ON cotizaciones(fecha_cotizacion)`
    );

    crearIndiceSiNoExiste(
        'idx_detalle_cotizaciones_cotizacion',
        `CREATE INDEX idx_detalle_cotizaciones_cotizacion
         ON detalle_cotizaciones(id_cotizacion)`
    );

    crearIndiceSiNoExiste(
        'idx_detalle_cotizaciones_producto',
        `CREATE INDEX idx_detalle_cotizaciones_producto
         ON detalle_cotizaciones(id_producto)`
    );
}

function imprimirResumen() {
    const totales = db
        .prepare(`
            SELECT
                (SELECT COUNT(*) FROM cotizaciones) AS total_cotizaciones,
                (SELECT COUNT(*) FROM detalle_cotizaciones) AS total_detalles
        `)
        .get();

    const numeracion = db
        .prepare(`
            SELECT
                codigo_documento,
                prefijo,
                longitud_consecutivo,
                ultimo_consecutivo,
                prefijo || '-' || printf('%0' || longitud_consecutivo || 'd', ultimo_consecutivo + 1) AS siguiente_numero,
                activo
            FROM numeraciones_documentos
            WHERE codigo_documento = 'cotizacion'
            LIMIT 1
        `)
        .get();

    console.log('\n====================================');
    console.log('MIGRACIÓN 019 - COTIZACIONES');
    console.log('====================================');
    console.table([totales]);
    console.table([numeracion]);
}

function ejecutarMigracion() {
    validarDependencias();

    const transaccion = db.transaction(() => {
        asegurarNumeracionCotizacion();
        crearTablaCotizaciones();
        crearTablaDetalleCotizaciones();
        crearIndices();
    });

    transaccion();

    console.log('Migración 019 ejecutada correctamente.');
    imprimirResumen();
}

ejecutarMigracion();