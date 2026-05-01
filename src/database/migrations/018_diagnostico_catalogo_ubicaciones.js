const db = require('../../config/db');

console.log('\n====================================');
console.log('DIAGNÓSTICO CATÁLOGO UBICACIONES');
console.log('====================================');

console.log('\nTotales activos:');
console.table(
    db.prepare(`
        SELECT
            (SELECT COUNT(*) FROM catalogo_departamentos WHERE activo = 1) AS departamentos,
            (SELECT COUNT(*) FROM catalogo_municipios WHERE activo = 1) AS municipios
    `).all()
);

console.log('\nMunicipios por departamento:');
console.table(
    db.prepare(`
        SELECT
            codigo_departamento,
            nombre_departamento,
            COUNT(*) AS municipios
        FROM catalogo_municipios
        WHERE activo = 1
        GROUP BY codigo_departamento, nombre_departamento
        ORDER BY nombre_departamento ASC
    `).all()
);

console.log('\nMunicipios del Cesar:');
console.table(
    db.prepare(`
        SELECT
            codigo_municipio,
            nombre_municipio
        FROM catalogo_municipios
        WHERE codigo_departamento = '20'
          AND activo = 1
        ORDER BY nombre_municipio ASC
    `).all()
);

console.log('\nBúsqueda CODAZZI:');
console.table(
    db.prepare(`
        SELECT
            codigo_municipio,
            nombre_municipio,
            nombre_departamento
        FROM catalogo_municipios
        WHERE activo = 1
          AND nombre_municipio LIKE '%CODAZZI%'
        ORDER BY nombre_departamento ASC, nombre_municipio ASC
    `).all()
);

console.log('\nBúsqueda PEREIRA:');
console.table(
    db.prepare(`
        SELECT
            codigo_municipio,
            nombre_municipio,
            nombre_departamento
        FROM catalogo_municipios
        WHERE activo = 1
          AND nombre_municipio LIKE '%PEREIRA%'
        ORDER BY nombre_departamento ASC, nombre_municipio ASC
    `).all()
);