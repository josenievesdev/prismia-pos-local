/**
 * IVA del negocio (Configuración).
 *
 * - Sin definir (bases de antes): todo sigue como antes, cada producto cobra su IVA.
 * - No responsable de IVA: ninguna venta lo lleva y el ticket lo indica. Las
 *   tarifas de los productos quedan guardadas.
 * - Responsable: cada producto cobra el IVA que tenga.
 * El precio de venta (IVA incluido) nunca cambia: solo cambia cómo se separa.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { crearEntornoPrueba, silenciarErrores } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('iva-negocio');
const { db, usuarioAdmin, crearProducto, idMedioPago } = entorno;

const configuracion = entorno.requerir('src/modules/configuracion/configuracion.service');
const ivaNegocio = entorno.requerir('src/modules/configuracion/iva-negocio');
const migracion009 = entorno.requerir('src/database/migraciones/009_iva_definido_negocio');
const ventas = entorno.requerir('src/modules/ventas/ventas.service');
const productos = entorno.requerir('src/modules/productos/productos.service');
const inventario = entorno.requerir('src/modules/inventario/inventario.repository');
const caja = entorno.requerir('src/modules/caja/caja.service');

const martillo = crearProducto({ nombre: 'Martillo', precio: 23800, costo: 12000, iva: 19, ivaIncluido: true });

function guardarIva(valor) {
    const actual = configuracion.obtenerConfiguracionNegocio();

    return configuracion.actualizarConfiguracionNegocio({
        idConfiguracion: actual.id_configuracion,
        datosFormulario: {
            nombre_negocio: actual.nombre_negocio || 'Negocio de prueba',
            moneda: 'COP',
            impuesto_por_defecto: '0',
            ...(valor === undefined ? {} : { maneja_iva: valor }),
        },
        usuario: usuarioAdmin,
        ip: '127.0.0.1',
        userAgent: 'pruebas',
    });
}

function venderMartillo() {
    const resultado = silenciarErrores(() => ventas.registrarVentaPOS({
        idUsuario: usuarioAdmin.id_usuario,
        payload: {
            items: [{ id_producto: martillo, cantidad: 1 }],
            pagos: [{ id_medio_pago: idMedioPago('efectivo'), monto_recibido: 23800 }],
        },
    }));
    assert.equal(resultado.ok, true, resultado.mensaje);

    return db.prepare('SELECT id_venta, subtotal, impuesto_total, total FROM ventas WHERE id_venta = ?')
        .get(resultado.venta.id_venta);
}

test('la migración 009 da por definido solo a quien ya se marcó responsable', () => {
    db.prepare('UPDATE configuracion_negocio SET maneja_iva = 1, iva_definido = 0').run();
    migracion009.up(db);
    assert.equal(db.prepare('SELECT iva_definido FROM configuracion_negocio').get().iva_definido, 1);

    db.prepare('UPDATE configuracion_negocio SET maneja_iva = 0, iva_definido = 0').run();
    migracion009.up(db);
    assert.equal(db.prepare('SELECT iva_definido FROM configuracion_negocio').get().iva_definido, 0,
        'un "no" guardado por defecto no cuenta como decisión');
});

test('sin definir: todo sigue como antes (el producto cobra su IVA)', () => {
    assert.deepEqual(ivaNegocio.estadoIvaNegocio(), { definido: false, responsable: false, cobraIva: true });

    const apertura = caja.abrirCaja({ datosFormulario: { monto_inicial: '0' }, usuario: usuarioAdmin });
    assert.equal(apertura.ok, true, apertura.mensaje);

    const venta = venderMartillo();
    assert.deepEqual({ ...venta, id_venta: undefined }, { id_venta: undefined, subtotal: 20000, impuesto_total: 3800, total: 23800 });
});

test('Configuración exige elegir si el negocio es responsable de IVA', () => {
    const sinElegir = guardarIva(undefined);
    assert.equal(sinElegir.ok, false);
    assert.match(sinElegir.mensaje, /responsable de IVA/);
});

test('no responsable: ninguna venta lleva IVA, el precio no cambia y la tarifa queda guardada', () => {
    assert.equal(guardarIva('0').ok, true);
    assert.deepEqual(ivaNegocio.estadoIvaNegocio(), { definido: true, responsable: false, cobraIva: false });

    const venta = venderMartillo();
    assert.equal(venta.total, 23800, 'el cliente paga lo mismo');
    assert.equal(venta.impuesto_total, 0);
    assert.equal(venta.subtotal, 23800);

    const linea = db.prepare('SELECT porcentaje_iva, impuesto_total FROM detalle_ventas WHERE id_venta = ?').get(venta.id_venta);
    assert.deepEqual(linea, { porcentaje_iva: 0, impuesto_total: 0 });

    // El POS recibe el producto sin IVA, pero la tarifa sigue guardada
    const productoPos = ventas.prepararProductoParaVenta(
        db.prepare('SELECT * FROM productos WHERE id_producto = ?').get(martillo)
    );
    assert.equal(productoPos.maneja_iva, 0);
    assert.equal(db.prepare('SELECT porcentaje_iva FROM productos WHERE id_producto = ?').get(martillo).porcentaje_iva, 19);

    const ticket = ventas.obtenerTicketVenta(venta.id_venta);
    assert.equal(ticket.ok, true);
    assert.equal(ticket.ticket.comercio.no_responsable_iva, true, 'el ticket dice "No responsable de IVA"');

    assert.equal(Number(inventario.obtenerResumenOperativoInventario().iva_estimado), 0, 'el inventario no estima IVA');
});

test('no responsable: el creador de productos no pide IVA y no borra la tarifa guardada', () => {
    const idCategoria = Number(db.prepare(`INSERT INTO categorias_productos (nombre) VALUES ('Pruebas IVA negocio')`).run().lastInsertRowid);
    const idUnidad = db.prepare(`SELECT id_unidad_medida FROM unidades_medida WHERE abreviatura = 'und'`).get().id_unidad_medida;
    const comunes = {
        id_categoria_producto: String(idCategoria),
        id_unidad_medida: String(idUnidad),
        precio_costo: '1000',
        controla_inventario: '1',
        stock_inicial: '1',
    };

    // Producto nuevo sin el campo de IVA (el formulario no lo muestra)
    const nuevo = productos.crearProducto({
        datosFormulario: { ...comunes, nombre: 'Tornillo', codigo_interno: 'NEG-1', precio_venta: '500' },
        usuario: usuarioAdmin,
        ip: '127.0.0.1',
        userAgent: 'pruebas',
    });
    assert.equal(nuevo.ok, true, nuevo.mensaje);
    assert.equal(db.prepare(`SELECT porcentaje_iva FROM productos WHERE codigo_interno = 'NEG-1'`).get().porcentaje_iva, 0);

    // Editar el martillo (19 %) sin el campo de IVA: la tarifa se conserva
    const codigoMartillo = db.prepare('SELECT codigo_interno FROM productos WHERE id_producto = ?').get(martillo).codigo_interno;
    const edicion = productos.actualizarProducto({
        idProducto: martillo,
        datosFormulario: { ...comunes, nombre: 'Martillo', codigo_interno: codigoMartillo, precio_venta: '23800' },
        usuario: usuarioAdmin,
        ip: '127.0.0.1',
        userAgent: 'pruebas',
    });
    assert.equal(edicion.ok, true, edicion.mensaje);
    assert.equal(db.prepare('SELECT porcentaje_iva FROM productos WHERE id_producto = ?').get(martillo).porcentaje_iva, 19);
});

test('responsable: el IVA del producto vuelve a separarse', () => {
    assert.equal(guardarIva('1').ok, true);
    assert.deepEqual(ivaNegocio.estadoIvaNegocio(), { definido: true, responsable: true, cobraIva: true });

    const venta = venderMartillo();
    assert.deepEqual({ subtotal: venta.subtotal, impuesto_total: venta.impuesto_total, total: venta.total },
        { subtotal: 20000, impuesto_total: 3800, total: 23800 });

    assert.equal(ventas.obtenerTicketVenta(venta.id_venta).ticket.comercio.no_responsable_iva, false);
    assert.ok(Number(inventario.obtenerResumenOperativoInventario().iva_estimado) > 0);
});
