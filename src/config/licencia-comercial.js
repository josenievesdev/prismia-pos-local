const numeroWhatsappActivacionPrismia = '573215394234';

// Alias de compatibilidad.
// Se conserva este nombre por si algún módulo existente lo importa todavía.
const numeroWhatsappSoporte = numeroWhatsappActivacionPrismia;

function limpiarLinea(valor, respaldo = 'No disponible') {
    const texto = String(valor || '').trim();

    if (!texto) {
        return respaldo;
    }

    return texto;
}

function construirMensajePagoReactivacion(datosLicencia = {}) {
    const estado = limpiarLinea(datosLicencia.estado_operativo);
    const plan = limpiarLinea(datosLicencia.plan);
    const negocioLocal = limpiarLinea(datosLicencia.nombre_negocio_local, 'No registrado');
    const cliente = limpiarLinea(
        datosLicencia.cliente_licencia_resuelto || datosLicencia.cliente_licencia,
        negocioLocal
    );
    const documentoNegocio = limpiarLinea(datosLicencia.documento_negocio_local, 'No registrado');
    const telefonoNegocio = limpiarLinea(datosLicencia.telefono_negocio_local, 'No registrado');
    const fechaFin = limpiarLinea(datosLicencia.fecha_fin_operativa);
    const diasRestantes = datosLicencia.dias_restantes ?? 'No disponible';
    const huellaEquipo = limpiarLinea(datosLicencia.huella_equipo_actual);

    return [
        'Hola, quiero activar o renovar Prismia POS Local.',
        '',
        `Negocio local: ${negocioLocal}`,
        `Cliente de licencia: ${cliente}`,
        `Documento/NIT: ${documentoNegocio}`,
        `Teléfono negocio: ${telefonoNegocio}`,
        `Estado actual: ${estado}`,
        `Plan: ${plan}`,
        `Fecha de vencimiento: ${fechaFin}`,
        `Días restantes: ${diasRestantes}`,
        '',
        `Huella del equipo: ${huellaEquipo}`,
        '',
        'Quedo atento al proceso de pago y activación.',
    ].join('\n');
}

function obtenerUrlWhatsappPago(datosLicencia = {}) {
    const mensaje = construirMensajePagoReactivacion(datosLicencia);

    return `https://wa.me/${numeroWhatsappActivacionPrismia}?text=${encodeURIComponent(mensaje)}`;
}

module.exports = {
    numeroWhatsappActivacionPrismia,
    numeroWhatsappSoporte,
    construirMensajePagoReactivacion,
    obtenerUrlWhatsappPago,
};