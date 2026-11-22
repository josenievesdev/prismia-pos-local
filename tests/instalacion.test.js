/**
 * Instalación limpia: lo que recibe un cliente nuevo al abrir Prismia por
 * primera vez debe quedar completo y en la última versión del esquema.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { crearEntornoPrueba } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('instalacion');
const { db } = entorno;
const migrator = entorno.requerir('src/database/migrator');

const contar = (tabla) => db.prepare(`SELECT COUNT(*) AS total FROM ${tabla}`).get().total;

test('queda en la última versión del esquema', () => {
    assert.equal(migrator.obtenerVersionActual(db), migrator.obtenerVersionObjetivo());
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
});

test('trae los datos semilla para operar', () => {
    assert.ok(contar('roles') >= 2);
    assert.ok(contar('medios_pago') >= 8);
    assert.ok(contar('unidades_medida') >= 10);
    assert.ok(contar('numeraciones_documentos') >= 5);
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM clientes WHERE es_consumidor_final = 1').get().total, 1);
});

test('trae el catálogo DIVIPOLA completo', () => {
    assert.equal(contar('catalogo_departamentos'), 33);
    assert.equal(contar('catalogo_municipios'), 1122);

    const bogota = db.prepare(`SELECT nombre_municipio, nombre_departamento FROM catalogo_municipios WHERE codigo_municipio = '11001'`).get();
    assert.deepEqual(bogota, { nombre_municipio: 'BOGOTÁ, D.C.', nombre_departamento: 'BOGOTÁ, D.C.' });
});
