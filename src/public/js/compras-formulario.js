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

        btnLimpiar: $('btnLimpiarCompra'),
        btnGuardar: $('btnGuardarCompra'),
    };

    if (!ui.form || !ui.lineasBody) {
        return;
    }

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
            ganancia_sobre_costo_porcentaje: 0,
            actualizar_precio_venta: false,
        });

        limpiarAlerta();
        renderizarLineas();
        limpiarBusquedaProducto();
    }

    function eliminarLinea(indice) {
        estado.lineas.splice(indice, 1);
        renderizarLineas();
    }

    function calcularLinea(linea) {
        const cantidad = limpiarNumero(linea.cantidad, 1);
        const costoUnitario = redondearDinero(linea.costo_unitario);
        const descuentoPorcentaje = Math.min(limpiarNumero(linea.descuento_porcentaje), 100);
        const porcentajeIva = normalizarPorcentajeIva(linea.porcentaje_iva);
        const gananciaPorcentaje = limpiarNumero(linea.ganancia_sobre_costo_porcentaje);

        const descuentoUnitario = costoUnitario * (descuentoPorcentaje / 100);
        const costoUnitarioNeto = Math.max(0, costoUnitario - descuentoUnitario);
        const ivaUnitario = costoUnitarioNeto * (porcentajeIva / 100);
        const costoUnitarioFinal = costoUnitarioNeto + ivaUnitario;

        const subtotalLinea = costoUnitarioNeto * cantidad;
        const descuentoLinea = descuentoUnitario * cantidad;
        const ivaLinea = ivaUnitario * cantidad;
        const totalLinea = costoUnitarioFinal * cantidad;
        const precioVentaSugerido = costoUnitarioFinal * (1 + gananciaPorcentaje / 100);

        return {
            cantidad,
            costoUnitario,
            descuentoPorcentaje,
            porcentajeIva,
            gananciaPorcentaje,
            descuentoLinea: redondearDinero(descuentoLinea),
            costoUnitarioNeto: redondearDinero(costoUnitarioNeto),
            ivaUnitario: redondearDinero(ivaUnitario),
            costoUnitarioFinal: redondearDinero(costoUnitarioFinal),
            subtotalLinea: redondearDinero(subtotalLinea),
            ivaLinea: redondearDinero(ivaLinea),
            totalLinea: redondearDinero(totalLinea),
            precioVentaSugerido: redondearDinero(precioVentaSugerido),
        };
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

    function renderizarLineas(foco = null) {
        ui.contadorLineas.textContent = String(estado.lineas.length);

        if (ui.btnGuardar) {
            ui.btnGuardar.disabled = estado.guardando || estado.lineas.length === 0;
        }

        if (!estado.lineas.length) {
            ui.lineasBody.innerHTML = `
    <tr class="ventas-cart-empty-row">
        <td colspan="7">
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

                return `
    <tr data-linea-index="${indice}">
        <td>
            <div class="ventas-cart-product compras-cart-product">
                <strong>${indice + 1}. ${escaparHtml(linea.nombre)}</strong>
                <small>
                    ${escaparHtml(linea.codigo_interno || 'Sin código')}
                    · ${escaparHtml(linea.unidad_abreviatura)}
                    · Venta actual: ${formatearMoneda(linea.precio_venta_actual)}
                </small>
            </div>

            <input type="hidden" name="lineas[${indice}][id_producto]" value="${linea.id_producto}">
            <input type="hidden" name="lineas[${indice}][costo_unitario_neto]" value="${calculo.costoUnitarioNeto}">
            <input type="hidden" name="lineas[${indice}][iva_unitario]" value="${calculo.ivaUnitario}">
            <input type="hidden" name="lineas[${indice}][costo_unitario_final]" value="${calculo.costoUnitarioFinal}">
            <input type="hidden" name="lineas[${indice}][subtotal_linea]" value="${calculo.subtotalLinea}">
            <input type="hidden" name="lineas[${indice}][iva_linea]" value="${calculo.ivaLinea}">
            <input type="hidden" name="lineas[${indice}][total_linea]" value="${calculo.totalLinea}">
            <input type="hidden" name="lineas[${indice}][precio_venta_sugerido]" value="${calculo.precioVentaSugerido}">
        </td>

        <td class="text-center">
            <input class="compras-line-input is-small text-center" type="number" min="0.001" step="0.001"
                data-index="${indice}" data-field="cantidad"
                name="lineas[${indice}][cantidad]" value="${linea.cantidad}">
        </td>

        <td class="text-right">
            <input class="compras-line-input text-right" type="number" min="0" step="1"
                data-index="${indice}" data-field="costo_unitario"
                name="lineas[${indice}][costo_unitario]" value="${linea.costo_unitario}">
        </td>

        <td class="text-center">
            <div class="compras-line-pair">
                <label>
                    <span>Desc.</span>
                    <input class="compras-line-input is-mini text-right" type="number" min="0" max="100" step="0.01"
                        data-index="${indice}" data-field="descuento_porcentaje"
                        name="lineas[${indice}][descuento_porcentaje]" value="${linea.descuento_porcentaje}">
                </label>

                <label>
                    <span>IVA</span>
                    <input class="compras-line-input is-mini text-right" type="number" min="0" max="100" step="0.01"
                        data-index="${indice}" data-field="porcentaje_iva"
                        name="lineas[${indice}][porcentaje_iva]" value="${linea.porcentaje_iva}">
                </label>
            </div>
        </td>

        <td class="text-right">
<strong data-calculo="costo_final">${formatearMoneda(calculo.costoUnitarioFinal)}</strong>
<small class="compras-line-muted" data-calculo="total_linea">
    Total: ${formatearMoneda(calculo.totalLinea)}
</small>
        </td>

        <td class="text-right">
<strong data-calculo="precio_sugerido">${formatearMoneda(calculo.precioVentaSugerido)}</strong>

            <div class="compras-price-tools">
                <label>
                    <span>Gan.</span>
                    <input class="compras-line-input is-mini text-right" type="number" min="0" step="0.01"
                        data-index="${indice}" data-field="ganancia_sobre_costo_porcentaje"
                        name="lineas[${indice}][ganancia_sobre_costo_porcentaje]"
                        value="${linea.ganancia_sobre_costo_porcentaje}">
                </label>

                <label class="compras-check-inline">
                    <input type="checkbox"
                        data-index="${indice}" data-field="actualizar_precio_venta"
                        name="lineas[${indice}][actualizar_precio_venta]"
                        ${linea.actualizar_precio_venta ? 'checked' : ''}>
                    <span>Actualizar</span>
                </label>
            </div>
        </td>

        <td class="text-center">
            <button type="button" class="ventas-cart-remove" data-remove-index="${indice}"
                aria-label="Quitar producto">
                ×
            </button>
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

        const fila = ui.lineasBody.querySelector(`[data-linea-index="${indice}"]`);

        if (!fila) {
            return;
        }

        const calculo = calcularLinea(linea);

        const costoFinal = fila.querySelector('[data-calculo="costo_final"]');
        const totalLinea = fila.querySelector('[data-calculo="total_linea"]');
        const precioSugerido = fila.querySelector('[data-calculo="precio_sugerido"]');

        const hiddenCostoNeto = fila.querySelector(`[name="lineas[${indice}][costo_unitario_neto]"]`);
        const hiddenIvaUnitario = fila.querySelector(`[name="lineas[${indice}][iva_unitario]"]`);
        const hiddenCostoFinal = fila.querySelector(`[name="lineas[${indice}][costo_unitario_final]"]`);
        const hiddenSubtotal = fila.querySelector(`[name="lineas[${indice}][subtotal_linea]"]`);
        const hiddenIvaLinea = fila.querySelector(`[name="lineas[${indice}][iva_linea]"]`);
        const hiddenTotalLinea = fila.querySelector(`[name="lineas[${indice}][total_linea]"]`);
        const hiddenPrecioSugerido = fila.querySelector(`[name="lineas[${indice}][precio_venta_sugerido]"]`);

        if (costoFinal) {
            costoFinal.textContent = formatearMoneda(calculo.costoUnitarioFinal);
        }

        if (totalLinea) {
            totalLinea.textContent = `Total: ${formatearMoneda(calculo.totalLinea)}`;
        }

        if (precioSugerido) {
            precioSugerido.textContent = formatearMoneda(calculo.precioVentaSugerido);
        }

        if (hiddenCostoNeto) hiddenCostoNeto.value = calculo.costoUnitarioNeto;
        if (hiddenIvaUnitario) hiddenIvaUnitario.value = calculo.ivaUnitario;
        if (hiddenCostoFinal) hiddenCostoFinal.value = calculo.costoUnitarioFinal;
        if (hiddenSubtotal) hiddenSubtotal.value = calculo.subtotalLinea;
        if (hiddenIvaLinea) hiddenIvaLinea.value = calculo.ivaLinea;
        if (hiddenTotalLinea) hiddenTotalLinea.value = calculo.totalLinea;
        if (hiddenPrecioSugerido) hiddenPrecioSugerido.value = calculo.precioVentaSugerido;
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

        if (campo === 'actualizar_precio_venta') {
            estado.lineas[indice][campo] = input.checked;
            renderizarLineas();
            return;
        }

        estado.lineas[indice][campo] = input.value;

        actualizarCalculosLinea(indice);
        renderizarTotales();
    }

    function construirPayloadCompra() {
        return {
            id_proveedor: ui.idProveedor.value,
            fecha_compra: document.getElementById('fechaCompra')?.value || '',
            tipo_soporte: document.getElementById('tipoSoporteCompra')?.value || 'factura_proveedor',
            numero_soporte: document.getElementById('numeroSoporteCompra')?.value || '',
            observaciones: document.getElementById('observacionesCompra')?.value || '',
            lineas: estado.lineas.map((linea) => {
                const calculo = calcularLinea(linea);

                return {
                    id_producto: linea.id_producto,
                    cantidad: linea.cantidad,
                    costo_unitario: linea.costo_unitario,
                    descuento_porcentaje: linea.descuento_porcentaje,
                    porcentaje_iva: linea.porcentaje_iva,
                    ganancia_sobre_costo_porcentaje: linea.ganancia_sobre_costo_porcentaje,

                    descuento_linea: calculo.descuentoLinea,
                    costo_unitario_neto: calculo.costoUnitarioNeto,
                    iva_unitario: calculo.ivaUnitario,
                    costo_unitario_final: calculo.costoUnitarioFinal,
                    subtotal_linea: calculo.subtotalLinea,
                    iva_linea: calculo.ivaLinea,
                    total_linea: calculo.totalLinea,

                    precio_venta_anterior: linea.precio_venta_actual,
                    precio_venta_sugerido: calculo.precioVentaSugerido,
                    actualizar_precio_venta: linea.actualizar_precio_venta ? 1 : 0,
                    precio_venta_nuevo: calculo.precioVentaSugerido,
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
        ocultarResultados(ui.resultadosProductos);
        limpiarAlerta();
        renderizarLineas();
    }

    cargarProveedoresIniciales();

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