const db = require('../../config/db');

const URL_MUNICIPIOS_DANE =
    'https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/MapServer/317/query';

function limpiarTexto(valor) {
    return String(valor ?? '').trim();
}

function normalizarCodigo(valor, longitud = null) {
    const texto = limpiarTexto(valor);

    if (!texto) {
        return '';
    }

    const soloDigitos = texto.replace(/\D/g, '');

    if (!soloDigitos) {
        return texto;
    }

    if (longitud) {
        return soloDigitos.padStart(longitud, '0');
    }

    return soloDigitos;
}

function crearTablasSiNoExisten() {
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

async function consultarMunicipiosDane() {
    const parametros = new URLSearchParams();

    parametros.set('where', '1=1');
    parametros.set('outFields', 'DPTO_CCDGO,MPIO_CCDGO,MPIO_CDPMP,DPTO_CNMBRE,MPIO_CNMBRE');
    parametros.set('returnGeometry', 'false');
    parametros.set('f', 'json');

    const url = `${URL_MUNICIPIOS_DANE}?${parametros.toString()}`;

    console.log('\nConsultando municipios desde DANE...');
    console.log('Fuente: DIVIPOLA MGN 2025 · capa Municipio');

    const respuesta = await fetch(url);

    if (!respuesta.ok) {
        throw new Error(`No se pudo consultar DANE. Estado HTTP: ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    if (datos.error) {
        throw new Error(
            `DANE respondió con error: ${datos.error.message || JSON.stringify(datos.error)}`
        );
    }

    if (!Array.isArray(datos.features) || datos.features.length === 0) {
        throw new Error('DANE no devolvió municipios para importar.');
    }

    return datos.features.map((feature) => feature.attributes || {});
}

function mapearMunicipioDane(fila) {
    const codigoDepartamento = normalizarCodigo(fila.DPTO_CCDGO, 2);
    const codigoMunicipioCorto = normalizarCodigo(fila.MPIO_CCDGO, 3);

    const codigoMunicipioCompleto = normalizarCodigo(
        fila.MPIO_CDPMP || `${codigoDepartamento}${codigoMunicipioCorto}`,
        5
    );

    return {
        codigo_departamento: codigoDepartamento,
        nombre_departamento: limpiarTexto(fila.DPTO_CNMBRE),
        codigo_municipio: codigoMunicipioCompleto,
        nombre_municipio: limpiarTexto(fila.MPIO_CNMBRE),
    };
}

function importarRegistros(registrosDane) {
    const registros = registrosDane
        .map(mapearMunicipioDane)
        .filter((registro) => {
            return (
                registro.codigo_departamento
                && registro.nombre_departamento
                && registro.codigo_municipio
                && registro.nombre_municipio
                && registro.codigo_municipio.length === 5
            );
        });

    if (registros.length === 0) {
        throw new Error('No se pudieron mapear municipios válidos desde DANE.');
    }

    const departamentos = new Map();
    const municipios = new Map();

    for (const registro of registros) {
        departamentos.set(registro.codigo_departamento, {
            codigo_departamento: registro.codigo_departamento,
            nombre_departamento: registro.nombre_departamento,
        });

        municipios.set(registro.codigo_municipio, registro);
    }

    const insertarDepartamento = db.prepare(`
        INSERT INTO catalogo_departamentos (
            codigo_departamento,
            nombre_departamento,
            activo
        )
        VALUES (
            @codigo_departamento,
            @nombre_departamento,
            1
        )
        ON CONFLICT(codigo_departamento)
        DO UPDATE SET
            nombre_departamento = excluded.nombre_departamento,
            activo = 1,
            actualizado_en = CURRENT_TIMESTAMP
    `);

    const insertarMunicipio = db.prepare(`
        INSERT INTO catalogo_municipios (
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
        ON CONFLICT(codigo_municipio)
        DO UPDATE SET
            nombre_municipio = excluded.nombre_municipio,
            codigo_departamento = excluded.codigo_departamento,
            nombre_departamento = excluded.nombre_departamento,
            activo = 1,
            actualizado_en = CURRENT_TIMESTAMP
    `);

    const transaccion = db.transaction(() => {
        db.prepare('UPDATE catalogo_departamentos SET activo = 0').run();
        db.prepare('UPDATE catalogo_municipios SET activo = 0').run();

        for (const departamento of departamentos.values()) {
            insertarDepartamento.run(departamento);
        }

        for (const municipio of municipios.values()) {
            insertarMunicipio.run(municipio);
        }
    });

    transaccion();

    return {
        total_departamentos: departamentos.size,
        total_municipios: municipios.size,
    };
}

function imprimirResumen(resultado) {
    console.log('\n====================================');
    console.log('IMPORTACIÓN DIVIPOLA COLOMBIA');
    console.log('====================================');
    console.log(`Departamentos activos: ${resultado.total_departamentos}`);
    console.log(`Municipios activos: ${resultado.total_municipios}`);

    console.log('\nMuestra general:');
    console.table(
        db.prepare(`
            SELECT
                codigo_municipio,
                nombre_municipio,
                codigo_departamento,
                nombre_departamento
            FROM catalogo_municipios
            WHERE activo = 1
            ORDER BY nombre_departamento ASC, nombre_municipio ASC
            LIMIT 20
        `).all()
    );

    console.log('\nMunicipios del Cesar:');
    console.table(
        db.prepare(`
            SELECT
                codigo_municipio,
                nombre_municipio,
                codigo_departamento,
                nombre_departamento
            FROM catalogo_municipios
            WHERE activo = 1
              AND codigo_departamento = '20'
            ORDER BY nombre_municipio ASC
        `).all()
    );
}

async function ejecutar() {
    crearTablasSiNoExisten();

    const registrosDane = await consultarMunicipiosDane();
    const resultado = importarRegistros(registrosDane);

    console.log('\nImportación ejecutada correctamente.');
    imprimirResumen(resultado);
}

ejecutar().catch((error) => {
    console.error('\nError importando DIVIPOLA:');
    console.error(error.message);
    process.exit(1);
});