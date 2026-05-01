const db = require('../../config/db');

function buscarDepartamentos({ busqueda = '', limite = 12 } = {}) {
    return db
        .prepare(`
            SELECT
                codigo_departamento,
                nombre_departamento,
                activo
            FROM catalogo_departamentos
            WHERE activo = 1
              AND (
                    nombre_departamento LIKE @busqueda
                    OR codigo_departamento LIKE @busqueda
              )
            ORDER BY
                CASE
                    WHEN nombre_departamento LIKE @busquedaExacta THEN 0
                    WHEN nombre_departamento LIKE @busquedaInicio THEN 1
                    ELSE 2
                END,
                nombre_departamento COLLATE NOCASE ASC
            LIMIT @limite
        `)
        .all({
            busqueda: `%${busqueda}%`,
            busquedaExacta: busqueda,
            busquedaInicio: `${busqueda}%`,
            limite,
        });
}

function buscarMunicipios({ busqueda = '', codigo_departamento = '', limite = 12 } = {}) {
    const condiciones = ['activo = 1'];
    const parametros = {
        busqueda: `%${busqueda}%`,
        busquedaExacta: busqueda,
        busquedaInicio: `${busqueda}%`,
        limite,
    };

    if (codigo_departamento) {
        condiciones.push('codigo_departamento = @codigo_departamento');
        parametros.codigo_departamento = codigo_departamento;
    }

    if (busqueda) {
        condiciones.push(`
            (
                nombre_municipio LIKE @busqueda
                OR nombre_departamento LIKE @busqueda
                OR codigo_municipio LIKE @busqueda
                OR codigo_departamento LIKE @busqueda
            )
        `);
    }

    return db
        .prepare(`
            SELECT
                codigo_municipio,
                nombre_municipio,
                codigo_departamento,
                nombre_departamento,
                activo
            FROM catalogo_municipios
            WHERE ${condiciones.join(' AND ')}
            ORDER BY
                CASE
                    WHEN nombre_municipio LIKE @busquedaExacta THEN 0
                    WHEN nombre_municipio LIKE @busquedaInicio THEN 1
                    ELSE 2
                END,
                nombre_municipio COLLATE NOCASE ASC
            LIMIT @limite
        `)
        .all(parametros);
}

function obtenerMunicipioPorCodigo(codigoMunicipio) {
    return db
        .prepare(`
            SELECT
                codigo_municipio,
                nombre_municipio,
                codigo_departamento,
                nombre_departamento,
                activo
            FROM catalogo_municipios
            WHERE codigo_municipio = ?
              AND activo = 1
            LIMIT 1
        `)
        .get(codigoMunicipio);
}

module.exports = {
    buscarDepartamentos,
    buscarMunicipios,
    obtenerMunicipioPorCodigo,
};