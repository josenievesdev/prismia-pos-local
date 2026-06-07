const numeroWhatsappSoporte = '573007102409';

const mensajePagoReactivacion = [
    'Hola, quiero reactivar Prismia POS Local.',
    'La prueba de mi sistema aparece vencida y quiero recibir información para pagar y activar el servicio.',
].join(' ');

function obtenerUrlWhatsappPago() {
    return `https://wa.me/${numeroWhatsappSoporte}?text=${encodeURIComponent(mensajePagoReactivacion)}`;
}

module.exports = {
    numeroWhatsappSoporte,
    mensajePagoReactivacion,
    obtenerUrlWhatsappPago,
};