-- =========================================================
-- Prismia POS Local
-- Schema consolidado draft
-- Generado automáticamente desde la BD actual de desarrollo
-- Revisar antes de reemplazar src/database/schema.sql
-- =========================================================

PRAGMA foreign_keys = ON;

-- =========================================================
-- Tablas
-- =========================================================

-- Tabla: roles
CREATE TABLE IF NOT EXISTS roles (
    id_rol INTEGER PRIMARY KEY AUTOINCREMENT,

    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,

    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo')),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT
);

-- Tabla: usuarios
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

-- Tabla: usuario_roles
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

-- Tabla: configuracion_negocio
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

-- Guardado como porcentaje humano.
-- Ejemplo: 19 = 19%
impuesto_por_defecto INTEGER NOT NULL DEFAULT 0,

    mensaje_recibo TEXT DEFAULT 'Gracias por su compra.',
    logo_url TEXT,

    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo')),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT
, maneja_iva INTEGER NOT NULL DEFAULT 0
        CHECK (maneja_iva IN (0, 1)), iva_incluido_en_precio INTEGER NOT NULL DEFAULT 0
        CHECK (iva_incluido_en_precio IN (0, 1)), porcentaje_iva_defecto INTEGER NOT NULL DEFAULT 0);

-- Tabla: catalogo_departamentos
CREATE TABLE IF NOT EXISTS catalogo_departamentos (
            id_departamento INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo_departamento TEXT NOT NULL UNIQUE,
            nombre_departamento TEXT NOT NULL,
            activo INTEGER NOT NULL DEFAULT 1,
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT
        );

-- Tabla: catalogo_municipios
CREATE TABLE IF NOT EXISTS catalogo_municipios (
            id_municipio INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo_municipio TEXT NOT NULL UNIQUE,
            nombre_municipio TEXT NOT NULL,
            codigo_departamento TEXT NOT NULL,
            nombre_departamento TEXT NOT NULL,
            activo INTEGER NOT NULL DEFAULT 1,
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT,
            FOREIGN KEY (codigo_departamento)
                REFERENCES catalogo_departamentos(codigo_departamento)
        );

-- Tabla: categorias_productos
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

-- Tabla: unidades_medida
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

-- Tabla: productos
CREATE TABLE IF NOT EXISTS "productos"(
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
    eliminado_en TEXT, id_unidad_medida INTEGER, permite_cantidad_decimal INTEGER NOT NULL DEFAULT 0
        CHECK (permite_cantidad_decimal IN (0, 1)), costo_promedio INTEGER NOT NULL DEFAULT 0, ultimo_costo INTEGER NOT NULL DEFAULT 0, maneja_iva INTEGER NOT NULL DEFAULT 0
        CHECK (maneja_iva IN (0, 1)), porcentaje_iva INTEGER NOT NULL DEFAULT 0, precio_incluye_iva INTEGER NOT NULL DEFAULT 0
        CHECK (precio_incluye_iva IN (0, 1)), stock_reservado REAL NOT NULL DEFAULT 0 CHECK (stock_reservado >= 0), venta_fraccionada_habilitada INTEGER NOT NULL DEFAULT 0 CHECK (venta_fraccionada_habilitada IN (0, 1)), mostrar_en_pos_tactil INTEGER NOT NULL DEFAULT 0, orden_pos_tactil INTEGER,

    FOREIGN KEY (id_categoria_producto)
        REFERENCES categorias_productos(id_categoria_producto)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- Tabla: clientes
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
    eliminado_en TEXT, tipo_cliente TEXT NOT NULL DEFAULT 'persona_natural', digito_verificacion TEXT, razon_social TEXT, nombre_comercial TEXT, primer_nombre TEXT, segundo_nombre TEXT, primer_apellido TEXT, segundo_apellido TEXT, celular TEXT, correo_facturacion TEXT, pais TEXT NOT NULL DEFAULT 'Colombia', codigo_pais TEXT NOT NULL DEFAULT 'CO', departamento TEXT, codigo_departamento TEXT, municipio TEXT, codigo_municipio TEXT, barrio TEXT, codigo_postal TEXT, regimen_fiscal TEXT NOT NULL DEFAULT 'no_definido', responsabilidades_fiscales_json TEXT, obligado_facturar INTEGER NOT NULL DEFAULT 0, acepta_factura_electronica INTEGER NOT NULL DEFAULT 1, autoriza_tratamiento_datos INTEGER NOT NULL DEFAULT 0, contacto_nombre TEXT, contacto_cargo TEXT, observaciones_facturacion TEXT,

    UNIQUE (tipo_documento, documento)
);

-- Tabla: proveedores
CREATE TABLE IF NOT EXISTS proveedores (
            id_proveedor INTEGER PRIMARY KEY AUTOINCREMENT,

            nombre_comercial TEXT NOT NULL,
            razon_social TEXT,

            tipo_documento TEXT DEFAULT 'NIT',
            documento TEXT,
            digito_verificacion TEXT,

            telefono TEXT,
            celular TEXT,
            correo TEXT,

            direccion TEXT,
            ciudad TEXT,
            departamento TEXT,

            contacto_nombre TEXT,
            contacto_telefono TEXT,

            observaciones TEXT,

            estado TEXT NOT NULL DEFAULT 'activo'
                CHECK (estado IN ('activo', 'inactivo')),

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT,
            eliminado_en TEXT
        );

-- Tabla: medios_pago
CREATE TABLE IF NOT EXISTS medios_pago (
            id_medio_pago INTEGER PRIMARY KEY AUTOINCREMENT,

            codigo TEXT NOT NULL UNIQUE,
            nombre TEXT NOT NULL,

            tipo TEXT NOT NULL
                CHECK (tipo IN (
                    'efectivo',
                    'transferencia',
                    'tarjeta',
                    'otro'
                )),

            requiere_referencia INTEGER NOT NULL DEFAULT 0
                CHECK (requiere_referencia IN (0, 1)),

            afecta_efectivo_caja INTEGER NOT NULL DEFAULT 0
                CHECK (afecta_efectivo_caja IN (0, 1)),

            activo INTEGER NOT NULL DEFAULT 1
                CHECK (activo IN (0, 1)),

            orden INTEGER NOT NULL DEFAULT 0,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT
        );

-- Tabla: numeraciones_documentos
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
        );

-- Tabla: turnos_caja
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

-- Tabla: movimientos_caja
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

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, id_medio_pago INTEGER REFERENCES medios_pago(id_medio_pago) ON UPDATE CASCADE ON DELETE RESTRICT, referencia_pago TEXT, entidad_pago TEXT,

    FOREIGN KEY (id_turno_caja)
        REFERENCES turnos_caja(id_turno_caja)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla: ventas
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
    motivo_anulacion TEXT, total_pagado INTEGER NOT NULL DEFAULT 0 CHECK (total_pagado >= 0), saldo_pendiente INTEGER NOT NULL DEFAULT 0 CHECK (saldo_pendiente >= 0), cambio_entregado INTEGER NOT NULL DEFAULT 0 CHECK (cambio_entregado >= 0), total_costo INTEGER NOT NULL DEFAULT 0 CHECK (total_costo >= 0), utilidad_bruta INTEGER NOT NULL DEFAULT 0, origen TEXT NOT NULL DEFAULT 'pos'
            CHECK (origen IN ('pos', 'manual', 'importada')), tipo_venta TEXT NOT NULL DEFAULT 'contado'
            CHECK (tipo_venta IN ('contado', 'credito', 'mixta')), requiere_factura INTEGER NOT NULL DEFAULT 0 CHECK (requiere_factura IN (0, 1)),

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

-- Tabla: detalle_ventas
CREATE TABLE IF NOT EXISTS "detalle_ventas" (
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

-- Tabla: pagos_venta
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

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, id_medio_pago INTEGER REFERENCES medios_pago(id_medio_pago) ON UPDATE CASCADE ON DELETE RESTRICT, id_usuario INTEGER REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL, monto_recibido INTEGER NOT NULL DEFAULT 0 CHECK (monto_recibido >= 0), cambio_entregado INTEGER NOT NULL DEFAULT 0 CHECK (cambio_entregado >= 0), estado TEXT NOT NULL DEFAULT 'registrado'
            CHECK (estado IN ('registrado', 'anulado')), anulado_en TEXT, anulado_por INTEGER REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL, motivo_anulacion TEXT,

    FOREIGN KEY (id_venta)
        REFERENCES ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla: comprobantes
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

-- Tabla: anulaciones_venta
CREATE TABLE IF NOT EXISTS anulaciones_venta (
            id_anulacion_venta INTEGER PRIMARY KEY AUTOINCREMENT,

            id_venta INTEGER NOT NULL UNIQUE,
            numero_venta TEXT NOT NULL,

            id_cliente INTEGER,
            id_turno_caja INTEGER NOT NULL,

            total_venta INTEGER NOT NULL DEFAULT 0,
            total_pagado INTEGER NOT NULL DEFAULT 0,
            cambio_entregado INTEGER NOT NULL DEFAULT 0,

            total_efectivo_reversado INTEGER NOT NULL DEFAULT 0,
            total_transferencia_reversado INTEGER NOT NULL DEFAULT 0,
            total_tarjeta_reversado INTEGER NOT NULL DEFAULT 0,
            total_otros_reversado INTEGER NOT NULL DEFAULT 0,
            monto_esperado_reversado INTEGER NOT NULL DEFAULT 0,

            motivo_anulacion TEXT NOT NULL,
            observaciones TEXT,

            anulada_por INTEGER NOT NULL,
            anulada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (id_venta)
                REFERENCES ventas(id_venta)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_cliente)
                REFERENCES clientes(id_cliente)
                ON UPDATE CASCADE
                ON DELETE SET NULL,

            FOREIGN KEY (id_turno_caja)
                REFERENCES turnos_caja(id_turno_caja)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (anulada_por)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        );

-- Tabla: devoluciones_venta
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

-- Tabla: detalle_devoluciones_venta
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

-- Tabla: notas_credito
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

-- Tabla: detalle_notas_credito
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

-- Tabla: movimientos_inventario
CREATE TABLE IF NOT EXISTS "movimientos_inventario" (
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

-- Tabla: conteos_inventario
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

-- Tabla: detalle_conteos_inventario
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

-- Tabla: categorias_gasto
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

-- Tabla: gastos
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
    motivo_anulacion TEXT, id_medio_pago INTEGER REFERENCES medios_pago(id_medio_pago) ON UPDATE CASCADE ON DELETE RESTRICT, referencia_pago TEXT, entidad_pago TEXT,

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

-- Tabla: compras
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
            anulado_en TEXT, condicion_pago TEXT NOT NULL DEFAULT 'contado'
            CHECK (condicion_pago IN ('contado', 'credito')), dias_plazo INTEGER NOT NULL DEFAULT 0 CHECK (dias_plazo >= 0), fecha_vencimiento TEXT, estado_pago TEXT NOT NULL DEFAULT 'pagada'
            CHECK (estado_pago IN ('pendiente', 'pagada', 'vencida', 'parcial')), fecha_pago TEXT, total_pagado INTEGER NOT NULL DEFAULT 0 CHECK (total_pagado >= 0), saldo_pendiente INTEGER NOT NULL DEFAULT 0 CHECK (saldo_pendiente >= 0),

            FOREIGN KEY (id_proveedor)
                REFERENCES proveedores(id_proveedor)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,

            FOREIGN KEY (id_usuario)
                REFERENCES usuarios(id_usuario)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );

-- Tabla: compras_detalle
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

            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, descuento_porcentaje REAL NOT NULL DEFAULT 0, descuento_linea INTEGER NOT NULL DEFAULT 0, costo_unitario_neto INTEGER NOT NULL DEFAULT 0, iva_unitario INTEGER NOT NULL DEFAULT 0, costo_unitario_final INTEGER NOT NULL DEFAULT 0, precio_venta_anterior INTEGER NOT NULL DEFAULT 0, ganancia_sobre_costo_porcentaje REAL NOT NULL DEFAULT 0, precio_venta_sugerido INTEGER NOT NULL DEFAULT 0, actualizar_precio_venta INTEGER NOT NULL DEFAULT 0, precio_venta_nuevo INTEGER NOT NULL DEFAULT 0,

            FOREIGN KEY (id_compra)
                REFERENCES compras(id_compra)
                ON UPDATE CASCADE
                ON DELETE CASCADE,

            FOREIGN KEY (id_producto)
                REFERENCES productos(id_producto)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        );

-- Tabla: pagos_compras_proveedores
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
            motivo_anulacion TEXT, origen_pago TEXT NOT NULL DEFAULT 'tesoreria',

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

-- Tabla: cotizaciones
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

-- Tabla: detalle_cotizaciones
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

-- Tabla: remisiones
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

-- Tabla: detalle_remisiones
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

-- Tabla: auditoria
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

-- =========================================================
-- Índices
-- =========================================================

-- Índices de usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_correo
ON usuarios(correo);

-- Índices de catalogo_municipios
CREATE INDEX IF NOT EXISTS idx_catalogo_municipios_busqueda
        ON catalogo_municipios(nombre_municipio, nombre_departamento, codigo_municipio)
    ;
CREATE INDEX IF NOT EXISTS idx_catalogo_municipios_departamento
        ON catalogo_municipios(codigo_departamento)
    ;

-- Índices de productos
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras
ON productos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_interno
ON productos(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_productos_nombre
ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_pos_tactil
            ON productos (mostrar_en_pos_tactil, orden_pos_tactil, nombre)
            WHERE eliminado_en IS NULL
        ;
CREATE INDEX IF NOT EXISTS idx_productos_unidad_medida
    ON productos(id_unidad_medida);

-- Índices de clientes
CREATE INDEX IF NOT EXISTS idx_clientes_busqueda_basica
        ON clientes(nombre, documento, telefono, correo)
    ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_documento_activo_unico
        ON clientes(tipo_documento, documento)
        WHERE documento IS NOT NULL
          AND TRIM(documento) <> ''
          AND es_consumidor_final = 0
          AND eliminado_en IS NULL
    ;
CREATE INDEX IF NOT EXISTS idx_clientes_estado
        ON clientes(estado)
    ;

-- Índices de proveedores
CREATE INDEX IF NOT EXISTS idx_proveedores_documento
        ON proveedores (tipo_documento, documento);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_documento_unico
        ON proveedores (tipo_documento, documento)
        WHERE documento IS NOT NULL
          AND documento <> ''
          AND eliminado_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_proveedores_estado
        ON proveedores (estado);

-- Índices de medios_pago
CREATE INDEX IF NOT EXISTS idx_medios_pago_activo
        ON medios_pago(activo);
CREATE INDEX IF NOT EXISTS idx_medios_pago_codigo
        ON medios_pago(codigo);
CREATE INDEX IF NOT EXISTS idx_medios_pago_tipo
        ON medios_pago(tipo);

-- Índices de numeraciones_documentos
CREATE INDEX IF NOT EXISTS idx_numeraciones_documentos_activo
        ON numeraciones_documentos(activo)
    ;
CREATE INDEX IF NOT EXISTS idx_numeraciones_documentos_codigo
        ON numeraciones_documentos(codigo_documento)
    ;

-- Índices de movimientos_caja
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_medio_pago
        ON movimientos_caja(id_medio_pago);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_turno
ON movimientos_caja(id_turno_caja);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_turno_medio_pago
        ON movimientos_caja(id_turno_caja, id_medio_pago);

-- Índices de ventas
CREATE INDEX IF NOT EXISTS idx_ventas_estado
ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha
ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_turno
ON ventas(id_turno_caja);
CREATE INDEX IF NOT EXISTS idx_ventas_turno_estado
        ON ventas(id_turno_caja, estado);

-- Índices de detalle_ventas
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto
        ON detalle_ventas(id_producto);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_unidad
        ON detalle_ventas(id_unidad_medida);

-- Índices de pagos_venta
CREATE INDEX IF NOT EXISTS idx_pagos_venta_estado
        ON pagos_venta(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_venta_medio_pago
        ON pagos_venta(id_medio_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_venta_venta
ON pagos_venta(id_venta);
CREATE INDEX IF NOT EXISTS idx_pagos_venta_venta_estado
         ON pagos_venta(id_venta, estado);
CREATE INDEX IF NOT EXISTS idx_pagos_venta_venta_medio_pago
        ON pagos_venta(id_venta, id_medio_pago);

-- Índices de anulaciones_venta
CREATE INDEX IF NOT EXISTS idx_anulaciones_venta_fecha
         ON anulaciones_venta(anulada_en);
CREATE INDEX IF NOT EXISTS idx_anulaciones_venta_turno
         ON anulaciones_venta(id_turno_caja);
CREATE INDEX IF NOT EXISTS idx_anulaciones_venta_venta
         ON anulaciones_venta(id_venta);

-- Índices de devoluciones_venta
CREATE INDEX IF NOT EXISTS idx_devoluciones_venta_turno
        ON devoluciones_venta(id_turno_caja);
CREATE INDEX IF NOT EXISTS idx_devoluciones_venta_venta
        ON devoluciones_venta(id_venta);

-- Índices de detalle_devoluciones_venta
CREATE INDEX IF NOT EXISTS idx_detalle_devoluciones_producto
        ON detalle_devoluciones_venta(id_producto);

-- Índices de notas_credito
CREATE INDEX IF NOT EXISTS idx_notas_credito_anulacion
         ON notas_credito(id_anulacion_venta);
CREATE INDEX IF NOT EXISTS idx_notas_credito_cliente
         ON notas_credito(id_cliente);
CREATE INDEX IF NOT EXISTS idx_notas_credito_estado
         ON notas_credito(estado);
CREATE INDEX IF NOT EXISTS idx_notas_credito_fecha
         ON notas_credito(fecha_nota);
CREATE INDEX IF NOT EXISTS idx_notas_credito_numero
         ON notas_credito(numero_nota_credito);
CREATE INDEX IF NOT EXISTS idx_notas_credito_venta
         ON notas_credito(id_venta);

-- Índices de detalle_notas_credito
CREATE INDEX IF NOT EXISTS idx_detalle_notas_credito_nota
         ON detalle_notas_credito(id_nota_credito);
CREATE INDEX IF NOT EXISTS idx_detalle_notas_credito_producto
         ON detalle_notas_credito(id_producto);
CREATE INDEX IF NOT EXISTS idx_detalle_notas_credito_venta
         ON detalle_notas_credito(id_venta);

-- Índices de movimientos_inventario
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_referencia
        ON movimientos_inventario(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_unidad
        ON movimientos_inventario(id_unidad_medida);

-- Índices de conteos_inventario
CREATE INDEX IF NOT EXISTS idx_conteos_inventario_estado
    ON conteos_inventario(estado);
CREATE INDEX IF NOT EXISTS idx_conteos_inventario_fecha
    ON conteos_inventario(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_conteos_inventario_numero
    ON conteos_inventario(numero_conteo);

-- Índices de detalle_conteos_inventario
CREATE INDEX IF NOT EXISTS idx_detalle_conteos_conteo
    ON detalle_conteos_inventario(id_conteo_inventario);
CREATE INDEX IF NOT EXISTS idx_detalle_conteos_estado
    ON detalle_conteos_inventario(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_conteos_producto
    ON detalle_conteos_inventario(id_producto);

-- Índices de gastos
CREATE INDEX IF NOT EXISTS idx_gastos_afecta_caja_medio_pago
        ON gastos(afecta_caja, id_medio_pago);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha
ON gastos(fecha_gasto);
CREATE INDEX IF NOT EXISTS idx_gastos_medio_pago
        ON gastos(id_medio_pago);
CREATE INDEX IF NOT EXISTS idx_gastos_turno_medio_pago
        ON gastos(id_turno_caja, id_medio_pago);

-- Índices de compras
CREATE INDEX IF NOT EXISTS idx_compras_condicion_pago ON compras (condicion_pago);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras (estado);
CREATE INDEX IF NOT EXISTS idx_compras_estado_pago ON compras (estado_pago);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras (fecha_compra);
CREATE INDEX IF NOT EXISTS idx_compras_fecha_vencimiento ON compras (fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras (id_proveedor);
CREATE UNIQUE INDEX IF NOT EXISTS idx_compras_soporte_proveedor_unico
            ON compras (id_proveedor, numero_soporte)
            WHERE numero_soporte IS NOT NULL
              AND numero_soporte <> ''
              AND estado <> 'anulada'
        ;

-- Índices de compras_detalle
CREATE INDEX IF NOT EXISTS idx_compras_detalle_compra ON compras_detalle (id_compra);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_producto ON compras_detalle (id_producto);

-- Índices de pagos_compras_proveedores
CREATE INDEX IF NOT EXISTS idx_pagos_compras_proveedores_compra ON pagos_compras_proveedores (id_compra);
CREATE INDEX IF NOT EXISTS idx_pagos_compras_proveedores_estado ON pagos_compras_proveedores (estado);
CREATE INDEX IF NOT EXISTS idx_pagos_compras_proveedores_fecha ON pagos_compras_proveedores (fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_compras_proveedores_medio_pago ON pagos_compras_proveedores (id_medio_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_compras_proveedores_movimiento_caja ON pagos_compras_proveedores (id_movimiento_caja);
CREATE INDEX IF NOT EXISTS idx_pagos_compras_proveedores_origen_pago
            ON pagos_compras_proveedores (origen_pago)
        ;
CREATE INDEX IF NOT EXISTS idx_pagos_compras_proveedores_proveedor ON pagos_compras_proveedores (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_pagos_compras_proveedores_turno ON pagos_compras_proveedores (id_turno_caja);

-- Índices de cotizaciones
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente
         ON cotizaciones(id_cliente);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado
         ON cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha
         ON cotizaciones(fecha_cotizacion);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero
         ON cotizaciones(numero_cotizacion);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_usuario
         ON cotizaciones(id_usuario);

-- Índices de detalle_cotizaciones
CREATE INDEX IF NOT EXISTS idx_detalle_cotizaciones_cotizacion
         ON detalle_cotizaciones(id_cotizacion);
CREATE INDEX IF NOT EXISTS idx_detalle_cotizaciones_producto
         ON detalle_cotizaciones(id_producto);

-- Índices de remisiones
CREATE INDEX IF NOT EXISTS idx_remisiones_cliente
         ON remisiones(id_cliente);
CREATE INDEX IF NOT EXISTS idx_remisiones_cotizacion_origen
         ON remisiones(id_cotizacion_origen);
CREATE INDEX IF NOT EXISTS idx_remisiones_estado
         ON remisiones(estado);
CREATE INDEX IF NOT EXISTS idx_remisiones_fecha
         ON remisiones(fecha_remision);
CREATE INDEX IF NOT EXISTS idx_remisiones_numero
         ON remisiones(numero_remision);
CREATE INDEX IF NOT EXISTS idx_remisiones_usuario
         ON remisiones(id_usuario);
CREATE INDEX IF NOT EXISTS idx_remisiones_venta_convertida
         ON remisiones(id_venta_convertida);

-- Índices de detalle_remisiones
CREATE INDEX IF NOT EXISTS idx_detalle_remisiones_producto
         ON detalle_remisiones(id_producto);
CREATE INDEX IF NOT EXISTS idx_detalle_remisiones_remision
         ON detalle_remisiones(id_remision);

-- Índices de auditoria
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla
ON auditoria(tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario
ON auditoria(id_usuario);

-- =========================================================
-- Triggers
-- =========================================================

-- Triggers de clientes
CREATE TRIGGER IF NOT EXISTS trg_clientes_documento_numerico_insert
        BEFORE INSERT ON clientes
        FOR EACH ROW
        WHEN
            NEW.documento IS NULL
            OR TRIM(NEW.documento) = ''
            OR NEW.documento GLOB '*[^0-9]*'
        BEGIN
            SELECT RAISE(ABORT, 'El documento del cliente solo debe contener números.');
        END;
CREATE TRIGGER IF NOT EXISTS trg_clientes_documento_numerico_update
        BEFORE UPDATE OF documento ON clientes
        FOR EACH ROW
        WHEN
            NEW.documento IS NULL
            OR TRIM(NEW.documento) = ''
            OR NEW.documento GLOB '*[^0-9]*'
        BEGIN
            SELECT RAISE(ABORT, 'El documento del cliente solo debe contener números.');
        END;
CREATE TRIGGER IF NOT EXISTS trg_clientes_dv_numerico_insert
        BEFORE INSERT ON clientes
        FOR EACH ROW
        WHEN
            NEW.digito_verificacion IS NOT NULL
            AND TRIM(NEW.digito_verificacion) <> ''
            AND (
                LENGTH(TRIM(NEW.digito_verificacion)) <> 1
                OR NEW.digito_verificacion GLOB '*[^0-9]*'
            )
        BEGIN
            SELECT RAISE(ABORT, 'El dígito de verificación solo debe contener un número.');
        END;
CREATE TRIGGER IF NOT EXISTS trg_clientes_dv_numerico_update
        BEFORE UPDATE OF digito_verificacion ON clientes
        FOR EACH ROW
        WHEN
            NEW.digito_verificacion IS NOT NULL
            AND TRIM(NEW.digito_verificacion) <> ''
            AND (
                LENGTH(TRIM(NEW.digito_verificacion)) <> 1
                OR NEW.digito_verificacion GLOB '*[^0-9]*'
            )
        BEGIN
            SELECT RAISE(ABORT, 'El dígito de verificación solo debe contener un número.');
        END;
