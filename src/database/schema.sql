PRAGMA foreign_keys = ON;

-- =========================================================
-- Prismia POS Local
-- Base de datos SQLite v0.1.0
-- Tablas y columnas en español.
-- Montos en pesos colombianos como INTEGER.
-- Ejemplo: $8.500 se guarda como 8500.
-- =========================================================

-- ==============================
-- Sistema / configuración
-- ==============================

CREATE TABLE IF NOT EXISTS configuracion_negocio (
    id_configuracion INTEGER PRIMARY KEY AUTOINCREMENT,

    nombre_negocio TEXT NOT NULL,
    nombre_comercial TEXT,
    tipo_documento TEXT DEFAULT 'NIT',
    documento TEXT,
    direccion TEXT,
    telefono TEXT,
    correo TEXT,

    moneda TEXT NOT NULL DEFAULT 'COP',

    -- Guardado en centésimas de porcentaje.
    -- Ejemplo: 1900 = 19.00%
    impuesto_por_defecto INTEGER NOT NULL DEFAULT 0,

    mensaje_recibo TEXT DEFAULT 'Gracias por su compra.',
    logo_url TEXT,

    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo')),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT
);

CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria INTEGER PRIMARY KEY AUTOINCREMENT,

    id_usuario INTEGER,
    accion TEXT NOT NULL,
    tabla_afectada TEXT,
    id_registro_afectado INTEGER,

    datos_anteriores TEXT,
    datos_nuevos TEXT,

    ip TEXT,
    user_agent TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ==============================
-- Seguridad
-- ==============================

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,

    nombre TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    contrasena_hash TEXT NOT NULL,
    telefono TEXT,

    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo', 'bloqueado')),

    ultimo_acceso_en TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT,
    eliminado_en TEXT
);

CREATE TABLE IF NOT EXISTS roles (
    id_rol INTEGER PRIMARY KEY AUTOINCREMENT,

    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,

    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo')),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT
);

CREATE TABLE IF NOT EXISTS usuario_roles (
    id_usuario_rol INTEGER PRIMARY KEY AUTOINCREMENT,

    id_usuario INTEGER NOT NULL,
    id_rol INTEGER NOT NULL,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (id_usuario, id_rol),

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (id_rol)
        REFERENCES roles(id_rol)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ==============================
-- Catálogos comerciales
-- ==============================

CREATE TABLE IF NOT EXISTS categorias_productos (
    id_categoria_producto INTEGER PRIMARY KEY AUTOINCREMENT,

    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,

    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo')),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT,
    eliminado_en TEXT
);

CREATE TABLE IF NOT EXISTS productos (
    id_producto INTEGER PRIMARY KEY AUTOINCREMENT,

    id_categoria_producto INTEGER,

    codigo_interno TEXT NOT NULL UNIQUE,
    codigo_barras TEXT UNIQUE,

    nombre TEXT NOT NULL,
    descripcion TEXT,

    precio_costo INTEGER NOT NULL DEFAULT 0
        CHECK (precio_costo >= 0),

    precio_venta INTEGER NOT NULL DEFAULT 0
        CHECK (precio_venta >= 0),

    stock_actual REAL NOT NULL DEFAULT 0
        CHECK (stock_actual >= 0),

    stock_minimo REAL NOT NULL DEFAULT 0
        CHECK (stock_minimo >= 0),

    controla_inventario INTEGER NOT NULL DEFAULT 1
        CHECK (controla_inventario IN (0, 1)),

    permite_venta_sin_stock INTEGER NOT NULL DEFAULT 0
        CHECK (permite_venta_sin_stock IN (0, 1)),

    imagen_url TEXT,

    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo')),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT,
    eliminado_en TEXT,

    FOREIGN KEY (id_categoria_producto)
        REFERENCES categorias_productos(id_categoria_producto)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,

    tipo_documento TEXT DEFAULT 'CC',
    documento TEXT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    correo TEXT,
    direccion TEXT,
    observaciones TEXT,

    es_consumidor_final INTEGER NOT NULL DEFAULT 0
        CHECK (es_consumidor_final IN (0, 1)),

    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo')),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT,
    eliminado_en TEXT,

    UNIQUE (tipo_documento, documento)
);

-- ==============================
-- Caja
-- ==============================

CREATE TABLE IF NOT EXISTS turnos_caja (
    id_turno_caja INTEGER PRIMARY KEY AUTOINCREMENT,

    id_usuario_apertura INTEGER NOT NULL,
    id_usuario_cierre INTEGER,

    fecha_apertura TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TEXT,

    monto_inicial INTEGER NOT NULL DEFAULT 0
        CHECK (monto_inicial >= 0),

    total_ventas INTEGER NOT NULL DEFAULT 0,
    total_efectivo INTEGER NOT NULL DEFAULT 0,
    total_transferencia INTEGER NOT NULL DEFAULT 0,
    total_tarjeta INTEGER NOT NULL DEFAULT 0,
    total_otros INTEGER NOT NULL DEFAULT 0,

    total_ingresos_manuales INTEGER NOT NULL DEFAULT 0,
    total_egresos_manuales INTEGER NOT NULL DEFAULT 0,

    monto_esperado INTEGER NOT NULL DEFAULT 0,
    monto_contado INTEGER,
    diferencia INTEGER,

    estado TEXT NOT NULL DEFAULT 'abierto'
        CHECK (estado IN ('abierto', 'cerrado')),

    observaciones_apertura TEXT,
    observaciones_cierre TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT,

    FOREIGN KEY (id_usuario_apertura)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_usuario_cierre)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS movimientos_caja (
    id_movimiento_caja INTEGER PRIMARY KEY AUTOINCREMENT,

    id_turno_caja INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,

    tipo_movimiento TEXT NOT NULL
        CHECK (tipo_movimiento IN (
            'ingreso_manual',
            'egreso_manual',
            'venta',
            'devolucion',
            'anulacion',
            'ajuste'
        )),

    metodo_pago TEXT NOT NULL DEFAULT 'efectivo'
        CHECK (metodo_pago IN (
            'efectivo',
            'transferencia',
            'tarjeta',
            'otro'
        )),

    monto INTEGER NOT NULL,

    descripcion TEXT,

    referencia_tipo TEXT,
    referencia_id INTEGER,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_turno_caja)
        REFERENCES turnos_caja(id_turno_caja)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ==============================
-- Ventas
-- ==============================

CREATE TABLE IF NOT EXISTS ventas (
    id_venta INTEGER PRIMARY KEY AUTOINCREMENT,

    id_cliente INTEGER,
    id_usuario INTEGER NOT NULL,
    id_turno_caja INTEGER NOT NULL,

    numero_venta TEXT NOT NULL UNIQUE,

    fecha_venta TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    subtotal INTEGER NOT NULL DEFAULT 0
        CHECK (subtotal >= 0),

    descuento_total INTEGER NOT NULL DEFAULT 0
        CHECK (descuento_total >= 0),

    impuesto_total INTEGER NOT NULL DEFAULT 0
        CHECK (impuesto_total >= 0),

    total INTEGER NOT NULL DEFAULT 0
        CHECK (total >= 0),

    estado TEXT NOT NULL DEFAULT 'pagada'
        CHECK (estado IN ('pagada', 'pendiente', 'anulada')),

    observaciones TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT,

    anulado_en TEXT,
    anulado_por INTEGER,
    motivo_anulacion TEXT,

    FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_turno_caja)
        REFERENCES turnos_caja(id_turno_caja)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (anulado_por)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS detalle_ventas (
    id_detalle_venta INTEGER PRIMARY KEY AUTOINCREMENT,

    id_venta INTEGER NOT NULL,
    id_producto INTEGER,

    nombre_producto TEXT NOT NULL,

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    precio_unitario INTEGER NOT NULL
        CHECK (precio_unitario >= 0),

    precio_costo_unitario INTEGER NOT NULL DEFAULT 0
        CHECK (precio_costo_unitario >= 0),

    descuento_unitario INTEGER NOT NULL DEFAULT 0
        CHECK (descuento_unitario >= 0),

    subtotal INTEGER NOT NULL
        CHECK (subtotal >= 0),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_venta)
        REFERENCES ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pagos_venta (
    id_pago_venta INTEGER PRIMARY KEY AUTOINCREMENT,

    id_venta INTEGER NOT NULL,

    metodo_pago TEXT NOT NULL
        CHECK (metodo_pago IN (
            'efectivo',
            'transferencia',
            'tarjeta',
            'otro'
        )),

    monto INTEGER NOT NULL
        CHECK (monto > 0),

    referencia TEXT,
    entidad TEXT,
    observaciones TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_venta)
        REFERENCES ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comprobantes (
    id_comprobante INTEGER PRIMARY KEY AUTOINCREMENT,

    id_venta INTEGER NOT NULL UNIQUE,

    tipo_comprobante TEXT NOT NULL DEFAULT 'recibo_interno'
        CHECK (tipo_comprobante IN (
            'recibo_interno',
            'factura_futura',
            'nota_credito_futura'
        )),

    prefijo TEXT,
    numero TEXT,
    consecutivo INTEGER,

    estado TEXT NOT NULL DEFAULT 'emitido'
        CHECK (estado IN ('emitido', 'pendiente', 'anulado')),

    fecha_emision TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    ruta_pdf TEXT,
    datos_fiscales_json TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT,

    FOREIGN KEY (id_venta)
        REFERENCES ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ==============================
-- Inventario
-- ==============================

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento_inventario INTEGER PRIMARY KEY AUTOINCREMENT,

    id_producto INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,

    tipo_movimiento TEXT NOT NULL
        CHECK (tipo_movimiento IN (
            'entrada_inicial',
            'ajuste_positivo',
            'ajuste_negativo',
            'venta',
            'devolucion',
            'compra',
            'anulacion_venta',
            'anulacion_devolucion'
        )),

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    stock_anterior INTEGER NOT NULL
        CHECK (stock_anterior >= 0),

    stock_nuevo INTEGER NOT NULL
        CHECK (stock_nuevo >= 0),

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
        ON DELETE RESTRICT
);

-- ==============================
-- Gastos
-- ==============================

CREATE TABLE IF NOT EXISTS categorias_gasto (
    id_categoria_gasto INTEGER PRIMARY KEY AUTOINCREMENT,

    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,

    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo')),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT,
    eliminado_en TEXT
);

CREATE TABLE IF NOT EXISTS gastos (
    id_gasto INTEGER PRIMARY KEY AUTOINCREMENT,

    id_categoria_gasto INTEGER,
    id_usuario INTEGER NOT NULL,

    fecha_gasto TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    descripcion TEXT NOT NULL,

    monto INTEGER NOT NULL
        CHECK (monto > 0),

    metodo_pago TEXT NOT NULL DEFAULT 'efectivo'
        CHECK (metodo_pago IN (
            'efectivo',
            'transferencia',
            'tarjeta',
            'otro'
        )),

    comprobante_url TEXT,

    afecta_caja INTEGER NOT NULL DEFAULT 0
        CHECK (afecta_caja IN (0, 1)),

    id_turno_caja INTEGER,

    estado TEXT NOT NULL DEFAULT 'registrado'
        CHECK (estado IN ('registrado', 'anulado')),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT,

    anulado_en TEXT,
    anulado_por INTEGER,
    motivo_anulacion TEXT,

    FOREIGN KEY (id_categoria_gasto)
        REFERENCES categorias_gasto(id_categoria_gasto)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_turno_caja)
        REFERENCES turnos_caja(id_turno_caja)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (anulado_por)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ==============================
-- Índices
-- ==============================

CREATE INDEX IF NOT EXISTS idx_usuarios_correo
ON usuarios(correo);

CREATE INDEX IF NOT EXISTS idx_productos_nombre
ON productos(nombre);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_interno
ON productos(codigo_interno);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras
ON productos(codigo_barras);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha
ON ventas(fecha_venta);

CREATE INDEX IF NOT EXISTS idx_ventas_estado
ON ventas(estado);

CREATE INDEX IF NOT EXISTS idx_ventas_turno
ON ventas(id_turno_caja);

CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta
ON detalle_ventas(id_venta);

CREATE INDEX IF NOT EXISTS idx_pagos_venta_venta
ON pagos_venta(id_venta);

CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_producto
ON movimientos_inventario(id_producto);

CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_fecha
ON movimientos_inventario(creado_en);

CREATE INDEX IF NOT EXISTS idx_movimientos_caja_turno
ON movimientos_caja(id_turno_caja);

CREATE INDEX IF NOT EXISTS idx_gastos_fecha
ON gastos(fecha_gasto);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario
ON auditoria(id_usuario);

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla
ON auditoria(tabla_afectada);