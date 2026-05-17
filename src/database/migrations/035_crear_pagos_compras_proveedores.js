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
    const dependencias = [
        'compras',
        'proveedores',
        'usuarios',
        'medios_pago',
        'turnos_caja',
        'movimientos_caja',
    ];

    for (const tabla of dependencias) {
        if (!tablaExiste(tabla)) {
            throw new Error(`No existe la tabla ${tabla}. Ejecuta primero las migraciones anteriores.`);
        }
    }
}

function crearTablaPagosComprasProveedores() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS pagos_compras_proveedores (
            id_pago_compra_proveedor INTEGER PRIMARY KEY AUTOINCREMENT,

            id_compra INTEGER NOT NULL,
            id_proveedor INTEGER NOT NULL,
            id_usuario INTEGER NOT NULL,

            id_medio_pago INTEGER NOT NULL,
            id_turno_caja INTEGER,
            id_movimiento_caja INTEGER,

            fecha_pago TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            monto_pagado INTEGER NOT NULL
                CHECK (monto_pagado > 0),

            referencia_pago TEXT,
            entidad_pago TEXT,
            observaciones TEXT,

            estado TEXT NOT NULL DEFAULT 'registrado'
                CHECK (estado IN ('registrado', 'anulado')),

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT,
            anulado_en TEXT,
            anulado_por INTEGER,
            motivo_anulacion TEXT,

            FOREIGN KEY (id_compra)
                REFERENCES compras(id_compra)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_proveedor)
                REFERENCES proveedores(id_proveedor)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_usuario)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_medio_pago)
                REFERENCES medios_pago(id_medio_pago)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_turno_caja)
                REFERENCES turnos_caja(id_turno_caja)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (id_movimiento_caja)
                REFERENCES movimientos_caja(id_movimiento_caja)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (anulado_por)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );
    `);

    console.log('Tabla pagos_compras_proveedores verificada.');
}

function crearIndices() {
    crearIndiceSiNoExiste(
        'idx_pagos_compras_proveedores_compra',
        'CREATE INDEX idx_pagos_compras_proveedores_compra ON pagos_compras_proveedores (id_compra)'
    );

    crearIndiceSiNoExiste(
        'idx_pagos_compras_proveedores_proveedor',
        'CREATE INDEX idx_pagos_compras_proveedores_proveedor ON pagos_compras_proveedores (id_proveedor)'
    );

    crearIndiceSiNoExiste(
        'idx_pagos_compras_proveedores_fecha',
        'CREATE INDEX idx_pagos_compras_proveedores_fecha ON pagos_compras_proveedores (fecha_pago)'
    );

    crearIndiceSiNoExiste(
        'idx_pagos_compras_proveedores_estado',
        'CREATE INDEX idx_pagos_compras_proveedores_estado ON pagos_compras_proveedores (estado)'
    );

    crearIndiceSiNoExiste(
        'idx_pagos_compras_proveedores_medio_pago',
        'CREATE INDEX idx_pagos_compras_proveedores_medio_pago ON pagos_compras_proveedores (id_medio_pago)'
    );

    crearIndiceSiNoExiste(
        'idx_pagos_compras_proveedores_turno',
        'CREATE INDEX idx_pagos_compras_proveedores_turno ON pagos_compras_proveedores (id_turno_caja)'
    );

    crearIndiceSiNoExiste(
        'idx_pagos_compras_proveedores_movimiento_caja',
        'CREATE INDEX idx_pagos_compras_proveedores_movimiento_caja ON pagos_compras_proveedores (id_movimiento_caja)'
    );
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
            'migracion_pagos_compras_proveedores',
            'pagos_compras_proveedores',
            NULL,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_035'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            version: '035',
            mensaje: 'Se creó la tabla pagos_compras_proveedores para pagos a proveedores desde compras.',
        }),
    });

    console.log('Auditoría de migración 035 registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 035...');
    console.log('Pagos de compras a proveedores');
    console.log('====================================');

    const transaccion = db.transaction(() => {
        validarDependencias();
        crearTablaPagosComprasProveedores();
        crearIndices();
        registrarAuditoriaMigracion();
    });

    transaccion();

    console.log('====================================');
    console.log('Migración 035 ejecutada correctamente.');
    console.log('====================================');
}

ejecutarMigracion();