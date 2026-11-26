/**
 * Navegación (botón "volver") y cobro por transferencia sin bloquear por la referencia.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { crearEntornoPrueba, silenciarErrores } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('navegacion-pagos');
const { db, usuarioAdmin, crearProducto, idMedioPago } = entorno;

const { rutaPadre } = entorno.requerir('src/utils/navegacion');
const ventas = entorno.requerir('src/modules/ventas/ventas.service');
const caja = entorno.requerir('src/modules/caja/caja.service');

test('las pantallas del menú no tienen "volver"', () => {
    for (const ruta of ['/dashboard', '/ventas', '/productos', '/caja', '/caja/gasto', '/configuracion', '/ventas/movil']) {
        assert.equal(rutaPadre(ruta), null, ruta);
    }
});

test('las pantallas internas vuelven a su módulo (o a un padre más natural)', () => {
    assert.deepEqual(rutaPadre('/productos/nuevo'), { ruta: '/productos', etiqueta: 'Productos' });
    assert.deepEqual(rutaPadre('/productos/12/editar?pagina=2'), { ruta: '/productos', etiqueta: 'Productos' });
    assert.deepEqual(rutaPadre('/cotizaciones/7'), { ruta: '/cotizaciones', etiqueta: 'Cotizaciones' });
    assert.deepEqual(rutaPadre('/caja/turnos/8'), { ruta: '/caja', etiqueta: 'Caja' });
    assert.deepEqual(rutaPadre('/ventas/historial'), { ruta: '/ventas', etiqueta: 'POS' });
    assert.deepEqual(rutaPadre('/ventas/51'), { ruta: '/ventas/historial', etiqueta: 'Historial' });
    assert.deepEqual(rutaPadre('/inventario/conteos/3'), { ruta: '/inventario/conteos', etiqueta: 'Conteos' });
    assert.deepEqual(rutaPadre('/meseros'), { ruta: '/configuracion', etiqueta: 'Configuración' });
});

test('una transferencia sin referencia no bloquea la venta; si la escriben, se guarda', () => {
    const apertura = caja.abrirCaja({ datosFormulario: { monto_inicial: '0' }, usuario: usuarioAdmin });
    assert.equal(apertura.ok, true, apertura.mensaje);

    const nequi = idMedioPago('nequi');
    assert.equal(db.prepare('SELECT requiere_referencia FROM medios_pago WHERE id_medio_pago = ?').get(nequi).requiere_referencia, 1,
        'Nequi sigue pidiendo la referencia (el campo se muestra)');

    const producto = crearProducto({ nombre: 'Taladro', precio: 120000 });
    const vender = (pago) => silenciarErrores(() => ventas.registrarVentaPOS({
        idUsuario: usuarioAdmin.id_usuario,
        payload: { items: [{ id_producto: producto, cantidad: 1 }], pagos: [pago] },
    }));

    const sinReferencia = vender({ id_medio_pago: nequi, monto_recibido: 120000 });
    assert.equal(sinReferencia.ok, true, sinReferencia.mensaje);

    const conReferencia = vender({ id_medio_pago: nequi, monto_recibido: 120000, referencia: 'M12345' });
    assert.equal(conReferencia.ok, true, conReferencia.mensaje);
    assert.equal(
        db.prepare('SELECT referencia FROM pagos_venta WHERE id_venta = ?').get(conReferencia.venta.id_venta).referencia,
        'M12345'
    );
});
