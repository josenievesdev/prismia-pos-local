const db = require('../../config/db');

function buscarUsuarioPorCorreo(correo) {
    return db
        .prepare(`
      SELECT
        id_usuario,
        nombre,
        correo,
        contrasena_hash,
        estado
      FROM usuarios
      WHERE correo = ?
        AND eliminado_en IS NULL
      LIMIT 1
    `)
        .get(correo);
}

function obtenerRolesPorUsuario(idUsuario) {
    return db
        .prepare(`
      SELECT
        r.nombre
      FROM usuario_roles ur
      INNER JOIN roles r
        ON r.id_rol = ur.id_rol
      WHERE ur.id_usuario = ?
        AND r.estado = 'activo'
    `)
        .all(idUsuario)
        .map((rol) => rol.nombre);
}

function actualizarUltimoAcceso(idUsuario) {
    return db
        .prepare(`
      UPDATE usuarios
      SET ultimo_acceso_en = CURRENT_TIMESTAMP,
          actualizado_en = CURRENT_TIMESTAMP
      WHERE id_usuario = ?
    `)
        .run(idUsuario);
}

module.exports = {
    buscarUsuarioPorCorreo,
    obtenerRolesPorUsuario,
    actualizarUltimoAcceso,
};