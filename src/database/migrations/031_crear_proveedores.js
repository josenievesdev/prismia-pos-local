const db = require('../../config/db');

function up() {
    db.exec(`
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

        CREATE INDEX IF NOT EXISTS idx_proveedores_estado
        ON proveedores (estado);

        CREATE INDEX IF NOT EXISTS idx_proveedores_documento
        ON proveedores (tipo_documento, documento);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_documento_unico
        ON proveedores (tipo_documento, documento)
        WHERE documento IS NOT NULL
          AND documento <> ''
          AND eliminado_en IS NULL;
    `);

    console.log('Migración proveedores ejecutada correctamente.');
}

up();