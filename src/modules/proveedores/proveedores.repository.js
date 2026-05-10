const db = require('../../config/db');

function listarProveedores({ busqueda = '', estado = '', limite = 50, offset = 0 } = {}) {
    const filtros = ['eliminado_en IS NULL'];
    const parametros = {
        busqueda: `%${busqueda}%`,
        estado,
        limite,
        offset,
    };

    if (busqueda) {
        filtros.push(`
            (
                nombre_comercial LIKE @busqueda
                OR razon_social LIKE @busqueda
                OR documento LIKE @busqueda
                OR telefono LIKE @busqueda
                OR celular LIKE @busqueda
                OR correo LIKE @busqueda
                OR contacto_nombre LIKE @busqueda
            )
        `);
    }

    if (estado) {
        filtros.push('estado = @estado');
    }

    return db
        .prepare(`
            SELECT
                id_proveedor,
                nombre_comercial,
                razon_social,
                tipo_documento,
                documento,
                digito_verificacion,
                telefono,
                celular,
                correo,
                direccion,
                ciudad,
                departamento,
                contacto_nombre,
                contacto_telefono,
                observaciones,
                estado,
                creado_en,
                actualizado_en
            FROM proveedores
            WHERE ${filtros.join(' AND ')}
            ORDER BY
                CASE estado
                    WHEN 'activo' THEN 1
                    ELSE 2
                END,
                nombre_comercial ASC
            LIMIT @limite OFFSET @offset
        `)
        .all(parametros);
}

function contarProveedores({ busqueda = '', estado = '' } = {}) {
    const filtros = ['eliminado_en IS NULL'];
    const parametros = {
        busqueda: `%${busqueda}%`,
        estado,
    };

    if (busqueda) {
        filtros.push(`
            (
                nombre_comercial LIKE @busqueda
                OR razon_social LIKE @busqueda
                OR documento LIKE @busqueda
                OR telefono LIKE @busqueda
                OR celular LIKE @busqueda
                OR correo LIKE @busqueda
                OR contacto_nombre LIKE @busqueda
            )
        `);
    }

    if (estado) {
        filtros.push('estado = @estado');
    }

    const resultado = db
        .prepare(`
            SELECT COUNT(*) AS total
            FROM proveedores
            WHERE ${filtros.join(' AND ')}
        `)
        .get(parametros);

    return Number(resultado?.total || 0);
}

function obtenerProveedorPorId(idProveedor) {
    return db
        .prepare(`
            SELECT
                id_proveedor,
                nombre_comercial,
                razon_social,
                tipo_documento,
                documento,
                digito_verificacion,
                telefono,
                celular,
                correo,
                direccion,
                ciudad,
                departamento,
                contacto_nombre,
                contacto_telefono,
                observaciones,
                estado,
                creado_en,
                actualizado_en
            FROM proveedores
            WHERE id_proveedor = ?
              AND eliminado_en IS NULL
            LIMIT 1
        `)
        .get(idProveedor);
}

function obtenerProveedorPorDocumento({ tipoDocumento, documento }) {
    return db
        .prepare(`
            SELECT
                id_proveedor,
                nombre_comercial,
                tipo_documento,
                documento,
                estado
            FROM proveedores
            WHERE tipo_documento = @tipo_documento
              AND documento = @documento
              AND eliminado_en IS NULL
            LIMIT 1
        `)
        .get({
            tipo_documento: tipoDocumento,
            documento,
        });
}

function crearProveedor(datos) {
    const resultado = db
        .prepare(`
            INSERT INTO proveedores (
                nombre_comercial,
                razon_social,
                tipo_documento,
                documento,
                digito_verificacion,
                telefono,
                celular,
                correo,
                direccion,
                ciudad,
                departamento,
                contacto_nombre,
                contacto_telefono,
                observaciones,
                estado
            ) VALUES (
                @nombre_comercial,
                @razon_social,
                @tipo_documento,
                @documento,
                @digito_verificacion,
                @telefono,
                @celular,
                @correo,
                @direccion,
                @ciudad,
                @departamento,
                @contacto_nombre,
                @contacto_telefono,
                @observaciones,
                @estado
            )
        `)
        .run(datos);

    return resultado.lastInsertRowid;
}

function actualizarProveedor(idProveedor, datos) {
    return db
        .prepare(`
            UPDATE proveedores
            SET
                nombre_comercial = @nombre_comercial,
                razon_social = @razon_social,
                tipo_documento = @tipo_documento,
                documento = @documento,
                digito_verificacion = @digito_verificacion,
                telefono = @telefono,
                celular = @celular,
                correo = @correo,
                direccion = @direccion,
                ciudad = @ciudad,
                departamento = @departamento,
                contacto_nombre = @contacto_nombre,
                contacto_telefono = @contacto_telefono,
                observaciones = @observaciones,
                estado = @estado,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_proveedor = @id_proveedor
              AND eliminado_en IS NULL
        `)
        .run({
            id_proveedor: idProveedor,
            ...datos,
        });
}

function cambiarEstadoProveedor(idProveedor, estado) {
    return db
        .prepare(`
            UPDATE proveedores
            SET
                estado = @estado,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id_proveedor = @id_proveedor
              AND eliminado_en IS NULL
        `)
        .run({
            id_proveedor: idProveedor,
            estado,
        });
}

module.exports = {
    listarProveedores,
    contarProveedores,
    obtenerProveedorPorId,
    obtenerProveedorPorDocumento,
    crearProveedor,
    actualizarProveedor,
    cambiarEstadoProveedor,
};