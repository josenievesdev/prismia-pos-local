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
    const columnas = db.prepare(`PRAGMA table_info(${nombreTabla})`).all();

    return columnas.some((columna) => columna.name === nombreColumna);
}

function crearTablaUnidadesMedida() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS unidades_medida (
      id_unidad_medida INTEGER PRIMARY KEY AUTOINCREMENT,

      nombre TEXT NOT NULL UNIQUE,
      abreviatura TEXT NOT NULL UNIQUE,

      permite_decimales INTEGER NOT NULL DEFAULT 0
        CHECK (permite_decimales IN (0, 1)),

      estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo')),

      creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TEXT
    );
  `);

    console.log('Tabla unidades_medida verificada.');
}

function insertarUnidadesIniciales() {
    const unidades = [
        {
            nombre: 'Unidad',
            abreviatura: 'und',
            permite_decimales: 0,
        },
        {
            nombre: 'Metro',
            abreviatura: 'm',
            permite_decimales: 1,
        },
        {
            nombre: 'Centímetro',
            abreviatura: 'cm',
            permite_decimales: 1,
        },
        {
            nombre: 'Kilogramo',
            abreviatura: 'kg',
            permite_decimales: 1,
        },
        {
            nombre: 'Gramo',
            abreviatura: 'g',
            permite_decimales: 1,
        },
        {
            nombre: 'Litro',
            abreviatura: 'l',
            permite_decimales: 1,
        },
        {
            nombre: 'Mililitro',
            abreviatura: 'ml',
            permite_decimales: 1,
        },
        {
            nombre: 'Rollo',
            abreviatura: 'rollo',
            permite_decimales: 0,
        },
        {
            nombre: 'Caja',
            abreviatura: 'caja',
            permite_decimales: 0,
        },
        {
            nombre: 'Servicio',
            abreviatura: 'serv',
            permite_decimales: 1,
        },
    ];

    const insertar = db.prepare(`
    INSERT OR IGNORE INTO unidades_medida (
      nombre,
      abreviatura,
      permite_decimales,
      estado
    ) VALUES (
      @nombre,
      @abreviatura,
      @permite_decimales,
      'activo'
    )
  `);

    const transaccion = db.transaction(() => {
        for (const unidad of unidades) {
            insertar.run(unidad);
        }
    });

    transaccion();

    console.log('Unidades de medida iniciales verificadas.');
}

function agregarColumnasConfiguracionNegocio() {
    if (!columnaExiste('configuracion_negocio', 'maneja_iva')) {
        db.exec(`
      ALTER TABLE configuracion_negocio
      ADD COLUMN maneja_iva INTEGER NOT NULL DEFAULT 0
        CHECK (maneja_iva IN (0, 1));
    `);

        console.log('Columna configuracion_negocio.maneja_iva agregada.');
    }

    if (!columnaExiste('configuracion_negocio', 'iva_incluido_en_precio')) {
        db.exec(`
      ALTER TABLE configuracion_negocio
      ADD COLUMN iva_incluido_en_precio INTEGER NOT NULL DEFAULT 0
        CHECK (iva_incluido_en_precio IN (0, 1));
    `);

        console.log('Columna configuracion_negocio.iva_incluido_en_precio agregada.');
    }

    if (!columnaExiste('configuracion_negocio', 'porcentaje_iva_defecto')) {
        db.exec(`
      ALTER TABLE configuracion_negocio
      ADD COLUMN porcentaje_iva_defecto INTEGER NOT NULL DEFAULT 0;
    `);

        console.log('Columna configuracion_negocio.porcentaje_iva_defecto agregada.');
    }
}

function agregarColumnasProductos() {
    if (!columnaExiste('productos', 'id_unidad_medida')) {
        db.exec(`
      ALTER TABLE productos
      ADD COLUMN id_unidad_medida INTEGER;
    `);

        console.log('Columna productos.id_unidad_medida agregada.');
    }

    if (!columnaExiste('productos', 'permite_cantidad_decimal')) {
        db.exec(`
      ALTER TABLE productos
      ADD COLUMN permite_cantidad_decimal INTEGER NOT NULL DEFAULT 0
        CHECK (permite_cantidad_decimal IN (0, 1));
    `);

        console.log('Columna productos.permite_cantidad_decimal agregada.');
    }

    if (!columnaExiste('productos', 'costo_promedio')) {
        db.exec(`
      ALTER TABLE productos
      ADD COLUMN costo_promedio INTEGER NOT NULL DEFAULT 0;
    `);

        console.log('Columna productos.costo_promedio agregada.');
    }

    if (!columnaExiste('productos', 'ultimo_costo')) {
        db.exec(`
      ALTER TABLE productos
      ADD COLUMN ultimo_costo INTEGER NOT NULL DEFAULT 0;
    `);

        console.log('Columna productos.ultimo_costo agregada.');
    }

    if (!columnaExiste('productos', 'maneja_iva')) {
        db.exec(`
      ALTER TABLE productos
      ADD COLUMN maneja_iva INTEGER NOT NULL DEFAULT 0
        CHECK (maneja_iva IN (0, 1));
    `);

        console.log('Columna productos.maneja_iva agregada.');
    }

    if (!columnaExiste('productos', 'porcentaje_iva')) {
        db.exec(`
      ALTER TABLE productos
      ADD COLUMN porcentaje_iva INTEGER NOT NULL DEFAULT 0;
    `);

        console.log('Columna productos.porcentaje_iva agregada.');
    }

    if (!columnaExiste('productos', 'precio_incluye_iva')) {
        db.exec(`
      ALTER TABLE productos
      ADD COLUMN precio_incluye_iva INTEGER NOT NULL DEFAULT 0
        CHECK (precio_incluye_iva IN (0, 1));
    `);

        console.log('Columna productos.precio_incluye_iva agregada.');
    }
}

function agregarColumnasMovimientosInventario() {
    if (!columnaExiste('movimientos_inventario', 'id_unidad_medida')) {
        db.exec(`
      ALTER TABLE movimientos_inventario
      ADD COLUMN id_unidad_medida INTEGER;
    `);

        console.log('Columna movimientos_inventario.id_unidad_medida agregada.');
    }
}

function migrarProductosExistentes() {
    const unidad = db
        .prepare(`
      SELECT id_unidad_medida, permite_decimales
      FROM unidades_medida
      WHERE abreviatura = 'und'
      LIMIT 1
    `)
        .get();

    if (!unidad) {
        throw new Error('No existe la unidad base "und".');
    }

    db.prepare(`
    UPDATE productos
    SET
      id_unidad_medida = COALESCE(id_unidad_medida, @id_unidad_medida),
      permite_cantidad_decimal = COALESCE(permite_cantidad_decimal, @permite_decimales),
      costo_promedio = CASE
        WHEN costo_promedio = 0 THEN precio_costo
        ELSE costo_promedio
      END,
      ultimo_costo = CASE
        WHEN ultimo_costo = 0 THEN precio_costo
        ELSE ultimo_costo
      END
    WHERE eliminado_en IS NULL
  `).run({
        id_unidad_medida: unidad.id_unidad_medida,
        permite_decimales: unidad.permite_decimales,
    });

    db.prepare(`
    UPDATE movimientos_inventario
    SET id_unidad_medida = COALESCE(id_unidad_medida, @id_unidad_medida)
  `).run({
        id_unidad_medida: unidad.id_unidad_medida,
    });

    console.log('Productos y movimientos existentes migrados a unidad base.');
}

function crearIndices() {
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_productos_unidad_medida
    ON productos(id_unidad_medida);

    CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_unidad_medida
    ON movimientos_inventario(id_unidad_medida);
  `);

    console.log('Índices de unidades verificados.');
}

function registrarMigracion() {
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
      'migracion_unidades_costos_iva',
      'sistema',
      NULL,
      NULL,
      @datos_nuevos,
      'local',
      'script_migration_001'
    )
  `).run({
        datos_nuevos: JSON.stringify({
            mensaje: 'Migración de unidades, costos e IVA ejecutada correctamente.',
            version: '001',
        }),
    });

    console.log('Auditoría de migración registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 001...');
    console.log('Unidades, costos promedio e IVA');
    console.log('====================================');

    if (!tablaExiste('productos')) {
        throw new Error('No existe la tabla productos. Ejecuta primero npm run db:init.');
    }

    crearTablaUnidadesMedida();
    insertarUnidadesIniciales();

    agregarColumnasConfiguracionNegocio();
    agregarColumnasProductos();
    agregarColumnasMovimientosInventario();

    migrarProductosExistentes();
    crearIndices();
    registrarMigracion();

    console.log('====================================');
    console.log('Migración 001 ejecutada correctamente.');
    console.log('====================================');
}

try {
    ejecutarMigracion();
} catch (error) {
    console.error('Error ejecutando migración 001:', error);
    process.exit(1);
}