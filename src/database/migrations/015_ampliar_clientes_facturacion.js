const db = require('../../config/db');

function obtenerColumnas(nombreTabla) {
    return db.prepare(`PRAGMA table_info(${nombreTabla})`).all();
}

function tieneColumna(nombreTabla, nombreColumna) {
    return obtenerColumnas(nombreTabla).some((columna) => columna.name === nombreColumna);
}

function agregarColumnaSiNoExiste(nombreTabla, nombreColumna, definicion) {
    if (tieneColumna(nombreTabla, nombreColumna)) {
        return false;
    }

    db.prepare(`
        ALTER TABLE ${nombreTabla}
        ADD COLUMN ${nombreColumna} ${definicion}
    `).run();

    return true;
}

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

function ampliarTablaClientes() {
    if (!tablaExiste('clientes')) {
        throw new Error('No existe la tabla clientes. Ejecuta primero las migraciones base.');
    }

    const columnasAgregadas = [];

    const columnas = [
        ['tipo_cliente', "TEXT NOT NULL DEFAULT 'persona_natural'"],
        ['digito_verificacion', 'TEXT'],
        ['razon_social', 'TEXT'],
        ['nombre_comercial', 'TEXT'],
        ['primer_nombre', 'TEXT'],
        ['segundo_nombre', 'TEXT'],
        ['primer_apellido', 'TEXT'],
        ['segundo_apellido', 'TEXT'],

        ['celular', 'TEXT'],
        ['correo_facturacion', 'TEXT'],

        ['pais', "TEXT NOT NULL DEFAULT 'Colombia'"],
        ['codigo_pais', "TEXT NOT NULL DEFAULT 'CO'"],
        ['departamento', 'TEXT'],
        ['codigo_departamento', 'TEXT'],
        ['municipio', 'TEXT'],
        ['codigo_municipio', 'TEXT'],
        ['barrio', 'TEXT'],
        ['codigo_postal', 'TEXT'],

        ['regimen_fiscal', "TEXT NOT NULL DEFAULT 'no_definido'"],
        ['responsabilidades_fiscales_json', 'TEXT'],
        ['obligado_facturar', 'INTEGER NOT NULL DEFAULT 0'],
        ['acepta_factura_electronica', 'INTEGER NOT NULL DEFAULT 1'],
        ['autoriza_tratamiento_datos', 'INTEGER NOT NULL DEFAULT 0'],

        ['contacto_nombre', 'TEXT'],
        ['contacto_cargo', 'TEXT'],
        ['observaciones_facturacion', 'TEXT'],
    ];

    for (const [nombreColumna, definicion] of columnas) {
        const agregada = agregarColumnaSiNoExiste('clientes', nombreColumna, definicion);

        if (agregada) {
            columnasAgregadas.push(nombreColumna);
        }
    }

    return columnasAgregadas;
}

function normalizarDatosExistentes() {
    db.prepare(`
        UPDATE clientes
        SET tipo_cliente = CASE
                WHEN tipo_documento = 'NIT' THEN 'persona_juridica'
                WHEN es_consumidor_final = 1 THEN 'consumidor_final'
                ELSE 'persona_natural'
            END
        WHERE tipo_cliente IS NULL
           OR TRIM(tipo_cliente) = ''
           OR tipo_cliente = 'persona_natural'
    `).run();

    db.prepare(`
        UPDATE clientes
        SET razon_social = nombre
        WHERE tipo_documento = 'NIT'
          AND (razon_social IS NULL OR TRIM(razon_social) = '')
    `).run();

    db.prepare(`
        UPDATE clientes
        SET correo_facturacion = correo
        WHERE correo IS NOT NULL
          AND TRIM(correo) <> ''
          AND (correo_facturacion IS NULL OR TRIM(correo_facturacion) = '')
    `).run();

    db.prepare(`
        UPDATE clientes
        SET pais = 'Colombia'
        WHERE pais IS NULL OR TRIM(pais) = ''
    `).run();

    db.prepare(`
        UPDATE clientes
        SET codigo_pais = 'CO'
        WHERE codigo_pais IS NULL OR TRIM(codigo_pais) = ''
    `).run();

    db.prepare(`
        UPDATE clientes
        SET acepta_factura_electronica = 1
        WHERE acepta_factura_electronica IS NULL
    `).run();

    db.prepare(`
        UPDATE clientes
        SET obligado_facturar = 0
        WHERE obligado_facturar IS NULL
    `).run();

    db.prepare(`
        UPDATE clientes
        SET autoriza_tratamiento_datos = 0
        WHERE autoriza_tratamiento_datos IS NULL
    `).run();
}

function crearIndices() {
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_clientes_busqueda_basica
        ON clientes(nombre, documento, telefono, correo)
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_clientes_estado
        ON clientes(estado)
    `).run();

    db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_documento_activo_unico
        ON clientes(tipo_documento, documento)
        WHERE documento IS NOT NULL
          AND TRIM(documento) <> ''
          AND es_consumidor_final = 0
          AND eliminado_en IS NULL
    `).run();
}

function imprimirResultado(columnasAgregadas) {
    console.log('\n====================================');
    console.log('CLIENTES · AMPLIACIÓN FACTURACIÓN');
    console.log('====================================');

    console.log('\nColumnas agregadas:');

    if (columnasAgregadas.length === 0) {
        console.log('No se agregaron columnas nuevas. La tabla ya estaba actualizada.');
    } else {
        columnasAgregadas.forEach((columna) => console.log(`- ${columna}`));
    }

    console.log('\nEstructura actual de clientes:');
    console.table(
        obtenerColumnas('clientes').map((columna) => ({
            cid: columna.cid,
            name: columna.name,
            type: columna.type,
            notnull: columna.notnull,
            default: columna.dflt_value,
            pk: columna.pk,
        }))
    );

    console.log('\nClientes actuales:');
    console.table(
        db.prepare(`
            SELECT
                id_cliente,
                tipo_cliente,
                tipo_documento,
                documento,
                digito_verificacion,
                nombre,
                razon_social,
                correo_facturacion,
                municipio,
                departamento,
                estado,
                es_consumidor_final
            FROM clientes
            ORDER BY id_cliente ASC
            LIMIT 20
        `).all()
    );
}

function ejecutarMigracion() {
    const transaccion = db.transaction(() => {
        const columnasAgregadas = ampliarTablaClientes();
        normalizarDatosExistentes();
        crearIndices();
        return columnasAgregadas;
    });

    const columnasAgregadas = transaccion();

    console.log('Migración ejecutada correctamente.');
    console.log('Tabla clientes ampliada para datos fiscales y facturación futura.');

    imprimirResultado(columnasAgregadas);
}

ejecutarMigracion();