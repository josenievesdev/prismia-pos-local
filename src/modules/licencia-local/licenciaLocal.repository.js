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
                dias_gracia,
                plan,
                fecha_ultimo_uso,
                fecha_activacion,
                huella_equipo,
                codigo_activacion,
                codigo_firmado,
                firma_valida,
                origen_activacion,
                ultima_validacion_online,
                ultimo_intento_online,
                motivo_bloqueo,
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
                plan = 'prueba',
                fecha_inicio_prueba = @fecha_inicio_prueba,
                fecha_fin_prueba = @fecha_fin_prueba,
                motivo_bloqueo = NULL,
                actualizado_en = datetime('now', 'localtime')
            WHERE id_licencia = 1
        `)
        .run({
            fecha_inicio_prueba: fechaInicioPrueba,
            fecha_fin_prueba: fechaFinPrueba,
        });
}

function actualizarEstado({ estado, nota = '', motivoBloqueo = null }) {
    return db
        .prepare(`
            UPDATE licencia_local
            SET
                estado = @estado,
                nota = @nota,
                motivo_bloqueo = @motivo_bloqueo,
                actualizado_en = datetime('now', 'localtime')
            WHERE id_licencia = 1
        `)
        .run({
            estado,
            nota,
            motivo_bloqueo: motivoBloqueo,
        });
}

function actualizarUltimoUso({ fechaUltimoUso }) {
    return db
        .prepare(`
            UPDATE licencia_local
            SET
                fecha_ultimo_uso = @fecha_ultimo_uso,
                actualizado_en = datetime('now', 'localtime')
            WHERE id_licencia = 1
        `)
        .run({
            fecha_ultimo_uso: fechaUltimoUso,
        });
}

function bloquearPorManipulacionFecha({ fechaActual, fechaUltimoUso }) {
    return db
        .prepare(`
            UPDATE licencia_local
            SET
                estado = 'bloqueada',
                motivo_bloqueo = 'reloj_manipulado',
                nota = @nota,
                actualizado_en = datetime('now', 'localtime')
            WHERE id_licencia = 1
        `)
        .run({
            nota: `Se detectó posible manipulación de fecha. Fecha actual: ${fechaActual}. Último uso registrado: ${fechaUltimoUso}.`,
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
    actualizarUltimoUso,
    bloquearPorManipulacionFecha,
    registrarAuditoria,
};