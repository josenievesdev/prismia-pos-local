/**
 * Creador de productos: calculadora de precio y vista previa en vivo.
 *
 * Como en Siigo: costo + ganancia + IVA = precio de venta. El precio de venta
 * es el precio final (IVA incluido) y es lo único que se guarda; la ganancia
 * es una ayuda para calcularlo. Las cuentas usan dinero-exacto, las mismas
 * del POS y del servidor: lo que se ve aquí es lo que sale en el ticket.
 */
(function () {
    const formulario = document.querySelector('.producto-creador');
    const dinero = window.PrismiaDinero;

    if (!formulario || !dinero) {
        return;
    }

    const campo = (id) => document.getElementById(id);
    const ver = (clave) => formulario.querySelector('[data-ver="' + clave + '"]');

    const costo = campo('precio_costo');
    const precio = campo('precio_venta');
    const iva = campo('porcentaje_iva_visual');
    const ganancia = campo('gananciaProducto');
    const nombre = campo('nombre');
    const unidad = campo('id_unidad_medida');
    const foto = campo('imagen_producto');
    const controla = campo('controlaInventario');
    const conInventario = formulario.querySelector('[data-con-inventario]');
    const cobraIva = formulario.dataset.cobraIva === '1';

    const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
    const formatoPorcentaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
    const pesos = (valor) => (valor < 0 ? '− ' : '') + '$ ' + formato.format(Math.abs(valor));

    // Quién manda: si el usuario escribió la ganancia, el precio la sigue; si escribió el precio, se respeta
    let manda = Number(precio.value) > 0 ? 'precio' : 'ganancia';

    function entero(entrada) {
        return Math.max(0, Math.round(Number(entrada && entrada.value) || 0));
    }

    function tarifa() {
        return cobraIva && iva ? Math.max(0, Math.round(Number(iva.value) || 0)) : 0;
    }

    // costo + ganancia = base; base + IVA = precio de venta
    function precioDesdeGanancia() {
        const porcentaje = Number(ganancia.value);

        if (ganancia.value === '' || !Number.isFinite(porcentaje) || porcentaje < 0 || entero(costo) <= 0) {
            return null;
        }

        const base = Math.round(entero(costo) * (100 + porcentaje) / 100);
        return base + dinero.calcularIva(base, tarifa());
    }

    function desglose() {
        const total = entero(precio);
        const porcentajeIva = tarifa();
        const partes = porcentajeIva > 0 ? dinero.separarIvaIncluido(total, porcentajeIva) : { base: total, iva: 0 };
        const valorCosto = entero(costo);

        return {
            total,
            base: partes.base,
            iva: partes.iva,
            tarifa: porcentajeIva,
            costo: valorCosto,
            ganancia: partes.base - valorCosto,
        };
    }

    function abreviaturaUnidad() {
        const opcion = unidad && unidad.selectedOptions && unidad.selectedOptions[0];
        return (opcion && opcion.dataset.abreviatura) || 'und';
    }

    function iniciales(texto) {
        const partes = String(texto || 'P').trim().split(/\s+/);
        return (((partes[0] || 'P').charAt(0)) + ((partes[1] || '').charAt(0))).toUpperCase();
    }

    function poner(clave, texto) {
        const elemento = ver(clave);

        if (elemento) {
            elemento.textContent = texto;
        }
    }

    function dibujar() {
        const cuenta = desglose();
        const porcentajeGanancia = cuenta.costo > 0 ? cuenta.ganancia / cuenta.costo * 100 : null;

        poner('costo', pesos(cuenta.costo));
        poner('ganancia', pesos(cuenta.ganancia)
            + (porcentajeGanancia !== null && cuenta.total > 0
                ? ' · ' + (porcentajeGanancia < 0 ? '−' : '') + formatoPorcentaje.format(Math.abs(porcentajeGanancia)) + ' %'
                : ''));
        poner('iva-etiqueta', cuenta.tarifa > 0 ? '+ IVA ' + cuenta.tarifa + ' %' : '+ IVA (sin IVA)');
        poner('iva', pesos(cuenta.iva));
        poner('precio', pesos(cuenta.total));

        // La ganancia refleja el precio escrito (sin pisar lo que el usuario está escribiendo)
        if (manda === 'precio' && document.activeElement !== ganancia) {
            ganancia.value = porcentajeGanancia !== null && cuenta.total > 0
                ? String(Math.round(porcentajeGanancia * 10) / 10)
                : '';
        }

        const alerta = ver('alerta');

        if (alerta) {
            const pierde = cuenta.total > 0 && cuenta.costo > 0 && cuenta.ganancia < 0;
            alerta.hidden = !pierde;
            alerta.textContent = pierde ? 'Ojo: con este precio pierdes ' + pesos(-cuenta.ganancia) + ' por unidad.' : '';
        }

        // Vista previa
        poner('nombre', nombre.value.trim() || 'Nombre del producto');
        poner('precio-pos', pesos(cuenta.total));
        poner('unidad', abreviaturaUnidad());
        poner('t-subtotal', pesos(cuenta.base));
        poner('t-iva-etiqueta', cuenta.tarifa > 0 ? 'IVA ' + cuenta.tarifa + ' %' : 'IVA');
        poner('t-iva', pesos(cuenta.iva));
        poner('t-total', pesos(cuenta.total));

        const vistaFoto = ver('foto');

        if (vistaFoto && !vistaFoto.querySelector('img')) {
            vistaFoto.innerHTML = '';
            const letras = document.createElement('span');
            letras.textContent = iniciales(nombre.value);
            vistaFoto.appendChild(letras);
        }
    }

    function recalcularPrecio() {
        const nuevo = precioDesdeGanancia();

        if (nuevo !== null) {
            precio.value = String(nuevo);
        }
    }

    ganancia.addEventListener('input', function () {
        manda = 'ganancia';
        recalcularPrecio();
        dibujar();
    });

    precio.addEventListener('input', function () {
        manda = 'precio';
        dibujar();
    });

    costo.addEventListener('input', function () {
        if (manda === 'ganancia') {
            recalcularPrecio();
        }

        dibujar();
    });

    if (iva) {
        iva.addEventListener('change', function () {
            if (manda === 'ganancia') {
                recalcularPrecio();
            }

            dibujar();
        });
    }

    nombre.addEventListener('input', dibujar);
    unidad?.addEventListener('change', dibujar);

    // "Usar el costo promedio" (edición): copia el costo real de las compras
    formulario.querySelector('[data-usar-costo]')?.addEventListener('click', function (evento) {
        costo.value = evento.currentTarget.dataset.usarCosto;
        costo.dispatchEvent(new Event('input', { bubbles: true }));
        costo.focus();
    });

    // Inventario: sin control de stock no se piden cantidades
    controla?.addEventListener('change', function () {
        if (conInventario) {
            conInventario.hidden = !controla.checked;
        }
    });

    // Foto: se ve antes de guardar
    foto?.addEventListener('change', function () {
        const archivo = foto.files && foto.files[0];

        if (!archivo || !/^image\//.test(archivo.type)) {
            return;
        }

        const direccion = URL.createObjectURL(archivo);

        [ver('foto'), ver('foto-grande')].forEach(function (contenedor) {
            if (!contenedor) {
                return;
            }

            contenedor.innerHTML = '';
            const imagen = document.createElement('img');
            imagen.src = direccion;
            imagen.alt = '';
            contenedor.appendChild(imagen);
        });
    });

    dibujar();
})();
