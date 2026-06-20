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
                cliente_licencia,
                codigo_activacion,
                codigo_firmado,
                ultimo_nonce_licencia,
                fecha_emision_codigo,
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

function activarLicenciaFirmada({
    plan,
    fechaInicioPeriodo,
    fechaFinPeriodo,
    diasGracia,
    huellaEquipo,
    clienteLicencia,
    codigoActivacion,
    codigoFirmado,
    ultimoNonceLicencia,
    fechaEmisionCodigo,
    origenActivacion,
    nota,
}) {
    return db
        .prepare(`
            UPDATE licencia_local
            SET
                estado = 'activa',
                plan = @plan,
                fecha_inicio_periodo = @fecha_inicio_periodo,
                fecha_fin_periodo = @fecha_fin_periodo,
                dias_gracia = @dias_gracia,
                fecha_activacion = datetime('now', 'localtime'),
                huella_equipo = @huella_equipo,
                cliente_licencia = @cliente_licencia,
                codigo_activacion = @codigo_activacion,
                codigo_firmado = @codigo_firmado,
                ultimo_nonce_licencia = @ultimo_nonce_licencia,
                fecha_emision_codigo = @fecha_emision_codigo,
                firma_valida = 1,
                origen_activacion = @origen_activacion,
                motivo_bloqueo = NULL,
                nota = @nota,
                actualizado_en = datetime('now', 'localtime')
            WHERE id_licencia = 1
        `)
        .run({
            plan,
            fecha_inicio_periodo: fechaInicioPeriodo,
            fecha_fin_periodo: fechaFinPeriodo,
            dias_gracia: diasGracia,
            huella_equipo: huellaEquipo,
            cliente_licencia: clienteLicencia,
            codigo_activacion: codigoActivacion,
            codigo_firmado: codigoFirmado,
            ultimo_nonce_licencia: ultimoNonceLicencia,
            fecha_emision_codigo: fechaEmisionCodigo,
            origen_activacion: origenActivacion,
            nota,
        });
}

module.exports = {
    obtenerLicenciaLocal,
    actualizarInicioPrueba,
    actualizarEstado,
    actualizarUltimoUso,
    bloquearPorManipulacionFecha,
    registrarAuditoria,
    activarLicenciaFirmada,
};