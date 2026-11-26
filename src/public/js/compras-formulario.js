(function () {
    const $ = (id) => document.getElementById(id);

    const ui = {
        form: $('formNuevaCompra'),
        alerta: $('alertaCompra'),

        proveedoresJson: $('proveedoresCompraJson'),
        buscarProveedor: $('buscarProveedorCompra'),
        resultadosProveedores: $('resultadosProveedoresCompra'),
        idProveedor: $('idProveedorCompra'),
        resumenProveedor: $('resumenProveedorCompra'),
        resumenProveedorInfo: $('resumenProveedorInfoCompra'),
        proveedorBox: $('proveedorSeleccionadoBox'),
        proveedorNombre: $('proveedorSeleccionadoNombre'),
        proveedorDetalle: $('proveedorSeleccionadoDetalle'),
        btnCambiarProveedor: $('btnCambiarProveedorCompra'),
        btnQuitarProveedor: $('btnQuitarProveedorCompra'),

        busquedaProducto: $('busquedaProductoCompra'),
        btnBuscarProducto: $('btnBuscarProductoCompra'),
        resultadosProductos: $('resultadosProductosCompra'),

        lineasBody: $('lineasCompraBody'),
        contadorLineas: $('contadorLineasCompra'),

        subtotalCompra: $('subtotalCompra'),
        descuentoCompra: $('descuentoCompra'),
        ivaCompra: $('ivaCompra'),
        totalCompra: $('totalCompra'),
        totalCompraPrincipal: $('totalCompraPrincipal'),

        fechaCompra: $('fechaCompra'),
        tipoSoporte: $('tipoSoporteCompra'),
        numeroSoporte: $('numeroSoporteCompra'),
        observaciones: $('observacionesCompra'),

        condicionPago: $('condicionPagoCompra'),
        medioPago: $('medioPagoCompra'),
        campoMedioPago: $('campoMedioPagoCompra'),
        referenciaPago: $('referenciaPagoCompra'),
        campoReferenciaPago: $('campoReferenciaPagoCompra'),
        fechaVencimiento: $('fechaVencimientoCompra'),
        campoFechaVencimiento: $('campoFechaVencimientoCompra'),
        resumenVencimiento: $('resumenVencimientoCompra'),

        btnLimpiar: $('btnLimpiarCompra'),
        btnGuardar: $('btnGuardarCompra'),
    };

    if (!ui.form || !ui.lineasBody) {
        return;
    }

    // Reglas de IVA del negocio (las mismas del servidor) para mostrar la ganancia de cada línea
    const esResponsableIva = ui.form.dataset.responsableIva === '1';
    const cobraIva = ui.form.dataset.cobraIva !== '0';

    const estado = {
        proveedor: null,
        proveedores: [],
        lineas: [],
        guardando: false,
        temporizadorProveedores: null,
        temporizadorProductos: null,
    };

    const formatoMoneda = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    });

    function cargarProveedoresIniciales() {
        try {
            estado.proveedores = JSON.parse(ui.proveedoresJson?.textContent || '[]');
        } catch (error) {
            estado.proveedores = [];
        }
    }

    function limpiarTexto(valor) {
        return String(valor || '').trim();
    }

    function limpiarNumero(valor, defecto = 0) {
        const numero = Number(String(valor || '').replace(',', '.'));

        if (!Number.isFinite(numero)) {
            return defecto;
        }

        return Math.max(0, numero);
    }

    function normalizarPorcentajeIva(valor, defecto = 0) {
        const numero = limpiarNumero(valor, defecto);

        if (numero > 0 && numero <= 1) {
            return Math.min(numero * 100, 100);
        }

        return Math.min(numero, 100);
    }

    function redondearDinero(valor) {
        return Math.round(limpiarNumero(valor));
    }

    function formatearMoneda(valor) {
        return formatoMoneda.format(redondearDinero(valor));
    }

    function esFechaISOValida(valor) {
        const texto = limpiarTexto(valor);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
            return false;
        }

        const [anio, mes, dia] = texto.split('-').map(Number);
        const fecha = new Date(anio, mes - 1, dia);

        return fecha.getFullYear() === anio
            && fecha.getMonth() === mes - 1
            && fecha.getDate() === dia;
    }

    function sumarDiasFechaISO(fechaISO, dias) {
        if (!esFechaISOValida(fechaISO)) {
            return '';
        }

        const [anio, mes, dia] = fechaISO.split('-').map(Number);
        const fecha = new Date(anio, mes - 1, dia);
        fecha.setDate(fecha.getDate() + Math.trunc(limpiarNumero(dias, 0)));

        const anioFinal = fecha.getFullYear();
        const mesFinal = String(fecha.getMonth() + 1).padStart(2, '0');
        const diaFinal = String(fecha.getDate()).padStart(2, '0');

        return `${anioFinal}-${mesFinal}-${diaFinal}`;
    }

    function formatearFechaCorta(fechaISO) {
        if (!esFechaISOValida(fechaISO)) {
            return 'Sin fecha válida';
        }

        const [anio, mes, dia] = fechaISO.split('-').map(Number);
        const fecha = new Date(anio, mes - 1, dia);

        return fecha.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    }

    function actualizarCamposPagoCompra({ sugerirVencimiento = false } = {}) {
        if (!ui.condicionPago) {
            return;
        }

        const condicionPago = ui.condicionPago.value || 'contado';
        const esCredito = condicionPago === 'credito';
        const fechaCompra = ui.fechaCompra?.value || '';

        if (ui.campoFechaVencimiento) {
            ui.campoFechaVencimiento.hidden = !esCredito;
        }

        if (ui.campoMedioPago) {
            ui.campoMedioPago.hidden = esCredito;
        }

        if (ui.campoReferenciaPago) {
            ui.campoReferenciaPago.hidden = esCredito;
        }

        if (!esCredito) {
            if (ui.fechaVencimiento) {
                ui.fechaVencimiento.value = fechaCompra;
            }

            if (ui.resumenVencimiento) {
                ui.resumenVencimiento.textContent = 'En contado queda pagada con vencimiento del mismo día.';
            }

            return;
        }

        if (ui.fechaVencimiento && sugerirVencimiento) {
            ui.fechaVencimiento.value = sumarDiasFechaISO(fechaCompra, 15);
        }

        if (ui.resumenVencimiento) {
            const fechaVencimiento = ui.fechaVencimiento?.value || '';

            ui.resumenVencimiento.textContent = fechaVencimiento
                ? `Quedará pendiente hasta ${formatearFechaCorta(fechaVencimiento)}.`
                : 'Selecciona la fecha de vencimiento de la compra.';
        }
    }

    function escaparHtml(valor) {
        return String(valor || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function ocultarResultados(contenedor) {
        if (!contenedor) return;

        contenedor.hidden = true;
        contenedor.innerHTML = '';
    }

    function limpiarBusquedaProducto() {
        ui.busquedaProducto.value = '';
        ocultarResultados(ui.resultadosProductos);
        ui.busquedaProducto.focus();
    }

    function mostrarAlerta(mensaje) {
        if (!ui.alerta) return;

        ui.alerta.textContent = mensaje;
        ui.alerta.hidden = false;
    }

    function limpiarAlerta() {
        if (!ui.alerta) return;

        ui.alerta.textContent = '';
        ui.alerta.hidden = true;
    }

    function obtenerNombreProveedor(proveedor) {
        return (
            limpiarTexto(proveedor.nombre_mostrar) ||
            limpiarTexto(proveedor.nombre_comercial) ||
            limpiarTexto(proveedor.razon_social) ||
            `Proveedor #${proveedor.id_proveedor}`
        );
    }

    function obtenerDetalleProveedor(proveedor) {
        return (
            limpiarTexto(proveedor.documento_mostrar) ||
            limpiarTexto(proveedor.documento) ||
            'Sin documento'
        );
    }

    function renderizarProveedores() {
        const termino = limpiarTexto(ui.buscarProveedor.value).toLowerCase();

        if (!termino) {
            ui.resultadosProveedores.innerHTML = `
                <div class="ventas-client-result-empty">
                    Escribe para buscar un proveedor.
                </div>
            `;
            ui.resultadosProveedores.hidden = false;
            return;
        }

        const resultados = estado.proveedores
            .filter((proveedor) => {
                const texto = [
                    proveedor.nombre_mostrar,
                    proveedor.nombre_comercial,
                    proveedor.razon_social,
                    proveedor.documento,
                    proveedor.documento_mostrar,
                ].join(' ').toLowerCase();

                return texto.includes(termino);
            })
            .slice(0, 20);

        ui.resultadosProveedores.innerHTML = '';

        if (!resultados.length) {
            ui.resultadosProveedores.innerHTML = `
                <div class="ventas-client-result-empty">
                    No se encontraron proveedores activos.
                </div>
            `;
            ui.resultadosProveedores.hidden = false;
            return;
        }

        resultados.forEach((proveedor) => {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'compras-provider-result-item';
            boton.dataset.proveedor = JSON.stringify(proveedor);

            boton.innerHTML = `
                <strong>${escaparHtml(obtenerNombreProveedor(proveedor))}</strong>
                <span>${escaparHtml(obtenerDetalleProveedor(proveedor))}</span>
            `;

            boton.addEventListener('click', function () {
                seleccionarProveedor(proveedor);
            });

            ui.resultadosProveedores.appendChild(boton);
        });

        ui.resultadosProveedores.hidden = false;
    }

    function seleccionarProveedor(proveedor) {
        estado.proveedor = proveedor;

        const nombre = obtenerNombreProveedor(proveedor);
        const detalle = obtenerDetalleProveedor(proveedor);

        ui.idProveedor.value = proveedor.id_proveedor;
        ui.buscarProveedor.value = nombre;
        ui.buscarProveedor.disabled = true;

        ui.resumenProveedor.textContent = nombre;
        ui.resumenProveedorInfo.textContent = nombre;

        ui.proveedorNombre.textContent = nombre;
        ui.proveedorDetalle.textContent = detalle;
        ui.proveedorBox.hidden = false;

        ocultarResultados(ui.resultadosProveedores);
        limpiarAlerta();
    }

    function limpiarProveedorSeleccionado({ enfocar = true } = {}) {
        estado.proveedor = null;

        ui.idProveedor.value = '';
        ui.buscarProveedor.disabled = false;
        ui.buscarProveedor.value = '';

        ui.resumenProveedor.textContent = 'Sin seleccionar';
        ui.resumenProveedorInfo.textContent = 'Sin seleccionar';

        ui.proveedorNombre.textContent = '';
        ui.proveedorDetalle.textContent = '';
        ui.proveedorBox.hidden = true;

        ocultarResultados(ui.resultadosProveedores);

        if (enfocar) {
            ui.buscarProveedor.focus();
        }
    }

    function cambiarProveedor() {
        limpiarProveedorSeleccionado({ enfocar: true });
        renderizarProveedores();
    }

    function quitarProveedor() {
        limpiarProveedorSeleccionado({ enfocar: false });
    }

    async function buscarProductos() {
        const busqueda = limpiarTexto(ui.busquedaProducto.value);

        ui.resultadosProductos.hidden = false;
        ui.resultadosProductos.innerHTML = `
            <div class="ventas-empty-results">
                <strong>Buscando productos</strong>
                <span>Un momento...</span>
            </div>
        `;

        try {
            const respuesta = await fetch(
                `/compras/api/productos/buscar?busqueda=${encodeURIComponent(busqueda)}`
            );

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                renderizarProductos([]);
                return;
            }

            renderizarProductos(datos.productos || []);
        } catch (error) {
            console.error('Error buscando productos:', error);
            renderizarProductos([]);
        }
    }

    function renderizarProductos(productos) {
        ui.resultadosProductos.innerHTML = '';

        if (!productos.length) {
            ui.resultadosProductos.innerHTML = `
                <div class="ventas-empty-results">
                    <strong>Sin resultados</strong>
                    <span>No se encontraron productos activos.</span>
                </div>
            `;
            ui.resultadosProductos.hidden = false;
            return;
        }

        productos.forEach((producto) => {
            const yaAgregado = estado.lineas.some(
                (linea) => Number(linea.id_producto) === Number(producto.id_producto)
            );

            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'compras-product-result-item';
            boton.disabled = yaAgregado;
            boton.dataset.producto = JSON.stringify(producto);

            boton.innerHTML = `
                <div>
                    <strong>${escaparHtml(producto.nombre)}</strong>
                    <span>
                        ${escaparHtml(producto.codigo_interno || 'Sin código')}
                        · Stock: ${escaparHtml(producto.stock_actual)}
                        ${escaparHtml(producto.unidad_abreviatura || 'und')}
                        · Costo ref: ${formatearMoneda(producto.costo_referencia_compra || producto.precio_costo || 0)}
                    </span>
                </div>

                <span class="compras-product-result-action">
                    ${yaAgregado ? 'Agregado' : 'Agregar'}
                </span>
            `;

            boton.addEventListener('click', function () {
                if (boton.disabled) return;

                agregarProducto(producto);
            });

            ui.resultadosProductos.appendChild(boton);
        });

        ui.resultadosProductos.hidden = false;
    }

    function agregarProducto(producto) {
        const existe = estado.lineas.some(
            (linea) => Number(linea.id_producto) === Number(producto.id_producto)
        );

        if (existe) {
            limpiarBusquedaProducto();
            return;
        }

        estado.lineas.push({
            id_producto: Number(producto.id_producto),
            codigo_interno: producto.codigo_interno || '',
            nombre: producto.nombre || '',
            unidad_abreviatura: producto.unidad_abreviatura || 'und',
            unidad_permite_decimales: Number(producto.unidad_permite_decimales || 0),
            cantidad: 1,
            costo_unitario: Number(producto.costo_referencia_compra || producto.precio_costo || 0),
            descuento_porcentaje: 0,
            porcentaje_iva: normalizarPorcentajeIva(producto.iva_compra_sugerido || 0),
            precio_venta_actual: Number(producto.precio_venta || 0),
            iva_venta: Number(producto.maneja_iva_venta || 0) === 1 ? Number(producto.porcentaje_iva_venta_visual || 0) : 0,
            precio_venta_nuevo: '',
        });

        limpiarAlerta();
        renderizarLineas();
        limpiarBusquedaProducto();
    }

    function eliminarLinea(indice) {
        estado.lineas.splice(indice, 1);
        renderizarLineas();
    }

    // El mismo cálculo exacto que usa el servidor (compras-calculo.js): lo que se ve es lo que se guarda
    function calcularLinea(linea) {
        return window.PrismiaCompras.calcularLinea({
            ...linea,
            cantidad: limpiarNumero(linea.cantidad, 1),
        });
    }

    function capturarFocoActual() {
        const activo = document.activeElement;

        if (!activo || !activo.dataset) {
            return null;
        }

        return {
            index: activo.dataset.index,
            field: activo.dataset.field,
            start: activo.selectionStart,
            end: activo.selectionEnd,
        };
    }

    function restaurarFoco(foco) {
        if (!foco || foco.index === undefined || !foco.field) {
            return;
        }

        const selector = `[data-index="${foco.index}"][data-field="${foco.field}"]`;
        const elemento = ui.lineasBody.querySelector(selector);

        if (!elemento) {
            return;
        }

        elemento.focus();

        if (
            typeof foco.start === 'number' &&
            typeof foco.end === 'number' &&
            typeof elemento.setSelectionRange === 'function'
        ) {
            try {
                elemento.setSelectionRange(foco.start, foco.end);
            } catch (error) {
                // Algunos inputs numéricos no permiten selección. El navegador, siempre tan colaborador.
            }
        }
    }

    const formatoPorcentaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
    const TARIFAS_IVA = [0, 5, 19];

    function opcionesIva(valor) {
        const actual = Math.round(limpiarNumero(valor));
        const tarifas = TARIFAS_IVA.includes(actual) ? TARIFAS_IVA : [...TARIFAS_IVA, actual];

        return tarifas.map((tarifa) => `<option value="${tarifa}" ${tarifa === actual ? 'selected' : ''}>${tarifa === 0 ? 'Sin IVA' : tarifa + ' %'}</option>`).join('');
    }

    // Lo que se gana por unidad al precio de venta (el nuevo si lo escriben), con el costo de esta compra.
    // Mismo criterio del servidor: si el negocio es responsable de IVA el costo va sin IVA; el precio
    // de venta lleva el IVA incluido si el negocio cobra IVA.
    function gananciaLinea(linea, calculo) {
        const precioNuevo = Math.round(limpiarNumero(linea.precio_venta_nuevo));
        const precio = precioNuevo > 0 ? precioNuevo : Math.round(limpiarNumero(linea.precio_venta_actual));

        if (!precio) {
            return null;
        }

        const ivaVenta = cobraIva ? Math.round(limpiarNumero(linea.iva_venta)) : 0;
        const base = ivaVenta > 0 ? window.PrismiaDinero.separarIvaIncluido(precio, ivaVenta).base : precio;
        const costo = esResponsableIva ? calculo.costoUnitarioNeto : calculo.costoUnitarioFinal;
        const ganancia = base - costo;

        return {
            precio,
            esNuevo: precioNuevo > 0,
            ganancia,
            margen: base > 0 ? ganancia / base * 100 : 0,
        };
    }

    function textoGanancia(linea, calculo) {
        const resultado = gananciaLinea(linea, calculo);

        if (!resultado) {
            return { texto: 'Producto sin precio de venta', pierde: false };
        }

        const precio = `${resultado.esNuevo ? 'Nuevo precio' : 'Precio de venta'} ${formatearMoneda(resultado.precio)}`;

        if (resultado.ganancia < 0) {
            return {
                texto: `${precio} · con este costo pierdes ${formatearMoneda(-resultado.ganancia)} por unidad`,
                pierde: true,
            };
        }

        return {
            texto: `${precio} · ganas ${formatearMoneda(resultado.ganancia)} por unidad (${formatoPorcentaje.format(resultado.margen)} %)`,
            pierde: false,
        };
    }

    function renderizarLineas(foco = null) {
        ui.contadorLineas.textContent = String(estado.lineas.length);

        if (ui.btnGuardar) {
            ui.btnGuardar.disabled = estado.guardando || estado.lineas.length === 0;
        }

        if (!estado.lineas.length) {
            ui.lineasBody.innerHTML = `
    <tr class="ventas-cart-empty-row">
        <td colspan="6">
            <div class="ventas-cart-empty">
                <strong>Compra vacía</strong>
                <span>Busca un producto y agrégalo a la compra.</span>
            </div>
        </td>
    </tr>
`;

            renderizarTotales();
            return;
        }

        ui.lineasBody.innerHTML = estado.lineas
            .map((linea, indice) => {
                const calculo = calcularLinea(linea);
                const ganancia = textoGanancia(linea, calculo);
                const pasoCantidad = Number(linea.unidad_permite_decimales || 0) === 1 ? '0.001' : '1';

                return `
    <tr class="compra-linea" data-linea-index="${indice}">
        <td class="centro compra-numero">${indice + 1}</td>
        <td>
            <div class="ventas-cart-product">
                <strong>${escaparHtml(linea.nombre)}</strong>
                <span>${escaparHtml(linea.codigo_interno || 'Sin código')} · ${escaparHtml(linea.unidad_abreviatura)}</span>
            </div>
        </td>
        <td class="centro">
            <input class="compra-campo compra-campo--cantidad" type="number" min="0.001" step="${pasoCantidad}" inputmode="decimal"
                data-index="${indice}" data-field="cantidad" value="${escaparHtml(linea.cantidad)}" aria-label="Cantidad">
        </td>
        <td class="num">
            <input class="compra-campo compra-campo--dinero" type="number" min="0" step="1" inputmode="numeric"
                data-index="${indice}" data-field="costo_unitario" value="${escaparHtml(linea.costo_unitario)}" aria-label="Costo unitario">
        </td>
        <td class="num"><strong data-calculo="total_linea">${formatearMoneda(calculo.totalLinea)}</strong></td>
        <td class="centro">
            <button type="button" class="ventas-cart-remove" data-remove-index="${indice}" aria-label="Quitar producto">✕</button>
        </td>
    </tr>
    <tr class="compra-linea-detalle" data-linea-precio="${indice}">
        <td></td>
        <td colspan="5">
            <div class="compra-detalle">
                <div class="compra-detalle-grupo">
                    <label class="compra-detalle-campo">
                        <span>Desc.</span>
                        <input class="compra-campo compra-campo--corto" type="number" min="0" max="100" step="0.01" inputmode="decimal"
                            data-index="${indice}" data-field="descuento_porcentaje" value="${escaparHtml(linea.descuento_porcentaje)}" placeholder="0" aria-label="Descuento en porcentaje">
                        <span>%</span>
                    </label>
                    <label class="compra-detalle-campo">
                        <span>IVA</span>
                        <select class="compra-campo compra-campo--iva" data-index="${indice}" data-field="porcentaje_iva" aria-label="IVA de la compra">
                            ${opcionesIva(linea.porcentaje_iva)}
                        </select>
                    </label>
                    <span class="compra-detalle-dato">Costo final c/u <b data-calculo="costo_final">${formatearMoneda(calculo.costoUnitarioFinal)}</b></span>
                </div>
                <div class="compra-detalle-grupo">
                    <span class="compra-precio-ganancia ${ganancia.pierde ? 'is-pierde' : ''}" data-calculo="ganancia">${escaparHtml(ganancia.texto)}</span>
                    <label class="compra-detalle-campo">
                        <span>Cambiar precio</span>
                        <input class="compra-campo compra-campo--dinero" type="number" min="0" step="1" inputmode="numeric"
                            data-index="${indice}" data-field="precio_venta_nuevo" value="${escaparHtml(linea.precio_venta_nuevo || '')}"
                            placeholder="${escaparHtml(linea.precio_venta_actual || '')}" aria-label="Nuevo precio de venta (opcional)">
                    </label>
                </div>
            </div>
        </td>
    </tr>
`;
            })
            .join('');

        renderizarTotales();
        restaurarFoco(foco);
    }

    function actualizarCalculosLinea(indice) {
        const linea = estado.lineas[indice];

        if (!linea) {
            return;
        }

        const calculo = calcularLinea(linea);
        const fila = ui.lineasBody.querySelector(`[data-linea-index="${indice}"]`);
        const filaPrecio = ui.lineasBody.querySelector(`[data-linea-precio="${indice}"]`);

        const costoFinal = filaPrecio?.querySelector('[data-calculo="costo_final"]');
        const totalLinea = fila?.querySelector('[data-calculo="total_linea"]');
        const ganancia = filaPrecio?.querySelector('[data-calculo="ganancia"]');

        if (costoFinal) {
            costoFinal.textContent = formatearMoneda(calculo.costoUnitarioFinal);
        }

        if (totalLinea) {
            totalLinea.textContent = formatearMoneda(calculo.totalLinea);
        }

        if (ganancia) {
            const resultado = textoGanancia(linea, calculo);
            ganancia.textContent = resultado.texto;
            ganancia.classList.toggle('is-pierde', resultado.pierde);
        }
    }

    function renderizarTotales() {
        const totales = estado.lineas.reduce(
            (acumulado, linea) => {
                const calculo = calcularLinea(linea);

                acumulado.subtotal += calculo.subtotalLinea;
                acumulado.descuento += calculo.descuentoLinea;
                acumulado.iva += calculo.ivaLinea;
                acumulado.total += calculo.totalLinea;

                return acumulado;
            },
            {
                subtotal: 0,
                descuento: 0,
                iva: 0,
                total: 0,
            }
        );

        ui.subtotalCompra.textContent = formatearMoneda(totales.subtotal);
        ui.descuentoCompra.textContent = formatearMoneda(totales.descuento);
        ui.ivaCompra.textContent = formatearMoneda(totales.iva);
        ui.totalCompra.textContent = formatearMoneda(totales.total);
        ui.totalCompraPrincipal.textContent = formatearMoneda(totales.total);
    }

    function actualizarLineaDesdeInput(input) {
        const indice = Number(input.dataset.index);
        const campo = input.dataset.field;

        if (!estado.lineas[indice] || !campo) {
            return;
        }

        estado.lineas[indice][campo] = input.value;

        actualizarCalculosLinea(indice);
        renderizarTotales();
    }

    function construirPayloadCompra() {
        return {
            id_proveedor: ui.idProveedor.value,
            fecha_compra: ui.fechaCompra?.value || '',
            tipo_soporte: ui.tipoSoporte?.value || 'factura_proveedor',
            numero_soporte: ui.numeroSoporte?.value || '',
            condicion_pago: ui.condicionPago?.value || 'contado',
            fecha_vencimiento: ui.fechaVencimiento?.value || '',
            observaciones: ui.observaciones?.value || '',
            id_medio_pago: (ui.condicionPago?.value || 'contado') === 'contado' ? (ui.medioPago?.value || '') : '',
            referencia_pago: (ui.condicionPago?.value || 'contado') === 'contado' ? (ui.referenciaPago?.value || '') : '',
            lineas: estado.lineas.map((linea) => {
                const calculo = calcularLinea(linea);
                const precioNuevo = Math.round(limpiarNumero(linea.precio_venta_nuevo));
                const cambiaPrecio = precioNuevo > 0 && precioNuevo !== Math.round(limpiarNumero(linea.precio_venta_actual));

                return {
                    id_producto: linea.id_producto,
                    cantidad: linea.cantidad,
                    costo_unitario: linea.costo_unitario,
                    descuento_porcentaje: linea.descuento_porcentaje,
                    porcentaje_iva: linea.porcentaje_iva,

                    descuento_linea: calculo.descuentoLinea,
                    costo_unitario_neto: calculo.costoUnitarioNeto,
                    iva_unitario: calculo.ivaUnitario,
                    costo_unitario_final: calculo.costoUnitarioFinal,
                    subtotal_linea: calculo.subtotalLinea,
                    iva_linea: calculo.ivaLinea,
                    total_linea: calculo.totalLinea,

                    precio_venta_anterior: linea.precio_venta_actual,
                    precio_venta_sugerido: calculo.precioVentaSugerido,
                    actualizar_precio_venta: cambiaPrecio ? 1 : 0,
                    precio_venta_nuevo: cambiaPrecio ? precioNuevo : 0,
                };
            }),
        };
    }

    async function guardarCompraEnBackend() {
        if (estado.guardando) {
            return;
        }

        estado.guardando = true;
        limpiarAlerta();

        if (ui.btnGuardar) {
            ui.btnGuardar.disabled = true;
            ui.btnGuardar.textContent = 'Guardando...';
        }

        try {
            const respuesta = await fetch('/compras', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(construirPayloadCompra()),
            });

            const resultado = await respuesta.json();

            if (!resultado.ok) {
                mostrarAlerta((resultado.errores || [resultado.mensaje || 'No se pudo registrar la compra.']).join(' '));

                estado.guardando = false;

                if (ui.btnGuardar) {
                    ui.btnGuardar.disabled = estado.lineas.length === 0;
                    ui.btnGuardar.textContent = 'Guardar compra';
                }

                return;
            }

            const mensaje = encodeURIComponent(resultado.mensaje || 'Compra registrada correctamente.');
            window.location.href = `/compras?exito=${mensaje}`;
        } catch (error) {
            console.error('Error guardando compra:', error);
            mostrarAlerta('No se pudo registrar la compra.');

            estado.guardando = false;

            if (ui.btnGuardar) {
                ui.btnGuardar.disabled = estado.lineas.length === 0;
                ui.btnGuardar.textContent = 'Guardar compra';
            }
        }
    }

    function limpiarCompra() {
        estado.lineas = [];
        limpiarProveedorSeleccionado({ enfocar: false });
        ui.busquedaProducto.value = '';

        if (ui.condicionPago) {
            ui.condicionPago.value = 'contado';
        }

        if (ui.fechaVencimiento) {
            ui.fechaVencimiento.value = ui.fechaCompra?.value || '';
        }

        if (ui.referenciaPago) {
            ui.referenciaPago.value = '';
        }

        // El medio vuelve al de por defecto (el que vino marcado al abrir la pantalla)
        if (ui.medioPago) {
            const porDefecto = ui.medioPago.querySelector('option[selected]') || ui.medioPago.options[0];
            if (porDefecto) {
                ui.medioPago.value = porDefecto.value;
            }
        }

        ocultarResultados(ui.resultadosProductos);
        limpiarAlerta();
        actualizarCamposPagoCompra({ sugerirVencimiento: true });
        renderizarLineas();
    }

    cargarProveedoresIniciales();
    actualizarCamposPagoCompra({ sugerirVencimiento: true });

    if (ui.fechaCompra) {
        ui.fechaCompra.addEventListener('change', function () {
            actualizarCamposPagoCompra({ sugerirVencimiento: true });
        });
    }

    if (ui.condicionPago) {
        ui.condicionPago.addEventListener('change', function () {
            actualizarCamposPagoCompra({ sugerirVencimiento: true });
        });
    }

    if (ui.fechaVencimiento) {
        ui.fechaVencimiento.addEventListener('change', function () {
            actualizarCamposPagoCompra();
        });
    }

    ui.buscarProveedor.addEventListener('input', function () {
        clearTimeout(estado.temporizadorProveedores);

        estado.temporizadorProveedores = setTimeout(function () {
            renderizarProveedores();
        }, 220);
    });

    ui.buscarProveedor.addEventListener('focus', function () {
        if (!estado.proveedor) {
            renderizarProveedores();
        }
    });

    if (ui.btnCambiarProveedor) {
        ui.btnCambiarProveedor.addEventListener('click', cambiarProveedor);
    }

    if (ui.btnQuitarProveedor) {
        ui.btnQuitarProveedor.addEventListener('click', quitarProveedor);
    }

    ui.btnBuscarProducto.addEventListener('click', buscarProductos);

    ui.busquedaProducto.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            buscarProductos();
        }
    });

    ui.busquedaProducto.addEventListener('input', function () {
        clearTimeout(estado.temporizadorProductos);

        estado.temporizadorProductos = setTimeout(function () {
            buscarProductos();
        }, 320);
    });

    ui.lineasBody.addEventListener('input', function (evento) {
        actualizarLineaDesdeInput(evento.target);
    });

    ui.lineasBody.addEventListener('change', function (evento) {
        actualizarLineaDesdeInput(evento.target);
    });

    ui.lineasBody.addEventListener('click', function (evento) {
        const boton = evento.target.closest('[data-remove-index]');

        if (!boton) {
            return;
        }

        eliminarLinea(Number(boton.dataset.removeIndex));
    });

    ui.btnLimpiar.addEventListener('click', limpiarCompra);

    ui.form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        guardarCompraEnBackend();
    });

    document.addEventListener('click', function (evento) {
        if (
            ui.resultadosProductos &&
            !ui.resultadosProductos.contains(evento.target) &&
            evento.target !== ui.busquedaProducto
        ) {
            ocultarResultados(ui.resultadosProductos);
        }

        if (
            ui.resultadosProveedores &&
            !ui.resultadosProveedores.contains(evento.target) &&
            evento.target !== ui.buscarProveedor
        ) {
            ocultarResultados(ui.resultadosProveedores);
        }
    });

    renderizarLineas();
    buscarProductos();
})();