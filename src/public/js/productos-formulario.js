/**
 * Formulario del producto: muestra en vivo cómo se separa el IVA del precio de venta.
 * El precio de venta es el precio final (IVA incluido); este cálculo es el mismo
 * que hacen el POS y el servidor (dinero-exacto), así que lo que se ve aquí es
 * lo que sale en el ticket.
 */
(function () {
    const precio = document.getElementById('precio_venta');
    const iva = document.getElementById('porcentaje_iva_visual');
    const desglose = document.querySelector('[data-desglose-iva]');
    const dinero = window.PrismiaDinero;

    if (!precio || !iva || !desglose || !dinero) {
        return;
    }

    const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
    const pesos = (valor) => '$ ' + formato.format(valor);

    function dibujar() {
        const valor = Math.max(0, Math.round(Number(precio.value) || 0));
        const porcentaje = Math.max(0, Math.round(Number(iva.value) || 0));

        if (!valor) {
            desglose.textContent = '—';
            return;
        }

        if (!porcentaje) {
            desglose.textContent = pesos(valor) + ' · sin IVA';
            return;
        }

        const partes = dinero.separarIvaIncluido(valor, porcentaje);
        desglose.textContent = 'Base ' + pesos(partes.base) + ' + IVA ' + porcentaje + ' % ' + pesos(partes.iva)
            + ' = ' + pesos(valor);
    }

    precio.addEventListener('input', dibujar);
    iva.addEventListener('change', dibujar);
    dibujar();
})();
