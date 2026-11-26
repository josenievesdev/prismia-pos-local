/**
 * Cálculo EXACTO de una línea de compra, compartido por el servidor (require)
 * y el formulario de compras (window.PrismiaCompras): la pantalla y lo que se
 * guarda siempre dan lo mismo.
 *
 * Todo en pesos enteros con dinero-exacto (redondeo medio hacia arriba, sin
 * decimales sueltos). Los porcentajes admiten dos decimales (5,5 % = 550
 * centésimas). Reglas:
 * - descuento por unidad = costo × % de descuento;
 * - costo neto = costo − descuento;
 * - subtotal de la línea = costo neto × cantidad;
 * - IVA de la línea = subtotal × % de IVA (como lo liquida la factura del proveedor);
 * - total de la línea = subtotal + IVA, siempre cuadra;
 * - costo final por unidad = costo neto + su IVA (costo de inventario si el
 *   negocio no es responsable de IVA);
 * - precio de venta sugerido = costo final × (1 + ganancia).
 */
(function (raiz, fabrica) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = fabrica(require('./dinero-exacto.js'));
    } else {
        raiz.PrismiaCompras = fabrica(raiz.PrismiaDinero);
    }
})(typeof window !== 'undefined' ? window : globalThis, function (dinero) {
    function numero(valor) {
        const convertido = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(convertido) ? Math.max(0, convertido) : 0;
    }

    function pesos(valor) {
        return Math.round(numero(valor));
    }

    /** Cantidad con hasta 3 decimales. */
    function cantidad(valor) {
        return Math.round(numero(valor) * 1000) / 1000;
    }

    /** % con hasta dos decimales, en centésimas (19 % -> 1900), máximo 100 %. */
    function centesimas(valor) {
        return Math.min(Math.round(numero(valor) * 100), 10000);
    }

    /** El IVA a veces llega como fracción (0,19): se lleva a porcentaje. */
    function centesimasIva(valor) {
        const porcentaje = numero(valor);
        return centesimas(porcentaje > 0 && porcentaje <= 1 ? porcentaje * 100 : porcentaje);
    }

    function porcentajeDe(valor, centesimasPorcentaje) {
        return dinero.dividirRedondeando(valor * centesimasPorcentaje, 10000);
    }

    function calcularLinea(linea) {
        const datos = linea || {};
        const cantidadLinea = cantidad(datos.cantidad);
        const costoUnitario = pesos(datos.costo_unitario);
        const descuento = centesimas(datos.descuento_porcentaje);
        const iva = centesimasIva(datos.porcentaje_iva);
        const ganancia = Math.round(numero(datos.ganancia_sobre_costo_porcentaje) * 100);

        const descuentoUnitario = porcentajeDe(costoUnitario, descuento);
        const costoUnitarioNeto = Math.max(0, costoUnitario - descuentoUnitario);
        const ivaUnitario = porcentajeDe(costoUnitarioNeto, iva);
        const costoUnitarioFinal = costoUnitarioNeto + ivaUnitario;

        const subtotalLinea = dinero.multiplicarPorCantidad(costoUnitarioNeto, cantidadLinea);
        const ivaLinea = porcentajeDe(subtotalLinea, iva);

        return {
            cantidad: cantidadLinea,
            costoUnitario,
            descuentoPorcentaje: descuento / 100,
            porcentajeIva: iva / 100,
            gananciaPorcentaje: ganancia / 100,
            descuentoUnitario,
            costoUnitarioNeto,
            ivaUnitario,
            costoUnitarioFinal,
            descuentoLinea: dinero.multiplicarPorCantidad(descuentoUnitario, cantidadLinea),
            subtotalLinea,
            ivaLinea,
            totalLinea: subtotalLinea + ivaLinea,
            precioVentaSugerido: dinero.dividirRedondeando(costoUnitarioFinal * (10000 + ganancia), 10000),
        };
    }

    return { calcularLinea };
});
