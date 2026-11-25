/**
 * Migración 007 · Propinas por mesero (perfil comidas y bares).
 *
 * - meseros: quien atiende las mesas (no necesita usuario ni contraseña).
 * - ventas.id_mesero / ventas.propina: quién atendió y cuánta propina dejó.
 *   La propina NO es venta: no lleva IVA ni suma a total/subtotal.
 * - pagos_venta.monto_propina: parte de cada pago que es propina.
 *   monto sigue siendo lo aplicado a la venta (SUM(monto) = total), así que
 *   los reportes de ventas por medio no cambian.
 * - movimientos_caja: tipos 'propina' y 'anulacion_propina' (la caja separa
 *   las propinas de las ventas; las de efectivo están en el cajón).
 * - turnos_caja.total_propinas / total_propinas_efectivo: caché, igual que
 *   los demás totales del turno (caja.totales.js es la fuente de verdad).
 * - configuracion_negocio.propina_porcentaje_sugerido: 10 % por defecto.
 *
 * Idempotente: en una base nueva también corre (schema.sql no se toca).
 */

const { reconstruirTabla } = require('./utilidades');

function columnaExiste(db, tabla, columna) {
    return db.prepare(`SELECT 1 FROM pragma_table_info(?) WHERE name = ?`).get(tabla, columna) !== undefined;
}

function agregarColumna(db, tabla, columna, definicion) {
    if (!columnaExiste(db, tabla, columna)) {
        db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
    }
}

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS meseros (
            id_mesero INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL COLLATE NOCASE UNIQUE,
            estado TEXT NOT NULL DEFAULT 'activo'
                CHECK (estado IN ('activo', 'inactivo')),
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);

    agregarColumna(db, 'ventas', 'id_mesero',
        'INTEGER REFERENCES meseros(id_mesero) ON UPDATE CASCADE ON DELETE SET NULL');
    agregarColumna(db, 'ventas', 'propina', 'INTEGER NOT NULL DEFAULT 0 CHECK (propina >= 0)');
    agregarColumna(db, 'pagos_venta', 'monto_propina', 'INTEGER NOT NULL DEFAULT 0 CHECK (monto_propina >= 0)');
    agregarColumna(db, 'turnos_caja', 'total_propinas', 'INTEGER NOT NULL DEFAULT 0');
    agregarColumna(db, 'turnos_caja', 'total_propinas_efectivo', 'INTEGER NOT NULL DEFAULT 0');
    agregarColumna(db, 'configuracion_negocio', 'propina_porcentaje_sugerido',
        'INTEGER NOT NULL DEFAULT 10 CHECK (propina_porcentaje_sugerido BETWEEN 0 AND 100)');

    // Tipos de movimiento nuevos: el CHECK obliga a reconstruir la tabla
    reconstruirTabla(db, 'movimientos_caja', (sql) => {
        if (sql.includes(`'propina'`)) {
            return sql;
        }

        const nuevo = sql.replace(`'ajuste'`, `'ajuste',\n            'propina',\n            'anulacion_propina'`);

        if (nuevo === sql) {
            throw new Error('No se encontró la lista de tipos de movimientos_caja para agregar propinas.');
        }

        return nuevo;
    });

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_ventas_turno_mesero
            ON ventas (id_turno_caja, id_mesero);
    `);
}

module.exports = {
    version: 7,
    nombre: 'Propinas por mesero (comidas y bares)',
    desactivarForeignKeys: true,
    up,
};
