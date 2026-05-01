const db = require('../../config/db');

function crearTablas() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS catalogo_departamentos (
            id_departamento INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo_departamento TEXT NOT NULL UNIQUE,
            nombre_departamento TEXT NOT NULL,
            activo INTEGER NOT NULL DEFAULT 1,
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT
        )
    `).run();

    db.prepare(`
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
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_catalogo_municipios_busqueda
        ON catalogo_municipios(nombre_municipio, nombre_departamento, codigo_municipio)
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_catalogo_municipios_departamento
        ON catalogo_municipios(codigo_departamento)
    `).run();
}

function insertarDepartamentoSiNoExiste(codigo, nombre) {
    db.prepare(`
        INSERT OR IGNORE INTO catalogo_departamentos (
            codigo_departamento,
            nombre_departamento,
            activo
        )
        VALUES (?, ?, 1)
    `).run(codigo, nombre);
}

function insertarMunicipioSiNoExiste({
    codigo_municipio,
    nombre_municipio,
    codigo_departamento,
    nombre_departamento,
}) {
    insertarDepartamentoSiNoExiste(codigo_departamento, nombre_departamento);

    db.prepare(`
        INSERT OR IGNORE INTO catalogo_municipios (
            codigo_municipio,
            nombre_municipio,
            codigo_departamento,
            nombre_departamento,
            activo
        )
        VALUES (
            @codigo_municipio,
            @nombre_municipio,
            @codigo_departamento,
            @nombre_departamento,
            1
        )
    `).run({
        codigo_municipio,
        nombre_municipio,
        codigo_departamento,
        nombre_departamento,
    });
}

function sembrarMunicipiosBase() {
    const municipios = [
        {
            codigo_municipio: '66001',
            nombre_municipio: 'Pereira',
            codigo_departamento: '66',
            nombre_departamento: 'Risaralda',
        },
        {
            codigo_municipio: '66170',
            nombre_municipio: 'Dosquebradas',
            codigo_departamento: '66',
            nombre_departamento: 'Risaralda',
        },
        {
            codigo_municipio: '68001',
            nombre_municipio: 'Bucaramanga',
            codigo_departamento: '68',
            nombre_departamento: 'Santander',
        },
        {
            codigo_municipio: '11001',
            nombre_municipio: 'Bogotá, D.C.',
            codigo_departamento: '11',
            nombre_departamento: 'Bogotá, D.C.',
        },
        {
            codigo_municipio: '05001',
            nombre_municipio: 'Medellín',
            codigo_departamento: '05',
            nombre_departamento: 'Antioquia',
        },
        {
            codigo_municipio: '76001',
            nombre_municipio: 'Cali',
            codigo_departamento: '76',
            nombre_departamento: 'Valle del Cauca',
        },
        {
            codigo_municipio: '08001',
            nombre_municipio: 'Barranquilla',
            codigo_departamento: '08',
            nombre_departamento: 'Atlántico',
        },
        {
            codigo_municipio: '13001',
            nombre_municipio: 'Cartagena de Indias',
            codigo_departamento: '13',
            nombre_departamento: 'Bolívar',
        },
        {
            codigo_municipio: '20001',
            nombre_municipio: 'Valledupar',
            codigo_departamento: '20',
            nombre_departamento: 'Cesar',
        },
    ];

    municipios.forEach(insertarMunicipioSiNoExiste);
}

function imprimirResumen() {
    const departamentos = db
        .prepare(`
            SELECT COUNT(*) AS total
            FROM catalogo_departamentos
        `)
        .get();

    const municipios = db
        .prepare(`
            SELECT COUNT(*) AS total
            FROM catalogo_municipios
        `)
        .get();

    console.log('\n====================================');
    console.log('CATÁLOGO UBICACIONES COLOMBIA');
    console.log('====================================');
    console.log(`Departamentos cargados: ${departamentos.total}`);
    console.log(`Municipios cargados: ${municipios.total}`);

    console.table(
        db.prepare(`
            SELECT
                codigo_municipio,
                nombre_municipio,
                codigo_departamento,
                nombre_departamento
            FROM catalogo_municipios
            ORDER BY nombre_departamento ASC, nombre_municipio ASC
            LIMIT 20
        `).all()
    );
}

function ejecutarMigracion() {
    const transaccion = db.transaction(() => {
        crearTablas();
        sembrarMunicipiosBase();
    });

    transaccion();

    console.log('Migración ejecutada correctamente.');
    console.log('Catálogo base de ubicaciones listo.');
    imprimirResumen();
}

ejecutarMigracion();