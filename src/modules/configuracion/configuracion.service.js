const configuracionRepository = require('./configuracion.repository');
const env = require('../../config/env');
const runtimeSecrets = require('../../config/runtime-secrets');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function convertirEntero(valor, valorPorDefecto = 0) {
    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        return valorPorDefecto;
    }

    return Math.max(0, Math.round(numero));
}

function obtenerConfiguracionNegocio() {
    const configuracion = configuracionRepository.obtenerConfiguracion();

    if (!configuracion) {
        return null;
    }

    return configuracion;
}

function obtenerSeguridadSoporte() {
    const claveDesdeEnv = Boolean(String(process.env.SUPPORT_BACKUP_KEY || '').trim());
    const estadoRuntime = runtimeSecrets.obtenerEstadoSecretosRuntime();
    const claveConfigurada = Boolean(env.backups.supportKey || estadoRuntime.clave_soporte);

    return {
        clave_configurada: claveConfigurada,
        origen: claveDesdeEnv ? 'variable_entorno' : 'runtime',
        permite_regenerar: !claveDesdeEnv,
        actualizado_en: estadoRuntime.actualizado_en || '',
    };
}

function validarDatosConfiguracion(datos) {
    const errores = [];

    if (!limpiarTexto(datos.nombre_negocio)) {
        errores.push('El nombre del negocio es obligatorio.');
    }

    if (!limpiarTexto(datos.moneda)) {
        errores.push('La moneda es obligatoria.');
    }

    const impuesto = convertirEntero(datos.impuesto_por_defecto, 0);

    if (impuesto < 0) {
        errores.push('El impuesto por defecto no puede ser negativo.');
    }

    return errores;
}

function prepararDatosConfiguracion(datos) {
    return {
        nombre_negocio: limpiarTexto(datos.nombre_negocio),
        nombre_comercial: limpiarTexto(datos.nombre_comercial),
        tipo_documento: limpiarTexto(datos.tipo_documento) || 'NIT',
        documento: limpiarTexto(datos.documento),
        direccion: limpiarTexto(datos.direccion),
        telefono: limpiarTexto(datos.telefono),
        correo: limpiarTexto(datos.correo).toLowerCase(),
        moneda: limpiarTexto(datos.moneda) || 'COP',
        impuesto_por_defecto: convertirEntero(datos.impuesto_por_defecto, 0),
        mensaje_recibo:
            limpiarTexto(datos.mensaje_recibo) || 'Gracias por su compra.',
    };
}

function actualizarConfiguracionNegocio({
    idConfiguracion,
    datosFormulario,
    usuario,
    ip,
    userAgent,
}) {
    const errores = validarDatosConfiguracion(datosFormulario);

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
        };
    }

    const configuracionAnterior =
        configuracionRepository.obtenerConfiguracion();

    if (!configuracionAnterior) {
        return {
            ok: false,
            mensaje: 'No existe configuración activa del negocio.',
        };
    }

    const datosLimpios = prepararDatosConfiguracion(datosFormulario);

    configuracionRepository.actualizarConfiguracion(
        idConfiguracion,
        datosLimpios
    );

    configuracionRepository.registrarAuditoria({
        id_usuario: usuario?.id_usuario || null,
        accion: 'actualizar_configuracion_negocio',
        tabla_afectada: 'configuracion_negocio',
        id_registro_afectado: idConfiguracion,
        datos_anteriores: JSON.stringify(configuracionAnterior),
        datos_nuevos: JSON.stringify(datosLimpios),
        ip: ip || 'local',
        user_agent: userAgent || '',
    });

    return {
        ok: true,
        mensaje: 'Configuración actualizada correctamente.',
    };
}

function regenerarClaveSoporte({ usuario, ip, userAgent }) {
    const claveDesdeEnv = Boolean(String(process.env.SUPPORT_BACKUP_KEY || '').trim());

    if (claveDesdeEnv) {
        return {
            ok: false,
            mensaje: 'La clave técnica está definida por variable de entorno y no se puede regenerar desde Configuración.',
        };
    }

    const resultado = runtimeSecrets.regenerarSupportBackupKey();

    env.backups.supportKey = resultado.clave_soporte;

    configuracionRepository.registrarAuditoria({
        id_usuario: usuario?.id_usuario || null,
        accion: 'regenerar_clave_soporte_backups',
        tabla_afectada: 'secretos_runtime',
        id_registro_afectado: null,
        datos_anteriores: JSON.stringify({
            clave_soporte: resultado.clave_anterior ? 'valor_anterior_oculto' : '',
        }),
        datos_nuevos: JSON.stringify({
            clave_soporte: 'valor_nuevo_oculto',
            ruta_archivo: resultado.ruta_archivo,
        }),
        ip: ip || 'local',
        user_agent: userAgent || '',
    });

    return {
        ok: true,
        mensaje: 'Clave técnica de soporte regenerada correctamente. La nueva clave quedó guardada en el archivo interno de secretos runtime.',
    };
}

module.exports = {
    obtenerConfiguracionNegocio,
    obtenerSeguridadSoporte,
    actualizarConfiguracionNegocio,
    regenerarClaveSoporte,
};