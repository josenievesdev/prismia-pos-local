/**
 * Registro ordenado de migraciones. Para agregar una nueva:
 *  1. Crea NNN_descripcion.js con { version: NNN, nombre, up(db) }.
 *  2. Agrégala al final de esta lista.
 * Nunca modifiques una migración ya publicada: crea una nueva.
 */
module.exports = [
    require('./001_reparar_totales_turnos'),
    require('./002_corregir_fechas_venta'),
    require('./003_permitir_stock_negativo'),
    require('./004_indices_rendimiento'),
    require('./005_cargar_divipola'),
    require('./006_licencia_local'),
    require('./007_propinas_meseros'),
    require('./008_iva_precio_final'),
];
