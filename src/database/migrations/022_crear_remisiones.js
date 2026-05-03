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
        'cotizaciones',
        'numeraciones_documentos',
    ];

    const faltantes = tablasRequeridas.filter((tabla) => !tablaExiste(tabla));

    if (faltantes.length > 0) {
        throw new Error(
            `Faltan tablas requeridas para remisiones: ${faltantes.join(', ')}. `
            + 'Ejecuta primero las migraciones anteriores.'
        );
    }
}

function asegurarNumeracionRemision() {
    const existente = db
        .prepare(`
            SELECT id_numeracion
            FROM numeraciones_documentos
            WHERE codigo_documento = 'remision'
            LIMIT 1
        `)
        .get();

    if (existente) {
        console.log('Numeración de remisiones ya existe. Se omite siembra.');
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
            'remision',
            'Remisión',
            'RM',
            6,
            0,
            'remision',
            1,
            'Numeración para documentos comerciales de remisión.'
        )
    `).run();

    console.log('Numeración RM creada en numeraciones_documentos.');
}

function crearTablaRemisiones() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS remisiones (
            id_remision INTEGER PRIMARY KEY AUTOINCREMENT,

            id_cliente INTEGER,
            id_usuario INTEGER NOT NULL,

            id_cotizacion_origen INTEGER,
            id_venta_convertida INTEGER,

            numero_remision TEXT NOT NULL UNIQUE,
            prefijo TEXT NOT NULL DEFAULT 'RM',
            consecutivo INTEGER NOT NULL CHECK (consecutivo > 0),

            fecha_remision TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            fecha_entrega_estimada TEXT,
            fecha_entregada TEXT,

            direccion_entrega TEXT,
            contacto_entrega TEXT,
            telefono_entrega TEXT,

            subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
            descuento_total INTEGER NOT NULL DEFAULT 0 CHECK (descuento_total >= 0),
            impuesto_total INTEGER NOT NULL DEFAULT 0 CHECK (impuesto_total >= 0),
            total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),

            total_costo INTEGER NOT NULL DEFAULT 0 CHECK (total_costo >= 0),
            utilidad_bruta INTEGER NOT NULL DEFAULT 0,

            afecta_inventario INTEGER NOT NULL DEFAULT 0 CHECK (afecta_inventario IN (0, 1)),
            inventario_afectado_en TEXT,

            estado TEXT NOT NULL DEFAULT 'emitida'
                CHECK (estado IN (
                    'borrador',
                    'emitida',
                    'entregada',
                    'convertida',
                    'anulada'
                )),

            origen TEXT NOT NULL DEFAULT 'manual'
                CHECK (origen IN ('manual', 'cotizacion', 'venta', 'importada')),

            observaciones TEXT,
            condiciones_entrega TEXT,

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

            FOREIGN KEY (id_cotizacion_origen)
                REFERENCES cotizaciones(id_cotizacion)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

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

    console.log('Tabla remisiones verificada.');
}

function crearTablaDetalleRemisiones() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS detalle_remisiones (
            id_detalle_remision INTEGER PRIMARY KEY AUTOINCREMENT,

            id_remision INTEGER NOT NULL,
            id_producto INTEGER,

            id_unidad_medida INTEGER,
            unidad_abreviatura TEXT,

            codigo_interno TEXT,
            codigo_barras TEXT,
            nombre_producto TEXT NOT NULL,
            descripcion_producto TEXT,

            cantidad REAL NOT NULL CHECK (cantidad > 0),

            precio_unitario INTEGER NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),
            precio_costo_unitario INTEGER NOT NULL DEFAULT 0 CHECK (precio_costo_unitario >= 0),
            descuento_unitario INTEGER NOT NULL DEFAULT 0 CHECK (descuento_unitario >= 0),

            porcentaje_iva INTEGER NOT NULL DEFAULT 0 CHECK (porcentaje_iva >= 0),
            impuesto_unitario INTEGER NOT NULL DEFAULT 0 CHECK (impuesto_unitario >= 0),
            impuesto_total INTEGER NOT NULL DEFAULT 0 CHECK (impuesto_total >= 0),

            subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
            total_linea INTEGER NOT NULL DEFAULT 0 CHECK (total_linea >= 0),

            costo_total INTEGER NOT NULL DEFAULT 0 CHECK (costo_total >= 0),
            utilidad_bruta INTEGER NOT NULL DEFAULT 0,

            afecta_inventario INTEGER NOT NULL DEFAULT 0 CHECK (afecta_inventario IN (0, 1)),
            stock_anterior REAL,
            stock_nuevo REAL,

            orden INTEGER NOT NULL DEFAULT 0,
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (id_remision)
                REFERENCES remisiones(id_remision)
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

    console.log('Tabla detalle_remisiones verificada.');
}

function crearIndices() {
    crearIndiceSiNoExiste(
        'idx_remisiones_numero',
        `CREATE INDEX idx_remisiones_numero
         ON remisiones(numero_remision)`
    );

    crearIndiceSiNoExiste(
        'idx_remisiones_cliente',
        `CREATE INDEX idx_remisiones_cliente
         ON remisiones(id_cliente)`
    );

    crearIndiceSiNoExiste(
        'idx_remisiones_usuario',
        `CREATE INDEX idx_remisiones_usuario
         ON remisiones(id_usuario)`
    );

    crearIndiceSiNoExiste(
        'idx_remisiones_estado',
        `CREATE INDEX idx_remisiones_estado
         ON remisiones(estado)`
    );

    crearIndiceSiNoExiste(
        'idx_remisiones_fecha',
        `CREATE INDEX idx_remisiones_fecha
         ON remisiones(fecha_remision)`
    );

    crearIndiceSiNoExiste(
        'idx_remisiones_cotizacion_origen',
        `CREATE INDEX idx_remisiones_cotizacion_origen
         ON remisiones(id_cotizacion_origen)`
    );

    crearIndiceSiNoExiste(
        'idx_remisiones_venta_convertida',
        `CREATE INDEX idx_remisiones_venta_convertida
         ON remisiones(id_venta_convertida)`
    );

    crearIndiceSiNoExiste(
        'idx_detalle_remisiones_remision',
        `CREATE INDEX idx_detalle_remisiones_remision
         ON detalle_remisiones(id_remision)`
    );

    crearIndiceSiNoExiste(
        'idx_detalle_remisiones_producto',
        `CREATE INDEX idx_detalle_remisiones_producto
         ON detalle_remisiones(id_producto)`
    );
}

function imprimirResumen() {
    const totales = db
        .prepare(`
            SELECT
                (SELECT COUNT(*) FROM remisiones) AS total_remisiones,
                (SELECT COUNT(*) FROM detalle_remisiones) AS total_detalles
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
            WHERE codigo_documento = 'remision'
            LIMIT 1
        `)
        .get();

    console.log('\n====================================');
    console.log('MIGRACIÓN 022 - REMISIONES');
    console.log('====================================');
    console.table([totales]);
    console.table([numeracion]);
}

function ejecutarMigracion() {
    validarDependencias();

    const transaccion = db.transaction(() => {
        asegurarNumeracionRemision();
        crearTablaRemisiones();
        crearTablaDetalleRemisiones();
        crearIndices();
    });

    transaccion();

    console.log('Migración 022 ejecutada correctamente.');
    imprimirResumen();
}

ejecutarMigracion();