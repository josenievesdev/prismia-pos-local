/**
 * Aritmética exacta de dinero compartida por servidor (require) y navegador
 * (window.PrismiaDinero). Una sola implementación: pantalla y servidor
 * siempre calculan el mismo total.
 */
(function (raiz) {
    /**
     * Aritmética de dinero EXACTA (solo enteros).
     *
     * Los pesos son enteros y las cantidades tienen hasta 3 decimales. Multiplicar
     * y dividir con decimales de JavaScript deja residuos (2.499 * 2.5 puede dar
     * 6247.499999...), y Math.round los redondea al lado equivocado. Aquí las
     * cantidades se pasan a milésimas enteras y toda división redondea
     * "medio hacia arriba" con enteros, sin números flotantes intermedios.
     */

    /** División entera con redondeo medio hacia arriba (n >= 0, d > 0). */
    function dividirRedondeando(numerador, denominador) {
        return Math.floor((2 * numerador + denominador) / (2 * denominador));
    }

    /** 2.5 -> 2500. Redondea a la milésima más cercana. */
    function cantidadAMilesimas(cantidad) {
        // Una cantidad de 3 decimales por 1000 queda a ~1e-10 de un entero: round es exacto.
        return Math.round(Number(cantidad) * 1000);
    }

    /** precio (pesos enteros) × cantidad (hasta 3 decimales) -> pesos enteros. */
    function multiplicarPorCantidad(precio, cantidad) {
        const producto = Math.round(precio) * cantidadAMilesimas(cantidad);

        if (!Number.isSafeInteger(producto)) {
            throw new Error('El valor de la línea es demasiado grande.');
        }

        return producto >= 0
            ? dividirRedondeando(producto, 1000)
            : -dividirRedondeando(-producto, 1000);
    }

    /** Separa un valor con IVA incluido en { base, iva } (porcentaje entero). */
    function separarIvaIncluido(valorConIva, porcentaje) {
        const base = dividirRedondeando(valorConIva * 100, 100 + porcentaje);

        return { base, iva: valorConIva - base };
    }

    /** IVA de una base sin impuesto (porcentaje entero). */
    function calcularIva(base, porcentaje) {
        return dividirRedondeando(base * porcentaje, 100);
    }


    const api = {
        dividirRedondeando,
        cantidadAMilesimas,
        multiplicarPorCantidad,
        separarIvaIncluido,
        calcularIva,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        raiz.PrismiaDinero = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
