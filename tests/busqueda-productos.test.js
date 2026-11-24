/**
 * Búsqueda de productos del punto de venta: el cajero escribe palabras sueltas
 * ("cable 12 blanco"), sin tildes ni mayúsculas, o escanea un código.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { crearEntornoPrueba } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('busqueda');
const ventasService = entorno.requerir('src/modules/ventas/ventas.service');

function nombres(termino) {
    return ventasService.buscarProductos({ busqueda: termino }).map((producto) => producto.nombre);
}

const blanco12 = 'Cable THHN calibre 12 AWG · blanco';
const blanco14 = 'Cable THHN calibre 14 AWG · blanco';
const negro12 = 'Cable THHN calibre 12 AWG · negro';
const tuberia = 'Tubería eléctrica PVC 1/2"';

const idBlanco12 = entorno.crearProducto({ nombre: blanco12, unidad: 'm', decimal: true });
entorno.crearProducto({ nombre: blanco14, unidad: 'm', decimal: true });
entorno.crearProducto({ nombre: negro12, unidad: 'm', decimal: true });
entorno.crearProducto({ nombre: tuberia });

test('encuentra por palabras sueltas, en cualquier orden', () => {
    assert.deepEqual(nombres('cable 12 blanco'), [blanco12]);
    assert.deepEqual(nombres('blanco 12'), [blanco12]);
    assert.deepEqual(nombres('thhn 12').sort(), [blanco12, negro12].sort());
    assert.equal(nombres('cable 12 rojo').length, 0);
});

test('ignora tildes y mayúsculas en lo que se escribe y en el producto', () => {
    assert.deepEqual(nombres('TUBERIA ELECTRICA'), [tuberia]);
    assert.deepEqual(nombres('tubería eléctrica'), [tuberia]);
    assert.deepEqual(nombres('electrica pvc'), [tuberia]);
});

test('el código de barras exacto sale primero', () => {
    entorno.db.prepare('UPDATE productos SET codigo_barras = ? WHERE id_producto = ?').run('7701234500128', idBlanco12);

    const resultados = ventasService.buscarProductos({ busqueda: '7701234500128' });

    assert.equal(resultados[0].id_producto, idBlanco12);
});
