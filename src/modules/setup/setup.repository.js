const db = require('../../config/db');

function existeAdministradorActivo() {
    const administrador = db
        .prepare(`
            SELECT
                u.id_usuario
            FROM usuarios u
            INNER JOIN usuario_roles ur
                ON ur.id_usuario = u.id_usuario
            INNER JOIN roles r
                ON r.id_rol = ur.id_rol
            WHERE r.nombre = 'administrador'
              AND r.estado = 'activo'
              AND u.estado = 'activo'
              AND u.eliminado_en IS NULL
            LIMIT 1
        `)
        .get();

    return Boolean(administrador);
}

function buscarUsuarioPorCorreo(correo) {
    return db
        .prepare(`
            SELECT
                id_usuario,
                correo
            FROM usuarios
            WHERE correo = ?
              AND eliminado_en IS NULL
            LIMIT 1
        `)
        .get(correo);
}

function crearAdministradorInicial({ nombre, correo, contrasenaHash }) {
    const crear = db.transaction(() => {
        if (existeAdministradorActivo()) {
            throw new Error('Ya existe un usuario administrador activo.');
        }

        const rolAdministrador = db
            .prepare(`
                SELECT
                    id_rol
                FROM roles
                WHERE nombre = 'administrador'
                  AND estado = 'activo'
                LIMIT 1
            `)
            .get();

        if (!rolAdministrador) {
            throw new Error('No existe el rol administrador.');
        }

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
                    '',
                    'activo'
                )
            `)
            .run({
                nombre,
                correo,
                contrasena_hash: contrasenaHash,
            });

        const idUsuario = resultadoUsuario.lastInsertRowid;

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
            id_rol: rolAdministrador.id_rol,
        });

        db.prepare(`
            INSERT INTO auditoria (
                id_usuario,
                accion,
                tabla_afectada,
                id_registro_afectado,
                datos_anteriores,
                datos_nuevos,
                ip,
                user_agent
            ) VALUES (
                @id_usuario,
                'crear_administrador_inicial',
                'usuarios',
                @id_registro_afectado,
                NULL,
                @datos_nuevos,
                'local',
                'setup_inicial'
            )
        `).run({
            id_usuario: idUsuario,
            id_registro_afectado: idUsuario,
            datos_nuevos: JSON.stringify({
                nombre,
                correo,
                rol: 'administrador',
            }),
        });

        return {
            id_usuario: idUsuario,
            nombre,
            correo,
            roles: ['administrador'],
            rol_principal: 'administrador',
        };
    });

    return crear();
}

module.exports = {
    existeAdministradorActivo,
    buscarUsuarioPorCorreo,
    crearAdministradorInicial,
};