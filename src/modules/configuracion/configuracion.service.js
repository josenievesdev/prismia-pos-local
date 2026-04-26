const configuracionRepository = require('./configuracion.repository');

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

module.exports = {
    obtenerConfiguracionNegocio,
    actualizarConfiguracionNegocio,
};