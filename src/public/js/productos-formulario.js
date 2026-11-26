/**
 * Creador de productos: vista previa en vivo.
 *
 * Cada negocio calcula su precio a su manera; aquí solo se registra el precio
 * final (el que paga el cliente, con el IVA incluido si el negocio cobra IVA).
 * Esta pantalla informa, sin imponer un método: cuánto del precio es IVA,
 * cuánto se gana por unidad (como margen y sobre el costo) y si se vende a
 * pérdida. Las cuentas usan dinero-exacto, las mismas del POS y del servidor.
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
    const nombre = campo('nombre');
    const unidad = campo('id_unidad_medida');
    const foto = campo('imagen_producto');
    const controla = campo('controlaInventario');
    const conInventario = formulario.querySelector('[data-con-inventario]');
    const cobraIva = formulario.dataset.cobraIva === '1';

    const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
    const formatoPorcentaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
    const pesos = (valor) => (valor < 0 ? '− ' : '') + '$ ' + formato.format(Math.abs(valor));
    const porcentaje = (valor) => formatoPorcentaje.format(valor) + ' %';

    function entero(entrada) {
        return Math.max(0, Math.round(Number(entrada && entrada.value) || 0));
    }

    function tarifa() {
        return cobraIva && iva ? Math.max(0, Math.round(Number(iva.value) || 0)) : 0;
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

        // Cuánto del precio es IVA (solo si el negocio cobra IVA)
        poner('base', pesos(cuenta.base));
        poner('iva-etiqueta', cuenta.tarifa > 0 ? '+ IVA ' + cuenta.tarifa + ' %' : '+ IVA (sin IVA)');
        poner('iva', pesos(cuenta.iva));
        poner('precio', pesos(cuenta.total));

        // Ganancia: solo información, en las dos formas en que la piensan los negocios
        const lineaGanancia = ver('ganancia');
        const alerta = ver('alerta');
        const hayCuenta = cuenta.total > 0 && cuenta.costo > 0;

        if (lineaGanancia) {
            lineaGanancia.hidden = !hayCuenta || cuenta.ganancia < 0;
            lineaGanancia.textContent = hayCuenta && cuenta.ganancia >= 0
                ? 'Ganancia por unidad: ' + pesos(cuenta.ganancia)
                    + (cuenta.base > 0 ? ' · margen ' + porcentaje(cuenta.ganancia / cuenta.base * 100) : '')
                    + ' · ' + porcentaje(cuenta.ganancia / cuenta.costo * 100) + ' sobre el costo'
                : '';
        }

        if (alerta) {
            const pierde = hayCuenta && cuenta.ganancia < 0;
            alerta.hidden = !pierde;
            alerta.textContent = pierde ? 'Ojo: con este precio pierdes ' + pesos(-cuenta.ganancia) + ' por unidad.' : '';
        }

        // Vista previa: así se ve en el POS y en el ticket
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

    [precio, costo, nombre].forEach(function (entrada) {
        entrada?.addEventListener('input', dibujar);
    });
    iva?.addEventListener('change', dibujar);
    unidad?.addEventListener('change', dibujar);

    // "Usar el costo promedio" (edición): copia el costo real de las compras
    formulario.querySelector('[data-usar-costo]')?.addEventListener('click', function (evento) {
        costo.value = evento.currentTarget.dataset.usarCosto;
        dibujar();
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
