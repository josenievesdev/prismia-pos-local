const db = require('../../config/db');

function listarMeseros({ soloActivos = false } = {}) {
    return db
        .prepare(`
            SELECT id_mesero, nombre, estado, creado_en, actualizado_en
            FROM meseros
            ${soloActivos ? "WHERE estado = 'activo'" : ''}
            ORDER BY CASE WHEN estado = 'activo' THEN 0 ELSE 1 END, nombre COLLATE NOCASE ASC
        `)
        .all();
}

function obtenerMeseroPorId(idMesero) {
    return db
        .prepare('SELECT id_mesero, nombre, estado FROM meseros WHERE id_mesero = ?')
        .get(idMesero);
}

function obtenerMeseroPorNombre(nombre) {
    return db
        .prepare('SELECT id_mesero, nombre, estado FROM meseros WHERE nombre = ? COLLATE NOCASE')
        .get(nombre);
}

function crearMesero(nombre) {
    const resultado = db
        .prepare(`INSERT INTO meseros (nombre, estado) VALUES (?, 'activo')`)
        .run(nombre);

    return Number(resultado.lastInsertRowid);
}

function cambiarEstadoMesero(idMesero, estado) {
    return db
        .prepare(`
            UPDATE meseros
            SET estado = @estado, actualizado_en = CURRENT_TIMESTAMP
            WHERE id_mesero = @id_mesero
        `)
        .run({ id_mesero: idMesero, estado }).changes;
}

function obtenerPorcentajePropinaSugerido() {
    const fila = db
        .prepare(`
            SELECT propina_porcentaje_sugerido
            FROM configuracion_negocio
            WHERE estado = 'activo'
            ORDER BY id_configuracion ASC
            LIMIT 1
        `)
        .get();

    return fila ? Number(fila.propina_porcentaje_sugerido) : 10;
}

function guardarPorcentajePropinaSugerido(porcentaje) {
    return db
        .prepare(`
            UPDATE configuracion_negocio
            SET propina_porcentaje_sugerido = ?, actualizado_en = CURRENT_TIMESTAMP
            WHERE estado = 'activo'
        `)
        .run(porcentaje).changes;
}

module.exports = {
    listarMeseros,
    obtenerMeseroPorId,
    obtenerMeseroPorNombre,
    crearMesero,
    cambiarEstadoMesero,
    obtenerPorcentajePropinaSugerido,
    guardarPorcentajePropinaSugerido,
};
