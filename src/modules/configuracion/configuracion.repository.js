const db = require('../../config/db');

function obtenerConfiguracion() {
    return db
        .prepare(`
      SELECT
        id_configuracion,
        nombre_negocio,
        nombre_comercial,
        tipo_documento,
        documento,
        direccion,
        telefono,
        correo,
        moneda,
        impuesto_por_defecto,
        mensaje_recibo,
        logo_url,
        estado,
        creado_en,
        actualizado_en
      FROM configuracion_negocio
      WHERE estado = 'activo'
      ORDER BY id_configuracion ASC
      LIMIT 1
    `)
        .get();
}

function actualizarConfiguracion(idConfiguracion, datos) {
    return db
        .prepare(`
      UPDATE configuracion_negocio
      SET
        nombre_negocio = @nombre_negocio,
        nombre_comercial = @nombre_comercial,
        tipo_documento = @tipo_documento,
        documento = @documento,
        direccion = @direccion,
        telefono = @telefono,
        correo = @correo,
        moneda = @moneda,
        impuesto_por_defecto = @impuesto_por_defecto,
        mensaje_recibo = @mensaje_recibo,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_configuracion = @id_configuracion
    `)
        .run({
            id_configuracion: idConfiguracion,
            ...datos,
        });
}

function registrarAuditoria(datos) {
    return db
        .prepare(`
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
        @accion,
        @tabla_afectada,
        @id_registro_afectado,
        @datos_anteriores,
        @datos_nuevos,
        @ip,
        @user_agent
      )
    `)
        .run(datos);
}

module.exports = {
    obtenerConfiguracion,
    actualizarConfiguracion,
    registrarAuditoria,
};