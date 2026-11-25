/**
 * Migración 008 · El precio de venta es el precio final (IVA incluido).
 *
 * En Colombia el precio al consumidor se informa con todos los impuestos
 * incluidos (Ley 1480 de 2011, art. 26). El producto podía guardarse como
 * "precio + IVA" y el POS le sumaba el IVA encima: el cliente pagaba más que
 * el precio publicado, y un precio sugerido por Compras (costo + IVA + ganancia)
 * terminaba con el IVA cobrado dos veces.
 *
 * Desde ahora todo precio de venta incluye el IVA. Los productos que estaban
 * como "precio + IVA" pasan a precio final sumándoles su IVA con la misma
 * aritmética del POS, así el cliente sigue pagando exactamente lo mismo.
 * Cada cambio de precio queda en auditoría.
 */

const { registrarAuditoriaMigracion } = require('./utilidades');

/** Igual que dinero-exacto: división entera con redondeo medio hacia arriba. */
function dividirRedondeando(numerador, denominador) {
    return Math.floor((2 * numerador + denominador) / (2 * denominador));
}

function up(db) {
    const productosMasIva = db.prepare(`
        SELECT id_producto, codigo_interno, nombre, precio_venta, porcentaje_iva
        FROM productos
        WHERE maneja_iva = 1
          AND porcentaje_iva > 0
          AND COALESCE(precio_incluye_iva, 0) = 0
        ORDER BY id_producto
    `).all();

    const actualizarPrecio = db.prepare(`
        UPDATE productos
        SET precio_venta = ?,
            precio_incluye_iva = 1,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_producto = ?
    `);

    for (const producto of productosMasIva) {
        const precioAnterior = Math.round(Number(producto.precio_venta) || 0);
        const porcentaje = Math.round(Number(producto.porcentaje_iva) || 0);
        const precioFinal = precioAnterior + dividirRedondeando(precioAnterior * porcentaje, 100);

        actualizarPrecio.run(precioFinal, producto.id_producto);

        registrarAuditoriaMigracion(db, {
            accion: 'migracion_iva_precio_final',
            tabla: 'productos',
            datosAnteriores: {
                id_producto: producto.id_producto,
                codigo_interno: producto.codigo_interno,
                nombre: producto.nombre,
                precio_venta: precioAnterior,
                porcentaje_iva: porcentaje,
                precio_incluye_iva: 0,
            },
            datosNuevos: {
                id_producto: producto.id_producto,
                precio_venta: precioFinal,
                precio_incluye_iva: 1,
            },
        });
    }

    // Un producto "con IVA" sin porcentaje no cobra IVA: se deja coherente
    db.prepare(`
        UPDATE productos
        SET maneja_iva = 0, porcentaje_iva = 0
        WHERE maneja_iva = 1 AND COALESCE(porcentaje_iva, 0) <= 0
    `).run();

    db.prepare(`UPDATE productos SET precio_incluye_iva = 1 WHERE COALESCE(precio_incluye_iva, 0) <> 1`).run();
    db.prepare(`UPDATE configuracion_negocio SET iva_incluido_en_precio = 1`).run();
}

module.exports = {
    version: 8,
    nombre: 'Precio de venta con IVA incluido',
    up,
};
