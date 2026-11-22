/**
 * Migración 005 · Cargar el catálogo DIVIPOLA (departamentos y municipios).
 *
 * En una instalación nueva el catálogo quedaba vacío: el archivo semilla
 * divipola_colombia.xlsx del repositorio pesaba 0 bytes e init-db no lo
 * importaba, así que el formulario de clientes no encontraba municipios.
 * Solo carga si el catálogo está vacío; no toca bases que ya lo tienen.
 */

const path = require('path');

function up(db) {
    const existentes = db.prepare('SELECT COUNT(*) AS total FROM catalogo_municipios').get().total;

    if (existentes > 0) {
        return;
    }

    const semilla = require(path.join(__dirname, '..', 'seed', 'divipola_colombia.json'));

    const insertarDepartamento = db.prepare(`
        INSERT OR IGNORE INTO catalogo_departamentos (codigo_departamento, nombre_departamento)
        VALUES (?, ?)
    `);

    const insertarMunicipio = db.prepare(`
        INSERT OR IGNORE INTO catalogo_municipios (codigo_municipio, nombre_municipio, codigo_departamento, nombre_departamento)
        VALUES (?, ?, ?, ?)
    `);

    const nombresDepartamento = new Map();

    for (const [codigo, nombre] of semilla.departamentos) {
        insertarDepartamento.run(codigo, nombre);
        nombresDepartamento.set(codigo, nombre);
    }

    for (const [codigo, nombre, codigoDepartamento] of semilla.municipios) {
        insertarMunicipio.run(codigo, nombre, codigoDepartamento, nombresDepartamento.get(codigoDepartamento) || '');
    }
}

module.exports = {
    version: 5,
    nombre: 'Cargar catálogo DIVIPOLA de departamentos y municipios',
    up,
};
