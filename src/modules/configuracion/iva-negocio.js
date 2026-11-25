/**
 * IVA del negocio (Configuración):
 * - Responsable de IVA: cada producto cobra el IVA que tenga (19 %, 5 % o sin IVA).
 * - No responsable: ninguna venta, cotización ni remisión lleva IVA. Un no
 *   responsable de IVA no puede cobrarlo. Las tarifas de los productos se
 *   conservan guardadas: si el negocio pasa a ser responsable, vuelven a aplicar.
 * - Sin definir (bases anteriores a la versión 9): todo sigue como antes y el
 *   Inicio pide definirlo.
 *
 * Compras no usa esta regla: el IVA que cobra el proveedor existe igual.
 */

const configuracionRepository = require('./configuracion.repository');

function estadoIvaNegocio() {
    const configuracion = configuracionRepository.obtenerConfiguracion() || {};
    const definido = Number(configuracion.iva_definido || 0) === 1;
    const responsable = Number(configuracion.maneja_iva || 0) === 1;

    return {
        definido,
        responsable,
        cobraIva: !definido || responsable,
    };
}

/** ¿Las ventas del negocio llevan IVA? (solo es "no" si el negocio dijo que no es responsable) */
function negocioCobraIva() {
    return estadoIvaNegocio().cobraIva;
}

module.exports = {
    estadoIvaNegocio,
    negocioCobraIva,
};
