const db = require('../../config/db');

function construirWhereClientes(filtros = {}) {
    const condiciones = ['c.eliminado_en IS NULL'];
    const parametros = {};

    if (filtros.busqueda) {
        condiciones.push(`
            (
                c.nombre LIKE @busqueda
                OR c.razon_social LIKE @busqueda
                OR c.nombre_comercial LIKE @busqueda
                OR c.documento LIKE @busqueda
                OR c.telefono LIKE @busqueda
                OR c.celular LIKE @busqueda
                OR c.correo LIKE @busqueda
                OR c.correo_facturacion LIKE @busqueda
            )
        `);

        parametros.busqueda = `%${filtros.busqueda}%`;
    }

    if (filtros.estado) {
        condiciones.push('c.estado = @estado');
        parametros.estado = filtros.estado;
    }

    if (filtros.tipo_cliente) {
        condiciones.push('c.tipo_cliente = @tipo_cliente');
        parametros.tipo_cliente = filtros.tipo_cliente;
    }

    if (filtros.tipo_documento) {
        condiciones.push('c.tipo_documento = @tipo_documento');
        parametros.tipo_documento = filtros.tipo_documento;
    }

    return {
        where: condiciones.join(' AND '),
        parametros,
    };
}

function contarClientes(filtros = {}) {
    const { where, parametros } = construirWhereClientes(filtros);

    const resultado = db
        .prepare(`
            SELECT COUNT(*) AS total
            FROM clientes c
            WHERE ${where}
        `)
        .get(parametros);

    return Number(resultado?.total || 0);
}

function listarClientes(filtros = {}) {
    const { where, parametros } = construirWhereClientes(filtros);

    return db
        .prepare(`
            SELECT
                c.*
            FROM clientes c
            WHERE ${where}
            ORDER BY
                c.es_consumidor_final DESC,
                c.nombre COLLATE NOCASE ASC,
                c.id_cliente ASC
            LIMIT @limite
            OFFSET @offset
        `)
        .all({
            ...parametros,
            limite: filtros.limite,
            offset: filtros.offset,
        });
}

function obtenerClientePorId(idCliente) {
    return db
        .prepare(`
            SELECT *
            FROM clientes
            WHERE id_cliente = ?
              AND eliminado_en IS NULL
            LIMIT 1
        `)
        .get(idCliente);
}

function obtenerClientePorDocumento(tipoDocumento, documento) {
    return db
        .prepare(`
            SELECT *
            FROM clientes
            WHERE tipo_documento = ?
              AND documento = ?
              AND eliminado_en IS NULL
            LIMIT 1
        `)
        .get(tipoDocumento, documento);
}

function existeDocumentoEnOtroCliente({
    id_cliente = null,
    tipo_documento,
    documento,
}) {
    const resultado = db
        .prepare(`
            SELECT id_cliente
            FROM clientes
            WHERE tipo_documento = @tipo_documento
              AND documento = @documento
              AND eliminado_en IS NULL
              AND es_consumidor_final = 0
              AND (@id_cliente IS NULL OR id_cliente <> @id_cliente)
            LIMIT 1
        `)
        .get({
            id_cliente,
            tipo_documento,
            documento,
        });

    return Boolean(resultado);
}

function crearCliente(datos) {
    const resultado = db
        .prepare(`
            INSERT INTO clientes (
                tipo_cliente,
                tipo_documento,
                documento,
                digito_verificacion,
                nombre,
                razon_social,
                nombre_comercial,
                primer_nombre,
                segundo_nombre,
                primer_apellido,
                segundo_apellido,
                telefono,
                celular,
                correo,
                correo_facturacion,
                direccion,
                pais,
                codigo_pais,
                departamento,
                codigo_departamento,
                municipio,
                codigo_municipio,
                barrio,
                codigo_postal,
                regimen_fiscal,
                responsabilidades_fiscales_json,
                obligado_facturar,
                acepta_factura_electronica,
                autoriza_tratamiento_datos,
                contacto_nombre,
                contacto_cargo,
                observaciones,
                observaciones_facturacion,
                es_consumidor_final,
                estado
            ) VALUES (
                @tipo_cliente,
                @tipo_documento,
                @documento,
                @digito_verificacion,
                @nombre,
                @razon_social,
                @nombre_comercial,
                @primer_nombre,
                @segundo_nombre,
                @primer_apellido,
                @segundo_apellido,
                @telefono,
                @celular,
                @correo,
                @correo_facturacion,
                @direccion,
                @pais,
                @codigo_pais,
                @departamento,
                @codigo_departamento,
                @municipio,
                @codigo_municipio,
                @barrio,
                @codigo_postal,
                @regimen_fiscal,
                @responsabilidades_fiscales_json,
                @obligado_facturar,
                @acepta_factura_electronica,
                @autoriza_tratamiento_datos,
                @contacto_nombre,
                @contacto_cargo,
                @observaciones,
                @observaciones_facturacion,
                0,
                'activo'
            )
        `)
        .run(datos);

    return obtenerClientePorId(resultado.lastInsertRowid);
}

function actualizarCliente(idCliente, datos) {
    db.prepare(`
        UPDATE clientes
        SET
            tipo_cliente = @tipo_cliente,
            tipo_documento = @tipo_documento,
            documento = @documento,
            digito_verificacion = @digito_verificacion,
            nombre = @nombre,
            razon_social = @razon_social,
            nombre_comercial = @nombre_comercial,
            primer_nombre = @primer_nombre,
            segundo_nombre = @segundo_nombre,
            primer_apellido = @primer_apellido,
            segundo_apellido = @segundo_apellido,
            telefono = @telefono,
            celular = @celular,
            correo = @correo,
            correo_facturacion = @correo_facturacion,
            direccion = @direccion,
            pais = @pais,
            codigo_pais = @codigo_pais,
            departamento = @departamento,
            codigo_departamento = @codigo_departamento,
            municipio = @municipio,
            codigo_municipio = @codigo_municipio,
            barrio = @barrio,
            codigo_postal = @codigo_postal,
            regimen_fiscal = @regimen_fiscal,
            responsabilidades_fiscales_json = @responsabilidades_fiscales_json,
            obligado_facturar = @obligado_facturar,
            acepta_factura_electronica = @acepta_factura_electronica,
            autoriza_tratamiento_datos = @autoriza_tratamiento_datos,
            contacto_nombre = @contacto_nombre,
            contacto_cargo = @contacto_cargo,
            observaciones = @observaciones,
            observaciones_facturacion = @observaciones_facturacion,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_cliente = @id_cliente
          AND eliminado_en IS NULL
    `).run({
        id_cliente: idCliente,
        ...datos,
    });

    return obtenerClientePorId(idCliente);
}

function cambiarEstadoCliente(idCliente, estado) {
    db.prepare(`
        UPDATE clientes
        SET estado = ?,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_cliente = ?
          AND es_consumidor_final = 0
          AND eliminado_en IS NULL
    `).run(estado, idCliente);

    return obtenerClientePorId(idCliente);
}

module.exports = {
    contarClientes,
    listarClientes,
    obtenerClientePorId,
    obtenerClientePorDocumento,
    existeDocumentoEnOtroCliente,
    crearCliente,
    actualizarCliente,
    cambiarEstadoCliente,
};