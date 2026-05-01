(function () {
    const estado = {
        cliente: null,
        items: new Map(),
        temporizadorClientes: null,
        temporizadorProductos: null,
    };

    function $(id) {
        return document.getElementById(id);
    }

    function dinero(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(Number(valor || 0));
    }

    function numero(valor, defecto = 0) {
        const resultado = Number(valor);

        if (!Number.isFinite(resultado)) {
            return defecto;
        }

        return resultado;
    }

    function entero(valor, defecto = 0) {
        return Math.round(numero(valor, defecto));
    }

    function limpiarTexto(valor) {
        return String(valor || '').trim();
    }

    function debounce(callback, delay = 280) {
        return function (...args) {
            clearTimeout(callback._timer);
            callback._timer = setTimeout(function () {
                callback(...args);
            }, delay);
        };
    }

    function obtenerUi() {
        return {
            form: $('formNuevaCotizacion'),

            buscarCliente: $('buscarClienteCotizacion'),
            resultadosClientes: $('resultadosClientesCotizacion'),
            clienteBox: $('clienteSeleccionadoBox'),
            clienteNombre: $('clienteSeleccionadoNombre'),
            clienteDetalle: $('clienteSeleccionadoDetalle'),
            btnQuitarCliente: $('btnQuitarClienteCotizacion'),

            btnAbrirClienteRapido: $('btnAbrirClienteRapidoCotizacion'),
            modalClienteRapido: $('modalClienteRapidoCotizacion'),
            formClienteRapido: $('formClienteRapidoCotizacion'),
            btnCerrarClienteRapido: $('btnCerrarClienteRapidoCotizacion'),
            btnCancelarClienteRapido: $('btnCancelarClienteRapidoCotizacion'),
            avisoClienteRapido: $('avisoClienteRapidoCotizacion'),
            tipoDocumentoClienteRapido: $('clienteRapidoCotizacionTipoDocumento'),
            documentoClienteRapido: $('clienteRapidoCotizacionDocumento'),
            campoDvClienteRapido: $('campoClienteRapidoCotizacionDv'),
            dvClienteRapido: $('clienteRapidoCotizacionDv'),
            nombreClienteRapido: $('clienteRapidoCotizacionNombre'),
            celularClienteRapido: $('clienteRapidoCotizacionCelular'),
            correoClienteRapido: $('clienteRapidoCotizacionCorreo'),
            autorizaClienteRapido: $('clienteRapidoCotizacionAutoriza'),
            btnGuardarClienteRapido: $('btnGuardarClienteRapidoCotizacion'),

            buscarProducto: $('buscarProductoCotizacion'),
            btnBuscarProducto: $('btnBuscarProductoCotizacion'),
            resultadosProductos: $('resultadosProductosCotizacion'),
            itemsContenedor: $('itemsCotizacion'),
            totalItems: $('totalItemsCotizacion'),

            validezDias: $('validezDiasCotizacion'),
            condiciones: $('condicionesCotizacion'),
            observaciones: $('observacionesCotizacion'),

            resumenCliente: $('resumenClienteCotizacion'),
            resumenClienteInfo: $('resumenClienteInfoCotizacion'),
            resumenSubtotal: $('resumenSubtotalCotizacion'),
            resumenDescuento: $('resumenDescuentoCotizacion'),
            resumenIva: $('resumenIvaCotizacion'),
            resumenTotal: $('resumenTotalCotizacion'),
            resumenCosto: $('resumenCostoCotizacion'),
            resumenUtilidad: $('resumenUtilidadCotizacion'),

            alerta: $('alertaCotizacion'),
            btnGuardar: $('btnGuardarCotizacion'),
        };
    }

    function mostrarAlerta(ui, mensaje) {
        if (!ui.alerta) return;

        ui.alerta.textContent = mensaje;
        ui.alerta.hidden = false;
    }

    function limpiarAlerta(ui) {
        if (!ui.alerta) return;

        ui.alerta.textContent = '';
        ui.alerta.hidden = true;
    }

    function ocultarResultados(contenedor) {
        if (!contenedor) return;

        contenedor.hidden = true;
        contenedor.innerHTML = '';
    }

    function obtenerNombreCliente(cliente) {
        return (
            limpiarTexto(cliente.nombre_mostrar)
            || limpiarTexto(cliente.nombre)
            || limpiarTexto(cliente.razon_social)
            || limpiarTexto(cliente.nombre_comercial)
            || `Cliente #${cliente.id_cliente}`
        );
    }

    function seleccionarCliente(cliente, ui) {
        estado.cliente = cliente;

        const nombre = obtenerNombreCliente(cliente);
        const detalle = cliente.texto_secundario || cliente.etiqueta_documento || cliente.documento || '';

        ui.buscarCliente.value = nombre;
        ui.buscarCliente.disabled = true;

        ui.clienteNombre.textContent = nombre;
        ui.clienteDetalle.textContent = detalle;
        ui.clienteBox.hidden = false;

        ui.resumenCliente.textContent = nombre;

        if (ui.resumenClienteInfo) {
            ui.resumenClienteInfo.textContent = nombre;
        }

        ocultarResultados(ui.resultadosClientes);
        limpiarAlerta(ui);
    }

    function quitarCliente(ui) {
        estado.cliente = null;

        ui.buscarCliente.disabled = false;
        ui.buscarCliente.value = '';
        ui.clienteBox.hidden = true;
        ui.clienteNombre.textContent = '';
        ui.clienteDetalle.textContent = '';
        ui.resumenCliente.textContent = 'Sin seleccionar';

        if (ui.resumenClienteInfo) {
            ui.resumenClienteInfo.textContent = 'Sin seleccionar';
        }

        ui.buscarCliente.focus();
    }

    function renderClientes(clientes, ui) {
        if (!ui.resultadosClientes) return;

        ui.resultadosClientes.innerHTML = '';

        if (!clientes.length) {
            ui.resultadosClientes.innerHTML = `
                <div class="cotizaciones-search-empty">
                    No se encontraron clientes activos.
                </div>
            `;
            ui.resultadosClientes.hidden = false;
            return;
        }

        clientes.forEach(function (cliente) {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'cotizaciones-result-item';

            const nombre = obtenerNombreCliente(cliente);
            const detalle = cliente.texto_secundario || cliente.etiqueta_documento || cliente.documento || '';

            boton.innerHTML = `
                <strong>${nombre}</strong>
                <span>${detalle}</span>
            `;

            boton.addEventListener('click', function () {
                seleccionarCliente(cliente, ui);
            });

            ui.resultadosClientes.appendChild(boton);
        });

        ui.resultadosClientes.hidden = false;
    }

    async function buscarClientes(ui) {
        const termino = limpiarTexto(ui.buscarCliente.value);

        if (termino.length < 1) {
            ocultarResultados(ui.resultadosClientes);
            return;
        }

        try {
            const respuesta = await fetch(`/cotizaciones/api/clientes/buscar?busqueda=${encodeURIComponent(termino)}`);
            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                renderClientes([], ui);
                return;
            }

            renderClientes(datos.clientes || [], ui);
        } catch (error) {
            console.error('Error buscando clientes:', error);
            renderClientes([], ui);
        }
    }

    function obtenerNombreProducto(producto) {
        return limpiarTexto(producto.nombre) || `Producto #${producto.id_producto}`;
    }

    function renderProductos(productos, ui) {
        if (!ui.resultadosProductos) return;

        ui.resultadosProductos.innerHTML = '';

        if (!productos.length) {
            ui.resultadosProductos.innerHTML = `
                <div class="cotizaciones-search-empty">
                    No se encontraron productos activos.
                </div>
            `;
            ui.resultadosProductos.hidden = false;
            return;
        }

        productos.forEach(function (producto) {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'cotizaciones-product-result-item';

            boton.innerHTML = `
                <div>
                    <strong>${obtenerNombreProducto(producto)}</strong>
                    <span>${producto.codigo_interno || 'Sin código'} · Stock ref: ${producto.stock_actual ?? 0} ${producto.unidad_abreviatura || 'und'}</span>
                </div>
                <strong>${dinero(producto.precio_venta)}</strong>
            `;

            boton.addEventListener('click', function () {
                agregarProducto(producto, ui);
            });

            ui.resultadosProductos.appendChild(boton);
        });

        ui.resultadosProductos.hidden = false;
    }

    async function buscarProductos(ui) {
        const termino = limpiarTexto(ui.buscarProducto.value);

        if (termino.length < 1) {
            ocultarResultados(ui.resultadosProductos);
            return;
        }

        try {
            const respuesta = await fetch(`/cotizaciones/api/productos/buscar?busqueda=${encodeURIComponent(termino)}`);
            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                renderProductos([], ui);
                return;
            }

            renderProductos(datos.productos || [], ui);
        } catch (error) {
            console.error('Error buscando productos:', error);
            renderProductos([], ui);
        }
    }

    function agregarProducto(producto, ui) {
        const idProducto = Number(producto.id_producto);

        if (!idProducto) return;

        const existente = estado.items.get(idProducto);

        if (existente) {
            existente.cantidad = Math.round((existente.cantidad + 1) * 1000) / 1000;
            estado.items.set(idProducto, existente);
        } else {
            estado.items.set(idProducto, {
                producto,
                cantidad: 1,
            });
        }

        ui.buscarProducto.value = '';
        ocultarResultados(ui.resultadosProductos);
        renderItems(ui);
        limpiarAlerta(ui);
    }

    function quitarProducto(idProducto, ui) {
        estado.items.delete(Number(idProducto));
        renderItems(ui);
    }

    function actualizarCantidad(idProducto, cantidad, ui) {
        const item = estado.items.get(Number(idProducto));

        if (!item) return;

        const cantidadNormalizada = numero(cantidad);

        if (cantidadNormalizada <= 0) {
            item.cantidad = 1;
        } else {
            item.cantidad = Math.round(cantidadNormalizada * 1000) / 1000;
        }

        estado.items.set(Number(idProducto), item);
        renderItems(ui);
    }

    function calcularLinea(producto, cantidad) {
        const precioUnitario = entero(producto.precio_venta);
        const costoUnitario = entero(
            producto.precio_costo_referencia
            || producto.costo_promedio
            || producto.ultimo_costo
            || producto.precio_costo
        );

        const brutoLinea = Math.round(precioUnitario * cantidad);

        const manejaIva = entero(producto.maneja_iva) === 1;
        const porcentajeIva = entero(producto.porcentaje_iva);
        const precioIncluyeIva = entero(producto.precio_incluye_iva) === 1;

        let subtotal = brutoLinea;
        let impuestoTotal = 0;
        let totalLinea = brutoLinea;

        if (manejaIva && porcentajeIva > 0) {
            const tasa = porcentajeIva / 100;

            if (precioIncluyeIva) {
                subtotal = Math.round(brutoLinea / (1 + tasa));
                impuestoTotal = brutoLinea - subtotal;
                totalLinea = brutoLinea;
            } else {
                impuestoTotal = Math.round(subtotal * tasa);
                totalLinea = subtotal + impuestoTotal;
            }
        }

        const costoTotal = Math.round(costoUnitario * cantidad);
        const utilidadBruta = subtotal - costoTotal;

        return {
            subtotal,
            descuento_total: 0,
            impuesto_total: impuestoTotal,
            total_linea: totalLinea,
            costo_total: costoTotal,
            utilidad_bruta: utilidadBruta,
        };
    }

    function calcularResumen() {
        const resumen = {
            subtotal: 0,
            descuento_total: 0,
            impuesto_total: 0,
            total: 0,
            total_costo: 0,
            utilidad_bruta: 0,
        };

        estado.items.forEach(function (item) {
            const linea = calcularLinea(item.producto, item.cantidad);

            resumen.subtotal += linea.subtotal;
            resumen.descuento_total += linea.descuento_total;
            resumen.impuesto_total += linea.impuesto_total;
            resumen.total += linea.total_linea;
            resumen.total_costo += linea.costo_total;
            resumen.utilidad_bruta += linea.utilidad_bruta;
        });

        return resumen;
    }

    function renderItems(ui) {
        ui.itemsContenedor.innerHTML = '';

        if (!estado.items.size) {
            ui.itemsContenedor.innerHTML = `
            <tr class="ventas-cart-empty-row">
                <td colspan="7">
                    <div class="ventas-cart-empty">
                        <strong>Cotización vacía</strong>
                        <span>Busca un producto y agrégalo a la cotización.</span>
                    </div>
                </td>
            </tr>
        `;

            ui.totalItems.textContent = '0';
            actualizarResumen(ui);
            return;
        }

        let indice = 1;

        estado.items.forEach(function (item, idProducto) {
            const producto = item.producto;
            const linea = calcularLinea(producto, item.cantidad);

            const fila = document.createElement('tr');

            fila.innerHTML = `
            <td class="text-center ventas-col-item">
                ${indice}
            </td>

            <td>
                <div class="ventas-cart-product">
                    <strong>${obtenerNombreProducto(producto)}</strong>
                    <span>
                        ${producto.codigo_interno || 'Sin código'}
                        · ${producto.unidad_abreviatura || 'und'}
                        · Stock ref: ${producto.stock_actual ?? 0}
                    </span>
                </div>
            </td>

            <td class="text-center">
                <input
                    type="number"
                    class="cotizaciones-table-qty"
                    min="0.001"
                    step="${entero(producto.permite_cantidad_decimal) === 1 ? '0.001' : '1'}"
                    value="${item.cantidad}"
                    data-id-producto="${idProducto}"
                >
            </td>

            <td class="text-right">
                ${dinero(producto.precio_venta)}
            </td>

            <td class="text-right">
                ${dinero(linea.impuesto_total)}
            </td>

            <td class="text-right">
                <strong>${dinero(linea.total_linea)}</strong>
            </td>

            <td class="text-center">
                <button type="button" class="ventas-cart-remove cotizaciones-item-remove" data-id-producto="${idProducto}">
                    Quitar
                </button>
            </td>
        `;

            ui.itemsContenedor.appendChild(fila);
            indice += 1;
        });

        ui.itemsContenedor.querySelectorAll('.cotizaciones-table-qty').forEach(function (input) {
            input.addEventListener('change', function () {
                actualizarCantidad(input.dataset.idProducto, input.value, ui);
            });
        });

        ui.itemsContenedor.querySelectorAll('.cotizaciones-item-remove').forEach(function (boton) {
            boton.addEventListener('click', function () {
                quitarProducto(boton.dataset.idProducto, ui);
            });
        });

        ui.totalItems.textContent = String(estado.items.size);
        actualizarResumen(ui);
    }

    function actualizarResumen(ui) {
        const resumen = calcularResumen();

        ui.resumenSubtotal.textContent = dinero(resumen.subtotal);
        ui.resumenDescuento.textContent = dinero(resumen.descuento_total);
        ui.resumenIva.textContent = dinero(resumen.impuesto_total);
        ui.resumenTotal.textContent = dinero(resumen.total);
        ui.resumenCosto.textContent = dinero(resumen.total_costo);
        ui.resumenUtilidad.textContent = dinero(resumen.utilidad_bruta);

        ui.resumenUtilidad.classList.toggle('cotizaciones-profit-negative', resumen.utilidad_bruta < 0);
        ui.resumenUtilidad.classList.toggle('cotizaciones-profit-positive', resumen.utilidad_bruta >= 0);
    }

    function construirPayload(ui) {
        if (!estado.cliente?.id_cliente) {
            return {
                ok: false,
                mensaje: 'Selecciona un cliente para la cotización.',
            };
        }

        if (!estado.items.size) {
            return {
                ok: false,
                mensaje: 'Agrega al menos un producto a la cotización.',
            };
        }

        const items = Array.from(estado.items.values()).map(function (item) {
            return {
                id_producto: item.producto.id_producto,
                cantidad: item.cantidad,
            };
        });

        return {
            ok: true,
            datos: {
                id_cliente: estado.cliente.id_cliente,
                validez_dias: ui.validezDias.value || 15,
                condiciones_comerciales: ui.condiciones.value,
                observaciones: ui.observaciones.value,
                items,
            },
        };
    }

    async function guardarCotizacion(ui) {
        limpiarAlerta(ui);

        const payload = construirPayload(ui);

        if (!payload.ok) {
            mostrarAlerta(ui, payload.mensaje);
            return;
        }

        const textoOriginal = ui.btnGuardar.textContent;

        ui.btnGuardar.disabled = true;
        ui.btnGuardar.textContent = 'Guardando...';

        try {
            const respuesta = await fetch(ui.form.dataset.url || '/cotizaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload.datos),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                mostrarAlerta(ui, datos.mensaje || 'No se pudo crear la cotización.');
                return;
            }

            const idCotizacion = datos.cotizacion?.id_cotizacion;

            if (idCotizacion) {
                window.location.href = `/cotizaciones/${idCotizacion}?exito=${encodeURIComponent(datos.mensaje)}`;
                return;
            }

            window.location.href = '/cotizaciones?exito=' + encodeURIComponent(datos.mensaje);
        } catch (error) {
            console.error('Error creando cotización:', error);
            mostrarAlerta(ui, 'Error de conexión creando la cotización.');
        } finally {
            ui.btnGuardar.disabled = false;
            ui.btnGuardar.textContent = textoOriginal;
        }
    }

    function inicializarClienteRapidoCotizacion(ui) {
        if (!ui.btnAbrirClienteRapido || !ui.modalClienteRapido || !ui.formClienteRapido) {
            return;
        }

        ui.btnAbrirClienteRapido.addEventListener('click', function () {
            abrirModalClienteRapidoCotizacion(ui);
        });

        ui.btnCerrarClienteRapido?.addEventListener('click', function () {
            cerrarModalClienteRapidoCotizacion(ui);
        });

        ui.btnCancelarClienteRapido?.addEventListener('click', function () {
            cerrarModalClienteRapidoCotizacion(ui);
        });

        ui.modalClienteRapido.addEventListener('click', function (evento) {
            if (evento.target === ui.modalClienteRapido) {
                cerrarModalClienteRapidoCotizacion(ui);
            }
        });

        ui.tipoDocumentoClienteRapido?.addEventListener('change', function () {
            actualizarTipoDocumentoClienteRapidoCotizacion(ui);
        });

        ui.formClienteRapido.addEventListener('submit', async function (evento) {
            evento.preventDefault();
            await guardarClienteRapidoCotizacion(ui);
        });

        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && !ui.modalClienteRapido.hidden) {
                cerrarModalClienteRapidoCotizacion(ui);
            }
        });

        actualizarTipoDocumentoClienteRapidoCotizacion(ui);
    }

    function abrirModalClienteRapidoCotizacion(ui) {
        limpiarFormularioClienteRapidoCotizacion(ui);

        ui.modalClienteRapido.hidden = false;
        document.body.classList.add('ventas-modal-open');

        window.requestAnimationFrame(function () {
            ui.documentoClienteRapido?.focus();
        });
    }

    function cerrarModalClienteRapidoCotizacion(ui) {
        ui.modalClienteRapido.hidden = true;
        document.body.classList.remove('ventas-modal-open');
    }

    function limpiarFormularioClienteRapidoCotizacion(ui) {
        ui.formClienteRapido.reset();

        if (ui.tipoDocumentoClienteRapido) {
            ui.tipoDocumentoClienteRapido.value = 'CC';
        }

        if (ui.autorizaClienteRapido) {
            ui.autorizaClienteRapido.checked = true;
        }

        limpiarErroresClienteRapidoCotizacion(ui);
        actualizarTipoDocumentoClienteRapidoCotizacion(ui);
    }

    function actualizarTipoDocumentoClienteRapidoCotizacion(ui) {
        const esNit = ui.tipoDocumentoClienteRapido?.value === 'NIT';

        if (ui.campoDvClienteRapido) {
            ui.campoDvClienteRapido.hidden = !esNit;
        }

        if (!esNit && ui.dvClienteRapido) {
            ui.dvClienteRapido.value = '';
        }
    }

    function limpiarErroresClienteRapidoCotizacion(ui) {
        [
            ui.tipoDocumentoClienteRapido,
            ui.documentoClienteRapido,
            ui.dvClienteRapido,
            ui.nombreClienteRapido,
            ui.celularClienteRapido,
            ui.correoClienteRapido,
        ].forEach(function (campo) {
            campo?.classList.remove('is-invalid');
        });

        if (ui.avisoClienteRapido) {
            ui.avisoClienteRapido.hidden = true;
            ui.avisoClienteRapido.textContent = '';
        }
    }

    function mostrarErrorClienteRapidoCotizacion(ui, campo, mensaje) {
        limpiarErroresClienteRapidoCotizacion(ui);

        if (ui.avisoClienteRapido) {
            ui.avisoClienteRapido.textContent = mensaje;
            ui.avisoClienteRapido.hidden = false;
        }

        if (campo) {
            campo.classList.add('is-invalid');
            campo.focus();
        }
    }

    function construirPayloadClienteRapidoCotizacion(ui) {
        const tipoDocumento = ui.tipoDocumentoClienteRapido?.value || 'CC';
        const documento = limpiarTexto(ui.documentoClienteRapido?.value);
        const digitoVerificacion = limpiarTexto(ui.dvClienteRapido?.value);
        const nombre = limpiarTexto(ui.nombreClienteRapido?.value);
        const celular = limpiarTexto(ui.celularClienteRapido?.value);
        const correo = limpiarTexto(ui.correoClienteRapido?.value);
        const esNit = tipoDocumento === 'NIT';

        if (!documento) {
            return {
                ok: false,
                campo: ui.documentoClienteRapido,
                mensaje: 'Digita el documento del cliente.',
            };
        }

        if (esNit && !digitoVerificacion) {
            return {
                ok: false,
                campo: ui.dvClienteRapido,
                mensaje: 'Digita el DV del NIT.',
            };
        }

        if (!nombre) {
            return {
                ok: false,
                campo: ui.nombreClienteRapido,
                mensaje: 'Digita el nombre del cliente.',
            };
        }

        if (!esNit && nombre.split(/\s+/).filter(Boolean).length < 2) {
            return {
                ok: false,
                campo: ui.nombreClienteRapido,
                mensaje: 'Digita nombre y apellido del cliente.',
            };
        }

        return {
            ok: true,
            datos: {
                tipo_documento: tipoDocumento,
                documento,
                digito_verificacion: digitoVerificacion,
                nombre,
                celular,
                correo,
                autoriza_tratamiento_datos: ui.autorizaClienteRapido?.checked ? 1 : 0,
            },
        };
    }

    function prepararClienteCreadoParaCotizacion(cliente) {
        const tipoDocumento = limpiarTexto(cliente.tipo_documento) || 'CC';
        const documento = limpiarTexto(cliente.documento);
        const nombre = (
            limpiarTexto(cliente.nombre_mostrar)
            || limpiarTexto(cliente.nombre)
            || limpiarTexto(cliente.razon_social)
            || limpiarTexto(cliente.nombre_comercial)
            || `Cliente #${cliente.id_cliente}`
        );

        const telefono = (
            limpiarTexto(cliente.telefono)
            || limpiarTexto(cliente.celular)
        );

        const correo = (
            limpiarTexto(cliente.correo)
            || limpiarTexto(cliente.correo_facturacion)
        );

        return {
            ...cliente,
            nombre_mostrar: nombre,
            etiqueta_documento: documento ? `${tipoDocumento} ${documento}` : 'Sin documento',
            texto_secundario: [
                documento ? `${tipoDocumento} ${documento}` : null,
                telefono || null,
                correo || null,
            ].filter(Boolean).join(' · '),
        };
    }

    async function guardarClienteRapidoCotizacion(ui) {
        limpiarErroresClienteRapidoCotizacion(ui);

        const payload = construirPayloadClienteRapidoCotizacion(ui);

        if (!payload.ok) {
            mostrarErrorClienteRapidoCotizacion(ui, payload.campo, payload.mensaje);
            return;
        }

        const textoOriginal = ui.btnGuardarClienteRapido?.textContent || 'Crear y seleccionar';

        if (ui.btnGuardarClienteRapido) {
            ui.btnGuardarClienteRapido.disabled = true;
            ui.btnGuardarClienteRapido.textContent = 'Guardando...';
        }

        try {
            const respuesta = await fetch(ui.formClienteRapido.dataset.url || '/clientes/rapido', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload.datos),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                mostrarErrorClienteRapidoCotizacion(
                    ui,
                    null,
                    datos.mensaje || 'No se pudo crear el cliente.'
                );
                return;
            }

            const clientePreparado = prepararClienteCreadoParaCotizacion(datos.cliente);

            seleccionarCliente(clientePreparado, ui);
            cerrarModalClienteRapidoCotizacion(ui);
            limpiarAlerta(ui);
        } catch (error) {
            console.error('Error creando cliente rápido para cotización:', error);
            mostrarErrorClienteRapidoCotizacion(ui, null, 'Error de conexión creando el cliente.');
        } finally {
            if (ui.btnGuardarClienteRapido) {
                ui.btnGuardarClienteRapido.disabled = false;
                ui.btnGuardarClienteRapido.textContent = textoOriginal;
            }
        }
    }

    function limpiarCotizacion(ui) {
        estado.cliente = null;
        estado.items.clear();

        if (ui.buscarCliente) {
            ui.buscarCliente.disabled = false;
            ui.buscarCliente.value = '';
        }

        if (ui.buscarProducto) {
            ui.buscarProducto.value = '';
        }

        if (ui.clienteBox) {
            ui.clienteBox.hidden = true;
        }

        if (ui.clienteNombre) {
            ui.clienteNombre.textContent = '';
        }

        if (ui.clienteDetalle) {
            ui.clienteDetalle.textContent = '';
        }

        if (ui.resumenCliente) {
            ui.resumenCliente.textContent = 'Sin seleccionar';
        }

        if (ui.resumenClienteInfo) {
            ui.resumenClienteInfo.textContent = 'Sin seleccionar';
        }

        if (ui.validezDias) {
            ui.validezDias.value = 15;
        }

        if (ui.condiciones) {
            ui.condiciones.value = 'Precios sujetos a disponibilidad. No afecta inventario.';
        }

        if (ui.observaciones) {
            ui.observaciones.value = '';
        }

        ocultarResultados(ui.resultadosClientes);
        ocultarResultados(ui.resultadosProductos);
        limpiarAlerta(ui);
        renderItems(ui);

        ui.buscarProducto?.focus();
    }

    function inicializarCotizaciones() {
        const ui = obtenerUi();

        if (!ui.form) {
            return;
        }

        const buscarClientesDebounced = debounce(function () {
            buscarClientes(ui);
        });

        const buscarProductosDebounced = debounce(function () {
            buscarProductos(ui);
        });

        ui.buscarCliente.addEventListener('input', buscarClientesDebounced);
        ui.buscarProducto.addEventListener('input', buscarProductosDebounced);

        ui.btnBuscarProducto?.addEventListener('click', function () {
            buscarProductos(ui);
        });

        ui.btnQuitarCliente.addEventListener('click', function () {
            quitarCliente(ui);
        });

        inicializarClienteRapidoCotizacion(ui);

        const btnLimpiarCotizacion = $('btnLimpiarCotizacion');

        btnLimpiarCotizacion?.addEventListener('click', function () {
            limpiarCotizacion(ui);
        });

        ui.form.addEventListener('submit', function (evento) {
            evento.preventDefault();
            guardarCotizacion(ui);
        });

        document.addEventListener('click', function (evento) {
            if (!ui.resultadosClientes.contains(evento.target) && evento.target !== ui.buscarCliente) {
                ocultarResultados(ui.resultadosClientes);
            }

            if (!ui.resultadosProductos.contains(evento.target) && evento.target !== ui.buscarProducto) {
                ocultarResultados(ui.resultadosProductos);
            }
        });

        actualizarResumen(ui);
    }

    document.addEventListener('DOMContentLoaded', inicializarCotizaciones);
})();