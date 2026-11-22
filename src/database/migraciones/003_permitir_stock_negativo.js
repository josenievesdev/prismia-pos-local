/**
 * Migración 003 · Permitir stock negativo (venta sin stock).
 *
 * Bug corregido: los productos con "permitir venta sin stock" no se podían
 * vender por encima del stock porque la base tenía CHECK (stock_actual >= 0)
 * en productos y CHECK (stock_anterior/stock_nuevo >= 0) en
 * movimientos_inventario. El POS mostraba el producto como vendible y al
 * cobrar fallaba con un error genérico.
 *
 * La regla de negocio (solo se puede quedar en negativo si el producto lo
 * permite o no controla inventario) se valida en la aplicación.
 * SQLite no permite quitar un CHECK con ALTER TABLE: se reconstruyen las
 * tablas conservando datos, índices, triggers y AUTOINCREMENT.
 */

const { reconstruirTabla } = require('./utilidades');

function quitarCheck(sql, columna) {
    const patron = new RegExp(`\\s*CHECK\\s*\\(\\s*${columna}\\s*>=\\s*0\\s*\\)`, 'gi');
    return sql.replace(patron, '');
}

function up(db) {
    reconstruirTabla(db, 'productos', (sql) => quitarCheck(sql, 'stock_actual'));

    reconstruirTabla(db, 'movimientos_inventario', (sql) => (
        quitarCheck(quitarCheck(sql, 'stock_anterior'), 'stock_nuevo')
    ));
}

module.exports = {
    version: 3,
    nombre: 'Permitir stock negativo para venta sin stock',
    desactivarForeignKeys: true,
    up,
};
