const db = require('../../config/db');

function obtenerLicenciaLocal() {
    return db
        .prepare(`
            SELECT
                id_licencia,
                estado,
                fecha_inicio_prueba,
                fecha_fin_prueba,
                fecha_inicio_periodo,
                fecha_fin_periodo,
                dias_prueba,
                codigo_activacion,
                nota,
                creado_en,
                actualizado_en
            FROM licencia_local
            WHERE id_licencia = 1
            LIMIT 1
        `)
        .get();
}

function actualizarInicioPrueba({ fechaInicioPrueba, fechaFinPrueba }) {
    return db
        .prepare(`
            UPDATE licencia_local
            SET
                estado = 'prueba',
                fecha_inicio_prueba = @fecha_inicio_prueba,
                fecha_fin_prueba = @fecha_fin_prueba,
                actualizado_en = datetime('now', 'localtime')
            WHERE id_licencia = 1
        `)
        .run({
            fecha_inicio_prueba: fechaInicioPrueba,
            fecha_fin_prueba: fechaFinPrueba,
        });
}

function actualizarEstado({ estado, nota = '' }) {
    return db
        .prepare(`
            UPDATE licencia_local
            SET
                estado = @estado,
                nota = @nota,
                actualizado_en = datetime('now', 'localtime')
            WHERE id_licencia = 1
        `)
        .run({
            estado,
            nota,
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
    obtenerLicenciaLocal,
    actualizarInicioPrueba,
    actualizarEstado,
    registrarAuditoria,
};