/**
 * IVA: el precio de venta es el precio final, con el IVA incluido.
 *
 * Es lo que exige la Ley 1480 de 2011 (art. 26: el precio al consumidor se
 * informa con todos los impuestos) y como trabaja Siigo: el IVA se separa en el
 * ticket y nunca se suma encima del precio publicado.
 *
 * - La migración 008 convierte los productos "precio + IVA" sin cambiar lo que
 *   paga el cliente por unidad: misma base, mismo IVA, mismo total.
 * - El formulario ya no permite "precio + IVA" y ofrece las tarifas de
 *   Colombia (sin IVA, 5 %, 19 %).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { crearEntornoPrueba, silenciarErrores } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('iva-precio-final');
const { db, usuarioAdmin, crearProducto, idMedioPago } = entorno;

const migracion = entorno.requerir('src/database/migraciones/008_iva_precio_final');
const dinero = entorno.requerir('src/utils/dinero');
const productos = entorno.requerir('src/modules/productos/productos.service');
const ventas = entorno.requerir('src/modules/ventas/ventas.service');
const caja = entorno.requerir('src/modules/caja/caja.service');

function leerProducto(idProducto) {
    return db.prepare(`
        SELECT precio_venta, maneja_iva, porcentaje_iva, precio_incluye_iva
        FROM productos WHERE id_producto = ?
    `).get(idProducto);
}

/** Lo que el POS cobraba por unidad a un producto "precio + IVA". */
function cobroAnterior(precio, porcentaje) {
    return precio + dinero.calcularIva(precio, porcentaje);
}

let cable;

test('la migración pasa "precio + IVA" a precio final sin cambiar lo que paga el cliente', () => {
    cable = crearProducto({ nombre: 'Cable #12', precio: 2499, iva: 19 });
    const cableVerde = crearProducto({ nombre: 'Cable #14', precio: 2547, iva: 19 });
    const arroz = crearProducto({ nombre: 'Arroz', precio: 4100, iva: 5 });
    const alicate = crearProducto({ nombre: 'Alicate', precio: 16327, iva: 19, ivaIncluido: true });
    const pan = crearProducto({ nombre: 'Pan', precio: 3000 });
    const incoherente = crearProducto({ nombre: 'Marcado con IVA en 0 %', precio: 5000 });
    db.prepare('UPDATE productos SET maneja_iva = 1, porcentaje_iva = 0 WHERE id_producto = ?').run(incoherente);

    db.transaction(() => migracion.up(db))();

    assert.deepEqual(leerProducto(cable), { precio_venta: 2974, maneja_iva: 1, porcentaje_iva: 19, precio_incluye_iva: 1 });
    assert.equal(leerProducto(cable).precio_venta, cobroAnterior(2499, 19));
    assert.equal(leerProducto(cableVerde).precio_venta, cobroAnterior(2547, 19));
    assert.equal(leerProducto(arroz).precio_venta, cobroAnterior(4100, 5));
    assert.deepEqual(leerProducto(alicate), { precio_venta: 16327, maneja_iva: 1, porcentaje_iva: 19, precio_incluye_iva: 1 },
        'el que ya incluía el IVA no cambia');
    assert.deepEqual(leerProducto(pan), { precio_venta: 3000, maneja_iva: 0, porcentaje_iva: 0, precio_incluye_iva: 1 });
    assert.equal(leerProducto(incoherente).maneja_iva, 0, 'IVA en 0 % = sin IVA');

    // El ticket separa la misma base y el mismo IVA que se cobraban antes
    assert.deepEqual(dinero.separarIvaIncluido(2974, 19), { base: 2499, iva: 475 });

    const registros = db.prepare(`
        SELECT datos_anteriores, datos_nuevos FROM auditoria
        WHERE accion = 'migracion_iva_precio_final' ORDER BY id_auditoria
    `).all();
    assert.equal(registros.length, 3, 'cada precio convertido queda en auditoría');
    assert.equal(JSON.parse(registros[0].datos_anteriores).precio_venta, 2499);
    assert.equal(JSON.parse(registros[0].datos_nuevos).precio_venta, 2974);

    assert.equal(db.prepare('SELECT iva_incluido_en_precio FROM configuracion_negocio').get().iva_incluido_en_precio, 1);
});

test('por unidad la conversión conserva la base y el IVA con cualquier precio (5 % y 19 %)', () => {
    for (const porcentaje of [5, 19]) {
        for (let precio = 1; precio <= 60000; precio += 7) {
            const final = cobroAnterior(precio, porcentaje);
            const partes = dinero.separarIvaIncluido(final, porcentaje);

            assert.equal(partes.base, precio, `base de ${precio} al ${porcentaje} %`);
            assert.equal(partes.iva, dinero.calcularIva(precio, porcentaje));
        }
    }
});

test('vender el producto convertido cobra lo mismo de antes y separa el IVA', () => {
    const apertura = caja.abrirCaja({ datosFormulario: { monto_inicial: '0' }, usuario: usuarioAdmin });
    assert.equal(apertura.ok, true, apertura.mensaje);

    const resultado = silenciarErrores(() => ventas.registrarVentaPOS({
        idUsuario: usuarioAdmin.id_usuario,
        payload: {
            items: [{ id_producto: cable, cantidad: 2 }],
            pagos: [{ id_medio_pago: idMedioPago('efectivo'), monto_recibido: 5948 }],
        },
    }));
    assert.equal(resultado.ok, true, resultado.mensaje);

    const venta = db.prepare('SELECT subtotal, impuesto_total, total FROM ventas WHERE id_venta = ?')
        .get(resultado.venta.id_venta);
    assert.deepEqual(venta, { subtotal: 4998, impuesto_total: 950, total: 5948 });
});

test('el formulario guarda siempre el precio con IVA incluido y solo tarifas válidas', () => {
    const idCategoria = Number(db.prepare(`INSERT INTO categorias_productos (nombre) VALUES ('Pruebas IVA')`).run().lastInsertRowid);
    const idUnidad = db.prepare(`SELECT id_unidad_medida FROM unidades_medida WHERE abreviatura = 'und'`).get().id_unidad_medida;

    const datos = (extra) => ({
        id_categoria_producto: String(idCategoria),
        id_unidad_medida: String(idUnidad),
        precio_costo: '10000',
        precio_venta: '23800',
        controla_inventario: '1',
        stock_inicial: '5',
        ...extra,
    });
    const crear = (extra) => productos.crearProducto({
        datosFormulario: datos(extra),
        usuario: usuarioAdmin,
        ip: '127.0.0.1',
        userAgent: 'pruebas',
    });
    const porCodigo = (codigo) => db.prepare(`
        SELECT id_producto, precio_venta, maneja_iva, porcentaje_iva, precio_incluye_iva
        FROM productos WHERE codigo_interno = ?
    `).get(codigo);

    // Aunque llegue "precio sin IVA" (formulario viejo), se guarda con IVA incluido
    const conIva = crear({ nombre: 'Martillo', codigo_interno: 'IVA-19', porcentaje_iva_visual: '19', precio_incluye_iva: '0' });
    assert.equal(conIva.ok, true, conIva.mensaje);
    assert.deepEqual(porCodigo('IVA-19'), {
        id_producto: porCodigo('IVA-19').id_producto, precio_venta: 23800, maneja_iva: 1, porcentaje_iva: 19, precio_incluye_iva: 1,
    });

    const sinIva = crear({ nombre: 'Huevos', codigo_interno: 'IVA-0', porcentaje_iva_visual: '0' });
    assert.equal(sinIva.ok, true, sinIva.mensaje);
    assert.equal(porCodigo('IVA-0').maneja_iva, 0);
    assert.equal(porCodigo('IVA-0').precio_incluye_iva, 1);

    const tarifaRara = crear({ nombre: 'Tarifa rara', codigo_interno: 'IVA-16', porcentaje_iva_visual: '16' });
    assert.equal(tarifaRara.ok, false);
    assert.match(tarifaRara.mensaje, /IVA/);

    // Un producto antiguo con otra tarifa se puede editar sin perderla
    const antiguo = crearProducto({ nombre: 'Antiguo 16 %', precio: 11600, iva: 16, ivaIncluido: true });
    const codigoAntiguo = db.prepare('SELECT codigo_interno FROM productos WHERE id_producto = ?').get(antiguo).codigo_interno;
    const edicion = productos.actualizarProducto({
        idProducto: antiguo,
        datosFormulario: datos({ nombre: 'Antiguo 16 %', codigo_interno: codigoAntiguo, precio_venta: '11600', porcentaje_iva_visual: '16' }),
        usuario: usuarioAdmin,
        ip: '127.0.0.1',
        userAgent: 'pruebas',
    });
    assert.equal(edicion.ok, true, edicion.mensaje);
    assert.equal(leerProducto(antiguo).porcentaje_iva, 16);
});
