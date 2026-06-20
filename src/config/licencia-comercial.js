const numeroWhatsappSoporte = '573007102409';

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
    const cliente = limpiarLinea(datosLicencia.cliente_licencia, 'No registrado');
    const fechaFin = limpiarLinea(datosLicencia.fecha_fin_operativa);
    const diasRestantes = datosLicencia.dias_restantes ?? 'No disponible';
    const huellaEquipo = limpiarLinea(datosLicencia.huella_equipo_actual);

    return [
        'Hola, quiero activar o renovar Prismia POS Local.',
        '',
        `Estado actual: ${estado}`,
        `Plan: ${plan}`,
        `Cliente registrado: ${cliente}`,
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

    return `https://wa.me/${numeroWhatsappSoporte}?text=${encodeURIComponent(mensaje)}`;
}

module.exports = {
    numeroWhatsappSoporte,
    construirMensajePagoReactivacion,
    obtenerUrlWhatsappPago,
};