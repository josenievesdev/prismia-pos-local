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

function obtenerColumnas(nombreTabla) {
    if (!tablaExiste(nombreTabla)) {
        return [];
    }

    return db.prepare(`PRAGMA table_info(${nombreTabla})`).all();
}

function obtenerTipoColumna(nombreTabla, nombreColumna) {
    const columna = obtenerColumnas(nombreTabla).find(
        (item) => item.name === nombreColumna
    );

    return columna ? String(columna.type || '').toUpperCase() : null;
}

function agregarColumnaSiNoExiste(nombreTabla, nombreColumna, definicionSql) {
    if (columnaExiste(nombreTabla, nombreColumna)) {
        console.log(`Columna ${nombreTabla}.${nombreColumna} ya existe. Se omite.`);
        return;
    }

    db.exec(`
        ALTER TABLE ${nombreTabla}
        ADD COLUMN ${definicionSql};
    `);

    console.log(`Columna ${nombreTabla}.${nombreColumna} agregada.`);
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

function valorColumna(aliasTabla, nombreColumna, valorDefecto) {
    return columnaExiste(aliasTabla.nombreReal, nombreColumna)
        ? `${aliasTabla.alias}.${nombreColumna}`
        : valorDefecto;
}

function crearRespaldoTabla(nombreTabla, nombreRespaldo) {
    if (!tablaExiste(nombreTabla)) {
        throw new Error(`No existe la tabla ${nombreTabla}.`);
    }

    db.exec(`
        CREATE TABLE IF NOT EXISTS ${nombreRespaldo}
        AS SELECT * FROM ${nombreTabla};
    `);

    console.log(`Respaldo ${nombreRespaldo} verificado.`);
}

function agregarColumnasVentas() {
    if (!tablaExiste('ventas')) {
        throw new Error('No existe la tabla ventas. Ejecuta primero npm run db:init.');
    }

    agregarColumnaSiNoExiste(
        'ventas',
        'total_pagado',
        'total_pagado INTEGER NOT NULL DEFAULT 0 CHECK (total_pagado >= 0)'
    );

    agregarColumnaSiNoExiste(
        'ventas',
        'saldo_pendiente',
        'saldo_pendiente INTEGER NOT NULL DEFAULT 0 CHECK (saldo_pendiente >= 0)'
    );

    agregarColumnaSiNoExiste(
        'ventas',
        'cambio_entregado',
        'cambio_entregado INTEGER NOT NULL DEFAULT 0 CHECK (cambio_entregado >= 0)'
    );

    agregarColumnaSiNoExiste(
        'ventas',
        'total_costo',
        'total_costo INTEGER NOT NULL DEFAULT 0 CHECK (total_costo >= 0)'
    );

    agregarColumnaSiNoExiste(
        'ventas',
        'utilidad_bruta',
        'utilidad_bruta INTEGER NOT NULL DEFAULT 0'
    );

    agregarColumnaSiNoExiste(
        'ventas',
        'origen',
        `origen TEXT NOT NULL DEFAULT 'pos'
            CHECK (origen IN ('pos', 'manual', 'importada'))`
    );

    agregarColumnaSiNoExiste(
        'ventas',
        'tipo_venta',
        `tipo_venta TEXT NOT NULL DEFAULT 'contado'
            CHECK (tipo_venta IN ('contado', 'credito', 'mixta'))`
    );

    agregarColumnaSiNoExiste(
        'ventas',
        'requiere_factura',
        'requiere_factura INTEGER NOT NULL DEFAULT 0 CHECK (requiere_factura IN (0, 1))'
    );

    db.exec(`
        UPDATE ventas
        SET
            total_pagado = CASE
                WHEN total_pagado = 0 AND estado = 'pagada' THEN total
                ELSE total_pagado
            END,
            saldo_pendiente = CASE
                WHEN estado = 'pendiente' THEN MAX(total - total_pagado, 0)
                ELSE 0
            END,
            utilidad_bruta = CASE
                WHEN total_costo > 0 THEN total - total_costo
                ELSE utilidad_bruta
            END
        WHERE estado IN ('pagada', 'pendiente');
    `);

    console.log('Columnas y datos base de ventas verificados.');
}

function agregarColumnasPagosVenta() {
    if (!tablaExiste('pagos_venta')) {
        throw new Error('No existe la tabla pagos_venta. Ejecuta primero npm run db:init.');
    }

    if (!tablaExiste('medios_pago')) {
        throw new Error('No existe la tabla medios_pago. Ejecuta primero la migración 003.');
    }

    agregarColumnaSiNoExiste(
        'pagos_venta',
        'id_medio_pago',
        'id_medio_pago INTEGER REFERENCES medios_pago(id_medio_pago) ON UPDATE CASCADE ON DELETE RESTRICT'
    );

    agregarColumnaSiNoExiste(
        'pagos_venta',
        'id_usuario',
        'id_usuario INTEGER REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL'
    );

    agregarColumnaSiNoExiste(
        'pagos_venta',
        'monto_recibido',
        'monto_recibido INTEGER NOT NULL DEFAULT 0 CHECK (monto_recibido >= 0)'
    );

    agregarColumnaSiNoExiste(
        'pagos_venta',
        'cambio_entregado',
        'cambio_entregado INTEGER NOT NULL DEFAULT 0 CHECK (cambio_entregado >= 0)'
    );

    agregarColumnaSiNoExiste(
        'pagos_venta',
        'estado',
        `estado TEXT NOT NULL DEFAULT 'registrado'
            CHECK (estado IN ('registrado', 'anulado'))`
    );

    agregarColumnaSiNoExiste(
        'pagos_venta',
        'anulado_en',
        'anulado_en TEXT'
    );

    agregarColumnaSiNoExiste(
        'pagos_venta',
        'anulado_por',
        'anulado_por INTEGER REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL'
    );

    agregarColumnaSiNoExiste(
        'pagos_venta',
        'motivo_anulacion',
        'motivo_anulacion TEXT'
    );

    db.exec(`
        UPDATE pagos_venta
        SET monto_recibido = CASE
            WHEN monto_recibido = 0 THEN monto
            ELSE monto_recibido
        END;
    `);

    console.log('Columnas y datos base de pagos_venta verificados.');
}

function reconstruirDetalleVentas() {
    if (!tablaExiste('detalle_ventas')) {
        throw new Error('No existe la tabla detalle_ventas. Ejecuta primero npm run db:init.');
    }

    const tipoCantidad = obtenerTipoColumna('detalle_ventas', 'cantidad');
    const requiereReconstruccion =
        tipoCantidad !== 'REAL'
        || !columnaExiste('detalle_ventas', 'id_unidad_medida')
        || !columnaExiste('detalle_ventas', 'unidad_abreviatura')
        || !columnaExiste('detalle_ventas', 'codigo_interno')
        || !columnaExiste('detalle_ventas', 'codigo_barras')
        || !columnaExiste('detalle_ventas', 'porcentaje_iva')
        || !columnaExiste('detalle_ventas', 'impuesto_unitario')
        || !columnaExiste('detalle_ventas', 'impuesto_total')
        || !columnaExiste('detalle_ventas', 'total_linea')
        || !columnaExiste('detalle_ventas', 'costo_total')
        || !columnaExiste('detalle_ventas', 'utilidad_bruta');

    if (!requiereReconstruccion) {
        console.log('Tabla detalle_ventas ya está preparada para POS real. Se omite reconstrucción.');
        return;
    }

    console.log('Reconstruyendo detalle_ventas para cantidades decimales y trazabilidad...');

    crearRespaldoTabla('detalle_ventas', 'detalle_ventas_respaldo_007');

    db.exec(`
        DROP TABLE IF EXISTS detalle_ventas_nueva;

        CREATE TABLE detalle_ventas_nueva (
            id_detalle_venta INTEGER PRIMARY KEY AUTOINCREMENT,

            id_venta INTEGER NOT NULL,
            id_producto INTEGER,

            id_unidad_medida INTEGER,
            unidad_abreviatura TEXT,

            codigo_interno TEXT,
            codigo_barras TEXT,
            nombre_producto TEXT NOT NULL,

            cantidad REAL NOT NULL
                CHECK (cantidad > 0),

            precio_unitario INTEGER NOT NULL
                CHECK (precio_unitario >= 0),

            precio_costo_unitario INTEGER NOT NULL DEFAULT 0
                CHECK (precio_costo_unitario >= 0),

            descuento_unitario INTEGER NOT NULL DEFAULT 0
                CHECK (descuento_unitario >= 0),

            porcentaje_iva INTEGER NOT NULL DEFAULT 0
                CHECK (porcentaje_iva >= 0),

            impuesto_unitario INTEGER NOT NULL DEFAULT 0
                CHECK (impuesto_unitario >= 0),

            impuesto_total INTEGER NOT NULL DEFAULT 0
                CHECK (impuesto_total >= 0),

            subtotal INTEGER NOT NULL
                CHECK (subtotal >= 0),

            total_linea INTEGER NOT NULL DEFAULT 0
                CHECK (total_linea >= 0),

            costo_total INTEGER NOT NULL DEFAULT 0
                CHECK (costo_total >= 0),

            utilidad_bruta INTEGER NOT NULL DEFAULT 0,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (id_venta)
                REFERENCES ventas(id_venta)
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

    const dv = {
        nombreReal: 'detalle_ventas',
        alias: 'dv',
    };

    const exprIdUnidad = columnaExiste('detalle_ventas', 'id_unidad_medida')
        ? 'dv.id_unidad_medida'
        : 'p.id_unidad_medida';

    const exprUnidadAbreviatura = columnaExiste('detalle_ventas', 'unidad_abreviatura')
        ? 'dv.unidad_abreviatura'
        : 'um.abreviatura';

    const exprCodigoInterno = columnaExiste('detalle_ventas', 'codigo_interno')
        ? 'dv.codigo_interno'
        : 'p.codigo_interno';

    const exprCodigoBarras = columnaExiste('detalle_ventas', 'codigo_barras')
        ? 'dv.codigo_barras'
        : 'p.codigo_barras';

    const exprPorcentajeIva = columnaExiste('detalle_ventas', 'porcentaje_iva')
        ? 'dv.porcentaje_iva'
        : 'COALESCE(p.porcentaje_iva, 0)';

    const exprImpuestoUnitario = columnaExiste('detalle_ventas', 'impuesto_unitario')
        ? 'dv.impuesto_unitario'
        : '0';

    const exprImpuestoTotal = columnaExiste('detalle_ventas', 'impuesto_total')
        ? 'dv.impuesto_total'
        : '0';

    const exprTotalLinea = columnaExiste('detalle_ventas', 'total_linea')
        ? 'dv.total_linea'
        : 'dv.subtotal';

    const exprCostoTotal = columnaExiste('detalle_ventas', 'costo_total')
        ? 'dv.costo_total'
        : 'ROUND(COALESCE(dv.precio_costo_unitario, 0) * COALESCE(dv.cantidad, 0))';

    const exprUtilidadBruta = columnaExiste('detalle_ventas', 'utilidad_bruta')
        ? 'dv.utilidad_bruta'
        : `(${exprTotalLinea} - ${exprCostoTotal})`;

    db.exec(`
        INSERT INTO detalle_ventas_nueva (
            id_detalle_venta,
            id_venta,
            id_producto,
            id_unidad_medida,
            unidad_abreviatura,
            codigo_interno,
            codigo_barras,
            nombre_producto,
            cantidad,
            precio_unitario,
            precio_costo_unitario,
            descuento_unitario,
            porcentaje_iva,
            impuesto_unitario,
            impuesto_total,
            subtotal,
            total_linea,
            costo_total,
            utilidad_bruta,
            creado_en
        )
        SELECT
            dv.id_detalle_venta,
            dv.id_venta,
            dv.id_producto,
            ${exprIdUnidad},
            ${exprUnidadAbreviatura},
            ${exprCodigoInterno},
            ${exprCodigoBarras},
            dv.nombre_producto,
            CAST(dv.cantidad AS REAL),
            dv.precio_unitario,
            COALESCE(dv.precio_costo_unitario, 0),
            COALESCE(dv.descuento_unitario, 0),
            COALESCE(${exprPorcentajeIva}, 0),
            COALESCE(${exprImpuestoUnitario}, 0),
            COALESCE(${exprImpuestoTotal}, 0),
            dv.subtotal,
            COALESCE(${exprTotalLinea}, dv.subtotal),
            COALESCE(${exprCostoTotal}, 0),
            COALESCE(${exprUtilidadBruta}, 0),
            dv.creado_en
        FROM detalle_ventas dv
        LEFT JOIN productos p
            ON p.id_producto = dv.id_producto
        LEFT JOIN unidades_medida um
            ON um.id_unidad_medida = p.id_unidad_medida;
    `);

    db.exec(`
        DROP TABLE detalle_ventas;
        ALTER TABLE detalle_ventas_nueva RENAME TO detalle_ventas;
    `);

    console.log('Tabla detalle_ventas reconstruida correctamente.');
}

function reconstruirMovimientosInventario() {
    if (!tablaExiste('movimientos_inventario')) {
        throw new Error('No existe la tabla movimientos_inventario. Ejecuta primero npm run db:init.');
    }

    const tipoCantidad = obtenerTipoColumna('movimientos_inventario', 'cantidad');
    const tipoStockAnterior = obtenerTipoColumna('movimientos_inventario', 'stock_anterior');
    const tipoStockNuevo = obtenerTipoColumna('movimientos_inventario', 'stock_nuevo');

    const requiereReconstruccion =
        tipoCantidad !== 'REAL'
        || tipoStockAnterior !== 'REAL'
        || tipoStockNuevo !== 'REAL'
        || !columnaExiste('movimientos_inventario', 'id_unidad_medida')
        || !columnaExiste('movimientos_inventario', 'unidad_abreviatura')
        || !columnaExiste('movimientos_inventario', 'costo_unitario')
        || !columnaExiste('movimientos_inventario', 'costo_total');

    if (!requiereReconstruccion) {
        console.log('Tabla movimientos_inventario ya está preparada para cantidades decimales. Se omite reconstrucción.');
        return;
    }

    console.log('Reconstruyendo movimientos_inventario para cantidades decimales...');

    crearRespaldoTabla('movimientos_inventario', 'movimientos_inventario_respaldo_007');

    db.exec(`
        DROP TABLE IF EXISTS movimientos_inventario_nueva;

        CREATE TABLE movimientos_inventario_nueva (
            id_movimiento_inventario INTEGER PRIMARY KEY AUTOINCREMENT,

            id_producto INTEGER NOT NULL,
            id_usuario INTEGER NOT NULL,

            id_unidad_medida INTEGER,
            unidad_abreviatura TEXT,

            tipo_movimiento TEXT NOT NULL
                CHECK (tipo_movimiento IN (
                    'entrada_inicial',
                    'ajuste_positivo',
                    'ajuste_negativo',
                    'venta',
                    'devolucion',
                    'compra',
                    'anulacion_venta',
                    'anulacion_devolucion',
                    'conteo_fisico',
                    'merma',
                    'cortesia'
                )),

            cantidad REAL NOT NULL
                CHECK (cantidad > 0),

            stock_anterior REAL NOT NULL
                CHECK (stock_anterior >= 0),

            stock_nuevo REAL NOT NULL
                CHECK (stock_nuevo >= 0),

            costo_unitario INTEGER NOT NULL DEFAULT 0
                CHECK (costo_unitario >= 0),

            costo_total INTEGER NOT NULL DEFAULT 0
                CHECK (costo_total >= 0),

            motivo TEXT,

            referencia_tipo TEXT,
            referencia_id INTEGER,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (id_producto)
                REFERENCES productos(id_producto)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_usuario)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_unidad_medida)
                REFERENCES unidades_medida(id_unidad_medida)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );
    `);

    const exprIdUnidad = columnaExiste('movimientos_inventario', 'id_unidad_medida')
        ? 'mi.id_unidad_medida'
        : 'p.id_unidad_medida';

    const exprUnidadAbreviatura = columnaExiste('movimientos_inventario', 'unidad_abreviatura')
        ? 'mi.unidad_abreviatura'
        : 'um.abreviatura';

    const exprCostoUnitario = columnaExiste('movimientos_inventario', 'costo_unitario')
        ? 'mi.costo_unitario'
        : 'COALESCE(p.costo_promedio, p.precio_costo, 0)';

    const exprCostoTotal = columnaExiste('movimientos_inventario', 'costo_total')
        ? 'mi.costo_total'
        : `ROUND(COALESCE(${exprCostoUnitario}, 0) * COALESCE(mi.cantidad, 0))`;

    db.exec(`
        INSERT INTO movimientos_inventario_nueva (
            id_movimiento_inventario,
            id_producto,
            id_usuario,
            id_unidad_medida,
            unidad_abreviatura,
            tipo_movimiento,
            cantidad,
            stock_anterior,
            stock_nuevo,
            costo_unitario,
            costo_total,
            motivo,
            referencia_tipo,
            referencia_id,
            creado_en
        )
        SELECT
            mi.id_movimiento_inventario,
            mi.id_producto,
            mi.id_usuario,
            ${exprIdUnidad},
            ${exprUnidadAbreviatura},
            mi.tipo_movimiento,
            CAST(mi.cantidad AS REAL),
            CAST(mi.stock_anterior AS REAL),
            CAST(mi.stock_nuevo AS REAL),
            COALESCE(${exprCostoUnitario}, 0),
            COALESCE(${exprCostoTotal}, 0),
            mi.motivo,
            mi.referencia_tipo,
            mi.referencia_id,
            mi.creado_en
        FROM movimientos_inventario mi
        LEFT JOIN productos p
            ON p.id_producto = mi.id_producto
        LEFT JOIN unidades_medida um
            ON um.id_unidad_medida = p.id_unidad_medida;
    `);

    db.exec(`
        DROP TABLE movimientos_inventario;
        ALTER TABLE movimientos_inventario_nueva RENAME TO movimientos_inventario;
    `);

    console.log('Tabla movimientos_inventario reconstruida correctamente.');
}

function agregarColumnasProductosSeguras() {
    if (!tablaExiste('productos')) {
        throw new Error('No existe la tabla productos.');
    }

    /*
      Ojo:
      No se reconstruye productos aquí para no arriesgar columnas ya creadas
      por el módulo de productos. SQLite permite guardar valores decimales
      aunque la afinidad declarada sea INTEGER. La capa de negocio validará
      permite_cantidad_decimal y trabajará con Number.
    */

    agregarColumnaSiNoExiste(
        'productos',
        'stock_reservado',
        'stock_reservado REAL NOT NULL DEFAULT 0 CHECK (stock_reservado >= 0)'
    );

    agregarColumnaSiNoExiste(
        'productos',
        'venta_fraccionada_habilitada',
        'venta_fraccionada_habilitada INTEGER NOT NULL DEFAULT 0 CHECK (venta_fraccionada_habilitada IN (0, 1))'
    );

    db.exec(`
        UPDATE productos
        SET venta_fraccionada_habilitada = CASE
            WHEN permite_cantidad_decimal = 1 THEN 1
            ELSE venta_fraccionada_habilitada
        END;
    `);

    console.log('Columnas seguras de productos verificadas.');
}

function crearTablasDevolucionesVenta() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS devoluciones_venta (
            id_devolucion_venta INTEGER PRIMARY KEY AUTOINCREMENT,

            id_venta INTEGER NOT NULL,
            id_turno_caja INTEGER NOT NULL,
            id_usuario INTEGER NOT NULL,

            numero_devolucion TEXT NOT NULL UNIQUE,

            fecha_devolucion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            tipo_devolucion TEXT NOT NULL DEFAULT 'parcial'
                CHECK (tipo_devolucion IN ('parcial', 'total')),

            total_devuelto INTEGER NOT NULL DEFAULT 0
                CHECK (total_devuelto >= 0),

            estado TEXT NOT NULL DEFAULT 'registrada'
                CHECK (estado IN ('registrada', 'anulada')),

            motivo TEXT,
            observaciones TEXT,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT,

            anulado_en TEXT,
            anulado_por INTEGER,
            motivo_anulacion TEXT,

            FOREIGN KEY (id_venta)
                REFERENCES ventas(id_venta)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_turno_caja)
                REFERENCES turnos_caja(id_turno_caja)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_usuario)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (anulado_por)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS detalle_devoluciones_venta (
            id_detalle_devolucion_venta INTEGER PRIMARY KEY AUTOINCREMENT,

            id_devolucion_venta INTEGER NOT NULL,
            id_detalle_venta INTEGER,
            id_producto INTEGER,

            nombre_producto TEXT NOT NULL,

            cantidad REAL NOT NULL
                CHECK (cantidad > 0),

            precio_unitario INTEGER NOT NULL DEFAULT 0
                CHECK (precio_unitario >= 0),

            monto_devuelto INTEGER NOT NULL DEFAULT 0
                CHECK (monto_devuelto >= 0),

            reintegra_inventario INTEGER NOT NULL DEFAULT 1
                CHECK (reintegra_inventario IN (0, 1)),

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (id_devolucion_venta)
                REFERENCES devoluciones_venta(id_devolucion_venta)
                ON UPDATE CASCADE
                ON DELETE CASCADE,

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

    console.log('Tablas de devoluciones de venta verificadas.');
}

function crearIndices() {
    crearIndiceSiNoExiste(
        'idx_detalle_ventas_producto',
        `
        CREATE INDEX idx_detalle_ventas_producto
        ON detalle_ventas(id_producto);
        `
    );

    crearIndiceSiNoExiste(
        'idx_detalle_ventas_unidad',
        `
        CREATE INDEX idx_detalle_ventas_unidad
        ON detalle_ventas(id_unidad_medida);
        `
    );

    crearIndiceSiNoExiste(
        'idx_movimientos_inventario_referencia',
        `
        CREATE INDEX idx_movimientos_inventario_referencia
        ON movimientos_inventario(referencia_tipo, referencia_id);
        `
    );

    crearIndiceSiNoExiste(
        'idx_movimientos_inventario_unidad',
        `
        CREATE INDEX idx_movimientos_inventario_unidad
        ON movimientos_inventario(id_unidad_medida);
        `
    );

    crearIndiceSiNoExiste(
        'idx_ventas_turno_estado',
        `
        CREATE INDEX idx_ventas_turno_estado
        ON ventas(id_turno_caja, estado);
        `
    );

    crearIndiceSiNoExiste(
        'idx_pagos_venta_estado',
        `
        CREATE INDEX idx_pagos_venta_estado
        ON pagos_venta(estado);
        `
    );

    crearIndiceSiNoExiste(
        'idx_devoluciones_venta_venta',
        `
        CREATE INDEX idx_devoluciones_venta_venta
        ON devoluciones_venta(id_venta);
        `
    );

    crearIndiceSiNoExiste(
        'idx_devoluciones_venta_turno',
        `
        CREATE INDEX idx_devoluciones_venta_turno
        ON devoluciones_venta(id_turno_caja);
        `
    );

    crearIndiceSiNoExiste(
        'idx_detalle_devoluciones_producto',
        `
        CREATE INDEX idx_detalle_devoluciones_producto
        ON detalle_devoluciones_venta(id_producto);
        `
    );

    console.log('Índices de ventas/inventario/devoluciones verificados.');
}

function registrarAuditoria() {
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
            'migracion_ventas_inventario_pos_real',
            'sistema',
            NULL,
            NULL,
            @datos_nuevos,
            'local',
            'script_migration_007'
        )
    `).run({
        datos_nuevos: JSON.stringify({
            mensaje: 'Migración 007 de ventas, inventario decimal, pagos y devoluciones ejecutada correctamente.',
            version: '007',
            tablas_reconstruidas: [
                'detalle_ventas',
                'movimientos_inventario',
            ],
            tablas_creadas: [
                'devoluciones_venta',
                'detalle_devoluciones_venta',
            ],
        }),
    });

    console.log('Auditoría de migración 007 registrada.');
}

function validarIntegridad() {
    const errores = db.prepare('PRAGMA foreign_key_check').all();

    if (errores.length > 0) {
        console.table(errores);
        throw new Error('La validación de llaves foráneas falló después de la migración 007.');
    }

    console.log('Integridad referencial validada correctamente.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 007...');
    console.log('Ventas, inventario decimal y POS real');
    console.log('====================================');

    if (!tablaExiste('ventas')) {
        throw new Error('No existe la tabla ventas. Ejecuta primero npm run db:init.');
    }

    if (!tablaExiste('detalle_ventas')) {
        throw new Error('No existe la tabla detalle_ventas. Ejecuta primero npm run db:init.');
    }

    if (!tablaExiste('movimientos_inventario')) {
        throw new Error('No existe la tabla movimientos_inventario. Ejecuta primero npm run db:init.');
    }

    if (!tablaExiste('unidades_medida')) {
        throw new Error('No existe unidades_medida. Ejecuta primero la migración 001.');
    }

    db.exec('PRAGMA foreign_keys = OFF;');

    const transaccion = db.transaction(() => {
        agregarColumnasVentas();
        agregarColumnasPagosVenta();
        agregarColumnasProductosSeguras();
        reconstruirDetalleVentas();
        reconstruirMovimientosInventario();
        crearTablasDevolucionesVenta();
        crearIndices();
        registrarAuditoria();
    });

    try {
        transaccion();
    } finally {
        db.exec('PRAGMA foreign_keys = ON;');
    }

    validarIntegridad();

    console.log('====================================');
    console.log('Migración 007 ejecutada correctamente.');
    console.log('====================================');
}

try {
    ejecutarMigracion();
} catch (error) {
    try {
        db.exec('PRAGMA foreign_keys = ON;');
    } catch (_) {
        // Nada. Si esto falla, el error real ya está arriba.
    }

    console.error('Error ejecutando migración 007:', error);
    process.exit(1);
}