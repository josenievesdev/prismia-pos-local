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
    const requeridas = [
        'proveedores',
        'productos',
        'usuarios',
        'movimientos_inventario',
    ];

    const faltantes = requeridas.filter((tabla) => !tablaExiste(tabla));

    if (faltantes.length > 0) {
        throw new Error(
            `Faltan tablas requeridas para compras: ${faltantes.join(', ')}`
        );
    }
}

function sembrarNumeracionCompra() {
    if (!tablaExiste('numeraciones_documentos')) {
        console.log('No existe numeraciones_documentos. Se omite numeración de compras.');
        return;
    }

    const existente = db
        .prepare(`
            SELECT id_numeracion
            FROM numeraciones_documentos
            WHERE codigo_documento = 'compra_proveedor'
            LIMIT 1
        `)
        .get();

    if (existente) {
        console.log('Numeración compra_proveedor ya existe. Se omite.');
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
            'compra_proveedor',
            'Compra a proveedor',
            'CP',
            6,
            0,
            'compra_interna',
            1,
            'Numeración interna para compras a proveedores. No corresponde a documento DIAN.'
        )
    `).run();

    console.log('Numeración compra_proveedor creada.');
}

function crearTablasCompras() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS compras (
            id_compra INTEGER PRIMARY KEY AUTOINCREMENT,

            numero_compra TEXT NOT NULL UNIQUE,

            id_proveedor INTEGER NOT NULL,
            id_usuario INTEGER,

            numero_soporte TEXT,
            tipo_soporte TEXT NOT NULL DEFAULT 'factura_proveedor'
                CHECK (tipo_soporte IN (
                    'factura_proveedor',
                    'cuenta_cobro',
                    'remision',
                    'otro'
                )),

            fecha_compra TEXT NOT NULL,
            fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            subtotal INTEGER NOT NULL DEFAULT 0
                CHECK (subtotal >= 0),

            iva_total INTEGER NOT NULL DEFAULT 0
                CHECK (iva_total >= 0),

            total INTEGER NOT NULL DEFAULT 0
                CHECK (total >= 0),

            estado TEXT NOT NULL DEFAULT 'registrada'
                CHECK (estado IN ('borrador', 'registrada', 'anulada')),

            observaciones TEXT,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT,
            anulado_en TEXT,

            FOREIGN KEY (id_proveedor)
                REFERENCES proveedores(id_proveedor)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_usuario)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS compras_detalle (
            id_compra_detalle INTEGER PRIMARY KEY AUTOINCREMENT,

            id_compra INTEGER NOT NULL,
            id_producto INTEGER NOT NULL,

            cantidad REAL NOT NULL
                CHECK (cantidad > 0),

            costo_unitario INTEGER NOT NULL DEFAULT 0
                CHECK (costo_unitario >= 0),

            porcentaje_iva INTEGER NOT NULL DEFAULT 0
                CHECK (porcentaje_iva >= 0),

            subtotal_linea INTEGER NOT NULL DEFAULT 0
                CHECK (subtotal_linea >= 0),

            iva_linea INTEGER NOT NULL DEFAULT 0
                CHECK (iva_linea >= 0),

            total_linea INTEGER NOT NULL DEFAULT 0
                CHECK (total_linea >= 0),

            stock_anterior REAL NOT NULL DEFAULT 0,
            stock_nuevo REAL NOT NULL DEFAULT 0,

            ultimo_costo_anterior INTEGER NOT NULL DEFAULT 0,
            costo_promedio_anterior INTEGER NOT NULL DEFAULT 0,
            costo_promedio_nuevo INTEGER NOT NULL DEFAULT 0,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (id_compra)
                REFERENCES compras(id_compra)
                ON UPDATE CASCADE
                ON DELETE CASCADE,

            FOREIGN KEY (id_producto)
                REFERENCES productos(id_producto)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        );
    `);

    crearIndiceSiNoExiste(
        'idx_compras_proveedor',
        `CREATE INDEX idx_compras_proveedor ON compras (id_proveedor)`
    );

    crearIndiceSiNoExiste(
        'idx_compras_fecha',
        `CREATE INDEX idx_compras_fecha ON compras (fecha_compra)`
    );

    crearIndiceSiNoExiste(
        'idx_compras_estado',
        `CREATE INDEX idx_compras_estado ON compras (estado)`
    );

    crearIndiceSiNoExiste(
        'idx_compras_detalle_compra',
        `CREATE INDEX idx_compras_detalle_compra ON compras_detalle (id_compra)`
    );

    crearIndiceSiNoExiste(
        'idx_compras_detalle_producto',
        `CREATE INDEX idx_compras_detalle_producto ON compras_detalle (id_producto)`
    );

    crearIndiceSiNoExiste(
        'idx_compras_soporte_proveedor_unico',
        `
            CREATE UNIQUE INDEX idx_compras_soporte_proveedor_unico
            ON compras (id_proveedor, numero_soporte)
            WHERE numero_soporte IS NOT NULL
              AND numero_soporte <> ''
              AND estado <> 'anulada'
        `
    );

    console.log('Tablas compras y compras_detalle verificadas.');
}

function ejecutarMigracion() {
    const transaccion = db.transaction(() => {
        validarDependencias();
        sembrarNumeracionCompra();
        crearTablasCompras();
    });

    transaccion();

    console.log('Migración compras ejecutada correctamente.');
}

ejecutarMigracion();