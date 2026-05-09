const db = require('../../config/db');

function listarUsuarios() {
    return db
        .prepare(`
            SELECT
                u.id_usuario,
                u.nombre,
                u.correo,
                u.telefono,
                u.estado,
                u.ultimo_acceso_en,
                u.creado_en,
                (
                    SELECT GROUP_CONCAT(r.nombre, ', ')
                    FROM usuario_roles ur
                    INNER JOIN roles r
                        ON r.id_rol = ur.id_rol
                    WHERE ur.id_usuario = u.id_usuario
                ) AS roles_texto,
                (
                    SELECT r.nombre
                    FROM usuario_roles ur
                    INNER JOIN roles r
                        ON r.id_rol = ur.id_rol
                    WHERE ur.id_usuario = u.id_usuario
                    ORDER BY
                        CASE r.nombre
                            WHEN 'administrador' THEN 1
                            WHEN 'cajero' THEN 2
                            ELSE 9
                        END
                    LIMIT 1
                ) AS rol_principal
            FROM usuarios u
            WHERE u.eliminado_en IS NULL
            ORDER BY u.creado_en DESC
        `)
        .all();
}

function obtenerUsuarioPorId(idUsuario) {
    return db
        .prepare(`
            SELECT
                u.id_usuario,
                u.nombre,
                u.correo,
                u.telefono,
                u.estado,
                u.ultimo_acceso_en,
                u.creado_en,
                (
                    SELECT r.nombre
                    FROM usuario_roles ur
                    INNER JOIN roles r
                        ON r.id_rol = ur.id_rol
                    WHERE ur.id_usuario = u.id_usuario
                    ORDER BY
                        CASE r.nombre
                            WHEN 'administrador' THEN 1
                            WHEN 'cajero' THEN 2
                            ELSE 9
                        END
                    LIMIT 1
                ) AS rol_principal
            FROM usuarios u
            WHERE u.id_usuario = ?
              AND u.eliminado_en IS NULL
            LIMIT 1
        `)
        .get(idUsuario);
}

function buscarUsuarioPorCorreo(correo) {
    return db
        .prepare(`
            SELECT
                id_usuario,
                nombre,
                correo,
                estado
            FROM usuarios
            WHERE correo = ?
              AND eliminado_en IS NULL
            LIMIT 1
        `)
        .get(correo);
}

function listarRolesOperacion() {
    return db
        .prepare(`
            SELECT
                id_rol,
                nombre,
                descripcion
            FROM roles
            WHERE estado = 'activo'
              AND nombre IN ('administrador', 'cajero')
            ORDER BY
                CASE nombre
                    WHEN 'administrador' THEN 1
                    WHEN 'cajero' THEN 2
                    ELSE 9
                END
        `)
        .all();
}

function obtenerRolPorNombre(nombreRol) {
    return db
        .prepare(`
            SELECT
                id_rol,
                nombre
            FROM roles
            WHERE nombre = ?
              AND estado = 'activo'
            LIMIT 1
        `)
        .get(nombreRol);
}

function crearUsuario({ nombre, correo, telefono, contrasenaHash, estado, rol }) {
    const crear = db.transaction(() => {
        const resultadoUsuario = db
            .prepare(`
                INSERT INTO usuarios (
                    nombre,
                    correo,
                    contrasena_hash,
                    telefono,
                    estado
                ) VALUES (
                    @nombre,
                    @correo,
                    @contrasena_hash,
                    @telefono,
                    @estado
                )
            `)
            .run({
                nombre,
                correo,
                contrasena_hash: contrasenaHash,
                telefono,
                estado,
            });

        const idUsuario = resultadoUsuario.lastInsertRowid;
        const rolEncontrado = obtenerRolPorNombre(rol);

        if (!rolEncontrado) {
            throw new Error('No se encontró el rol seleccionado.');
        }

        db.prepare(`
            INSERT INTO usuario_roles (
                id_usuario,
                id_rol
            ) VALUES (
                @id_usuario,
                @id_rol
            )
        `).run({
            id_usuario: idUsuario,
            id_rol: rolEncontrado.id_rol,
        });

        return idUsuario;
    });

    return crear();
}

function actualizarUsuario({
    idUsuario,
    nombre,
    correo,
    telefono,
    estado,
    rol,
    contrasenaHash,
}) {
    const actualizar = db.transaction(() => {
        if (contrasenaHash) {
            db.prepare(`
                UPDATE usuarios
                SET
                    nombre = @nombre,
                    correo = @correo,
                    telefono = @telefono,
                    estado = @estado,
                    contrasena_hash = @contrasena_hash,
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id_usuario = @id_usuario
                  AND eliminado_en IS NULL
            `).run({
                id_usuario: idUsuario,
                nombre,
                correo,
                telefono,
                estado,
                contrasena_hash: contrasenaHash,
            });
        } else {
            db.prepare(`
                UPDATE usuarios
                SET
                    nombre = @nombre,
                    correo = @correo,
                    telefono = @telefono,
                    estado = @estado,
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id_usuario = @id_usuario
                  AND eliminado_en IS NULL
            `).run({
                id_usuario: idUsuario,
                nombre,
                correo,
                telefono,
                estado,
            });
        }

        const rolEncontrado = obtenerRolPorNombre(rol);

        if (!rolEncontrado) {
            throw new Error('No se encontró el rol seleccionado.');
        }

        db.prepare(`
            DELETE FROM usuario_roles
            WHERE id_usuario = ?
        `).run(idUsuario);

        db.prepare(`
            INSERT INTO usuario_roles (
                id_usuario,
                id_rol
            ) VALUES (
                @id_usuario,
                @id_rol
            )
        `).run({
            id_usuario: idUsuario,
            id_rol: rolEncontrado.id_rol,
        });
    });

    return actualizar();
}

function cambiarEstadoUsuario(idUsuario, estado) {
    return db
        .prepare(`
            UPDATE usuarios
            SET
                estado = @estado,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_usuario = @id_usuario
              AND eliminado_en IS NULL
        `)
        .run({
            id_usuario: idUsuario,
            estado,
        });
}

function usuarioTieneRol(idUsuario, rol) {
    const resultado = db
        .prepare(`
            SELECT
                ur.id_usuario_rol
            FROM usuario_roles ur
            INNER JOIN roles r
                ON r.id_rol = ur.id_rol
            WHERE ur.id_usuario = ?
              AND r.nombre = ?
              AND r.estado = 'activo'
            LIMIT 1
        `)
        .get(idUsuario, rol);

    return Boolean(resultado);
}

function contarAdministradoresActivos() {
    const resultado = db
        .prepare(`
            SELECT
                COUNT(DISTINCT u.id_usuario) AS total
            FROM usuarios u
            INNER JOIN usuario_roles ur
                ON ur.id_usuario = u.id_usuario
            INNER JOIN roles r
                ON r.id_rol = ur.id_rol
            WHERE u.estado = 'activo'
              AND u.eliminado_en IS NULL
              AND r.nombre = 'administrador'
              AND r.estado = 'activo'
        `)
        .get();

    return Number(resultado?.total || 0);
}

module.exports = {
    listarUsuarios,
    obtenerUsuarioPorId,
    buscarUsuarioPorCorreo,
    listarRolesOperacion,
    crearUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    usuarioTieneRol,
    contarAdministradoresActivos,
};