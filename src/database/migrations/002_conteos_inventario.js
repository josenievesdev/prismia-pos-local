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

function crearTablaConteosInventario() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS conteos_inventario (
      id_conteo_inventario INTEGER PRIMARY KEY AUTOINCREMENT,

      numero_conteo TEXT NOT NULL UNIQUE,

      id_usuario_creacion INTEGER,
      id_usuario_aplicacion INTEGER,

      tipo_conteo TEXT NOT NULL DEFAULT 'total'
        CHECK (tipo_conteo IN (
          'total',
          'categoria',
          'producto',
          'parcial'
        )),

      origen TEXT NOT NULL DEFAULT 'manual'
        CHECK (origen IN (
          'manual',
          'plantilla',
          'escaner'
        )),

      id_categoria_producto INTEGER,

      estado TEXT NOT NULL DEFAULT 'borrador'
        CHECK (estado IN (
          'borrador',
          'en_revision',
          'aplicado',
          'anulado'
        )),

      fecha_inicio TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fecha_cierre TEXT,
      fecha_aplicacion TEXT,

      total_productos INTEGER NOT NULL DEFAULT 0,
      total_diferencias INTEGER NOT NULL DEFAULT 0,

      valor_diferencia_total INTEGER NOT NULL DEFAULT 0,

      observaciones TEXT,
      motivo_anulacion TEXT,

      creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TEXT,

      FOREIGN KEY (id_usuario_creacion)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

      FOREIGN KEY (id_usuario_aplicacion)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

      FOREIGN KEY (id_categoria_producto)
        REFERENCES categorias_productos(id_categoria_producto)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    );
  `);

    console.log('Tabla conteos_inventario verificada.');
}

function crearTablaDetalleConteosInventario() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS detalle_conteos_inventario (
      id_detalle_conteo_inventario INTEGER PRIMARY KEY AUTOINCREMENT,

      id_conteo_inventario INTEGER NOT NULL,
      id_producto INTEGER NOT NULL,
      id_unidad_medida INTEGER,

      codigo_interno TEXT NOT NULL,
      codigo_barras TEXT,
      nombre_producto TEXT NOT NULL,
      unidad_abreviatura TEXT,

      stock_sistema REAL NOT NULL DEFAULT 0,
      stock_contado REAL,

      diferencia REAL NOT NULL DEFAULT 0,

      costo_promedio INTEGER NOT NULL DEFAULT 0,
      valor_diferencia INTEGER NOT NULL DEFAULT 0,

      estado TEXT NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN (
          'pendiente',
          'contado',
          'ajustado',
          'ignorado'
        )),

      observaciones TEXT,

      creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TEXT,

      UNIQUE (id_conteo_inventario, id_producto),

      FOREIGN KEY (id_conteo_inventario)
        REFERENCES conteos_inventario(id_conteo_inventario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

      FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (id_unidad_medida)
        REFERENCES unidades_medida(id_unidad_medida)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    );
  `);

    console.log('Tabla detalle_conteos_inventario verificada.');
}

function crearIndices() {
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conteos_inventario_numero
    ON conteos_inventario(numero_conteo);

    CREATE INDEX IF NOT EXISTS idx_conteos_inventario_estado
    ON conteos_inventario(estado);

    CREATE INDEX IF NOT EXISTS idx_conteos_inventario_fecha
    ON conteos_inventario(fecha_inicio);

    CREATE INDEX IF NOT EXISTS idx_detalle_conteos_conteo
    ON detalle_conteos_inventario(id_conteo_inventario);

    CREATE INDEX IF NOT EXISTS idx_detalle_conteos_producto
    ON detalle_conteos_inventario(id_producto);

    CREATE INDEX IF NOT EXISTS idx_detalle_conteos_estado
    ON detalle_conteos_inventario(estado);
  `);

    console.log('Índices de conteos de inventario verificados.');
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
      'migracion_conteos_inventario',
      'sistema',
      NULL,
      NULL,
      @datos_nuevos,
      'local',
      'script_migration_002'
    )
  `).run({
        datos_nuevos: JSON.stringify({
            mensaje: 'Migración de conteos físicos de inventario ejecutada correctamente.',
            version: '002',
        }),
    });

    console.log('Auditoría de migración registrada.');
}

function ejecutarMigracion() {
    console.log('====================================');
    console.log('Ejecutando migración 002...');
    console.log('Conteos físicos de inventario');
    console.log('====================================');

    if (!tablaExiste('productos')) {
        throw new Error('No existe la tabla productos. Ejecuta primero npm run db:init.');
    }

    if (!tablaExiste('unidades_medida')) {
        throw new Error('No existe la tabla unidades_medida. Ejecuta primero la migración 001.');
    }

    crearTablaConteosInventario();
    crearTablaDetalleConteosInventario();
    crearIndices();
    registrarMigracion();

    console.log('====================================');
    console.log('Migración 002 ejecutada correctamente.');
    console.log('====================================');
}

try {
    ejecutarMigracion();
} catch (error) {
    console.error('Error ejecutando migración 002:', error);
    process.exit(1);
}