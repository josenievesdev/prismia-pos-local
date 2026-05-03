(function () {
    const estado = {
        cliente: null,
        items: new Map(),
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

    function dejarSoloDigitos(valor) {
        return String(valor || '').replace(/\D/g, '');
    }

    function dejarSoloDigitos(valor) {
        return String(valor || '').replace(/\D/g, '');
    }

    function debounce(callback, delay = 250) {
        return function (...args) {
            clearTimeout(callback._timer);
            callback._timer = setTimeout(function () {
                callback(...args);
            }, delay);
        };
    }

    function obtenerUi() {
        return {
            form: $('formNuevaRemision'),

            buscarCliente: $('buscarClienteRemision'),
            resultadosClientes: $('resultadosClientesRemision'),
            clienteBox: $('clienteSeleccionadoBoxRemision'),
            clienteNombre: $('clienteSeleccionadoNombreRemision'),
            clienteDetalle: $('clienteSeleccionadoDetalleRemision'),
            btnQuitarCliente: $('btnQuitarClienteRemision'),

            btnAbrirClienteRapido: $('btnAbrirClienteRapidoRemision'),
            modalClienteRapido: $('modalClienteRapidoRemision'),
            formClienteRapido: $('formClienteRapidoRemision'),
            btnCerrarClienteRapido: $('btnCerrarClienteRapidoRemision'),
            btnCancelarClienteRapido: $('btnCancelarClienteRapidoRemision'),
            avisoClienteRapido: $('avisoClienteRapidoRemision'),
            tipoDocumentoClienteRapido: $('clienteRapidoRemisionTipoDocumento'),
            documentoClienteRapido: $('clienteRapidoRemisionDocumento'),
            campoDvClienteRapido: $('campoClienteRapidoRemisionDv'),
            dvClienteRapido: $('clienteRapidoRemisionDv'),
            nombreClienteRapido: $('clienteRapidoRemisionNombre'),
            celularClienteRapido: $('clienteRapidoRemisionCelular'),
            correoClienteRapido: $('clienteRapidoRemisionCorreo'),
            autorizaClienteRapido: $('clienteRapidoRemisionAutoriza'),
            btnGuardarClienteRapido: $('btnGuardarClienteRapidoRemision'),

            buscarProducto: $('buscarProductoRemision'),
            btnBuscarProducto: $('btnBuscarProductoRemision'),
            resultadosProductos: $('resultadosProductosRemision'),
            itemsContenedor: $('itemsRemision'),
            totalItems: $('totalItemsRemision'),

            fechaEntrega: $('fechaEntregaEstimadaRemision'),
            direccionEntrega: $('direccionEntregaRemision'),
            contactoEntrega: $('contactoEntregaRemision'),
            telefonoEntrega: $('telefonoEntregaRemision'),
            condicionesEntrega: $('condicionesEntregaRemision'),
            observaciones: $('observacionesRemision'),

            resumenCliente: $('resumenClienteRemision'),
            resumenClienteInfo: $('resumenClienteInfoRemision'),
            resumenSubtotal: $('resumenSubtotalRemision'),
            resumenDescuento: $('resumenDescuentoRemision'),
            resumenIva: $('resumenIvaRemision'),
            resumenTotal: $('resumenTotalRemision'),
            resumenCosto: $('resumenCostoRemision'),
            resumenUtilidad: $('resumenUtilidadRemision'),

            alerta: $('alertaRemision'),
            btnGuardar: $('btnGuardarRemision'),
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

        if (ui.direccionEntrega && !limpiarTexto(ui.direccionEntrega.value)) {
            ui.direccionEntrega.value = cliente.direccion_mostrar || cliente.direccion || '';
        }

        if (ui.contactoEntrega && !limpiarTexto(ui.contactoEntrega.value)) {
            ui.contactoEntrega.value = nombre;
        }

        if (ui.telefonoEntrega && !limpiarTexto(ui.telefonoEntrega.value)) {
            ui.telefonoEntrega.value = cliente.telefono_mostrar || cliente.celular || cliente.telefono || '';
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
        ui.resultadosClientes.innerHTML = '';

        if (!clientes.length) {
            ui.resultadosClientes.innerHTML = `
                <div class="remisiones-search-empty">
                    No se encontraron clientes activos.
                </div>
            `;
            ui.resultadosClientes.hidden = false;
            return;
        }

        clientes.forEach(function (cliente) {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'remisiones-result-item';

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
            const respuesta = await fetch(`/remisiones/api/clientes/buscar?busqueda=${encodeURIComponent(termino)}`);
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
        ui.resultadosProductos.innerHTML = '';

        if (!productos.length) {
            ui.resultadosProductos.innerHTML = `
                <div class="remisiones-search-empty">
                    No se encontraron productos activos.
                </div>
            `;
            ui.resultadosProductos.hidden = false;
            return;
        }

        productos.forEach(function (producto) {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'remisiones-product-result-item';

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
            const respuesta = await fetch(`/remisiones/api/productos/buscar?busqueda=${encodeURIComponent(termino)}`);
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

    function actualizarResumen(ui) {
        const resumen = calcularResumen();

        ui.resumenSubtotal.textContent = dinero(resumen.subtotal);
        ui.resumenDescuento.textContent = dinero(resumen.descuento_total);
        ui.resumenIva.textContent = dinero(resumen.impuesto_total);
        ui.resumenTotal.textContent = dinero(resumen.total);
        ui.resumenCosto.textContent = dinero(resumen.total_costo);
        ui.resumenUtilidad.textContent = dinero(resumen.utilidad_bruta);

        ui.resumenUtilidad.classList.toggle('remisiones-profit-negative', resumen.utilidad_bruta < 0);
        ui.resumenUtilidad.classList.toggle('remisiones-profit-positive', resumen.utilidad_bruta >= 0);
    }

    function renderItems(ui) {
        ui.itemsContenedor.innerHTML = '';

        if (!estado.items.size) {
            ui.itemsContenedor.innerHTML = `
                <tr class="ventas-cart-empty-row">
                    <td colspan="7">
                        <div class="ventas-cart-empty">
                            <strong>Remisión vacía</strong>
                            <span>Busca un producto y agrégalo a la remisión.</span>
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
                        class="remisiones-table-qty"
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
                    <button type="button" class="ventas-cart-remove remisiones-item-remove" data-id-producto="${idProducto}">
                        Quitar
                    </button>
                </td>
            `;

            ui.itemsContenedor.appendChild(fila);
            indice += 1;
        });

        ui.itemsContenedor.querySelectorAll('.remisiones-table-qty').forEach(function (input) {
            input.addEventListener('change', function () {
                actualizarCantidad(input.dataset.idProducto, input.value, ui);
            });
        });

        ui.itemsContenedor.querySelectorAll('.remisiones-item-remove').forEach(function (boton) {
            boton.addEventListener('click', function () {
                quitarProducto(boton.dataset.idProducto, ui);
            });
        });

        ui.totalItems.textContent = String(estado.items.size);
        actualizarResumen(ui);
    }

    function construirPayload(ui) {
        if (!estado.cliente?.id_cliente) {
            return {
                ok: false,
                mensaje: 'Selecciona un cliente para la remisión.',
            };
        }

        if (!estado.items.size) {
            return {
                ok: false,
                mensaje: 'Agrega al menos un producto a la remisión.',
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
                afecta_inventario: 0,
                fecha_entrega_estimada: ui.fechaEntrega.value,
                direccion_entrega: ui.direccionEntrega.value,
                contacto_entrega: ui.contactoEntrega.value,
                telefono_entrega: ui.telefonoEntrega.value,
                condiciones_entrega: ui.condicionesEntrega.value,
                observaciones: ui.observaciones.value,
                items,
            },
        };
    }

    async function guardarRemision(ui) {
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
            const respuesta = await fetch(ui.form.dataset.url || '/remisiones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload.datos),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                mostrarAlerta(ui, datos.mensaje || 'No se pudo crear la remisión.');
                return;
            }

            const idRemision = datos.remision?.id_remision;

            if (idRemision) {
                window.location.href = `/remisiones/${idRemision}?exito=${encodeURIComponent(datos.mensaje)}`;
                return;
            }

            window.location.href = '/remisiones?exito=' + encodeURIComponent(datos.mensaje);
        } catch (error) {
            console.error('Error creando remisión:', error);
            mostrarAlerta(ui, 'Error de conexión creando la remisión.');
        } finally {
            ui.btnGuardar.disabled = false;
            ui.btnGuardar.textContent = textoOriginal;
        }
    }

    function limpiarRemision(ui) {
        estado.cliente = null;
        estado.items.clear();

        ui.buscarCliente.disabled = false;
        ui.buscarCliente.value = '';
        ui.buscarProducto.value = '';

        ui.clienteBox.hidden = true;
        ui.clienteNombre.textContent = '';
        ui.clienteDetalle.textContent = '';

        ui.resumenCliente.textContent = 'Sin seleccionar';

        if (ui.resumenClienteInfo) {
            ui.resumenClienteInfo.textContent = 'Sin seleccionar';
        }

        if (ui.direccionEntrega) ui.direccionEntrega.value = '';
        if (ui.contactoEntrega) ui.contactoEntrega.value = '';
        if (ui.telefonoEntrega) ui.telefonoEntrega.value = '';
        if (ui.condicionesEntrega) ui.condicionesEntrega.value = 'Documento de remisión sin afectación de inventario.';
        if (ui.observaciones) ui.observaciones.value = '';

        ocultarResultados(ui.resultadosClientes);
        ocultarResultados(ui.resultadosProductos);
        limpiarAlerta(ui);
        renderItems(ui);

        ui.buscarProducto?.focus();
    }

    function inicializarClienteRapido(ui) {
        if (!ui.btnAbrirClienteRapido || !ui.modalClienteRapido || !ui.formClienteRapido) {
            return;
        }

        ui.btnAbrirClienteRapido.addEventListener('click', function () {
            limpiarFormularioClienteRapido(ui);
            ui.modalClienteRapido.hidden = false;
            document.body.classList.add('ventas-modal-open');

            window.requestAnimationFrame(function () {
                ui.documentoClienteRapido?.focus();
            });
        });

        ui.btnCerrarClienteRapido?.addEventListener('click', function () {
            cerrarModalClienteRapido(ui);
        });

        ui.btnCancelarClienteRapido?.addEventListener('click', function () {
            cerrarModalClienteRapido(ui);
        });

        ui.modalClienteRapido.addEventListener('click', function (evento) {
            if (evento.target === ui.modalClienteRapido) {
                cerrarModalClienteRapido(ui);
            }
        });

        ui.tipoDocumentoClienteRapido?.addEventListener('change', function () {
            actualizarTipoDocumentoClienteRapido(ui);
        });

        ui.documentoClienteRapido?.addEventListener('input', function () {
            ui.documentoClienteRapido.value = dejarSoloDigitos(ui.documentoClienteRapido.value);
        });

        ui.dvClienteRapido?.addEventListener('input', function () {
            ui.dvClienteRapido.value = dejarSoloDigitos(ui.dvClienteRapido.value).slice(0, 1);
        });

        ui.documentoClienteRapido?.addEventListener('input', function () {
            ui.documentoClienteRapido.value = dejarSoloDigitos(ui.documentoClienteRapido.value);
        });

        ui.dvClienteRapido?.addEventListener('input', function () {
            ui.dvClienteRapido.value = dejarSoloDigitos(ui.dvClienteRapido.value).slice(0, 1);
        });

        ui.formClienteRapido.addEventListener('submit', async function (evento) {
            evento.preventDefault();
            await guardarClienteRapido(ui);
        });

        actualizarTipoDocumentoClienteRapido(ui);
    }

    function cerrarModalClienteRapido(ui) {
        ui.modalClienteRapido.hidden = true;
        document.body.classList.remove('ventas-modal-open');
    }

    function limpiarFormularioClienteRapido(ui) {
        ui.formClienteRapido.reset();

        if (ui.tipoDocumentoClienteRapido) {
            ui.tipoDocumentoClienteRapido.value = 'CC';
        }

        if (ui.autorizaClienteRapido) {
            ui.autorizaClienteRapido.checked = true;
        }

        limpiarErroresClienteRapido(ui);
        actualizarTipoDocumentoClienteRapido(ui);
    }

    function actualizarTipoDocumentoClienteRapido(ui) {
        const esNit = ui.tipoDocumentoClienteRapido?.value === 'NIT';

        if (ui.campoDvClienteRapido) {
            ui.campoDvClienteRapido.hidden = !esNit;
        }

        if (!esNit && ui.dvClienteRapido) {
            ui.dvClienteRapido.value = '';
        }
    }

    function limpiarErroresClienteRapido(ui) {
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

    function mostrarErrorClienteRapido(ui, campo, mensaje) {
        limpiarErroresClienteRapido(ui);

        if (ui.avisoClienteRapido) {
            ui.avisoClienteRapido.textContent = mensaje;
            ui.avisoClienteRapido.hidden = false;
        }

        if (campo) {
            campo.classList.add('is-invalid');
            campo.focus();
        }
    }

    function construirPayloadClienteRapido(ui) {
        const tipoDocumento = ui.tipoDocumentoClienteRapido?.value || 'CC';
        const documento = dejarSoloDigitos(ui.documentoClienteRapido?.value);
        const digitoVerificacion = dejarSoloDigitos(ui.dvClienteRapido?.value).slice(0, 1);
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

        if (!/^\d+$/.test(documento)) {
            return {
                ok: false,
                campo: ui.documentoClienteRapido,
                mensaje: 'El documento solo debe contener números.',
            };
        }

        if (!/^\d+$/.test(documento)) {
            return {
                ok: false,
                campo: ui.documentoClienteRapido,
                mensaje: 'El documento solo debe contener números.',
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

    function prepararClienteCreado(cliente) {
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
            telefono_mostrar: telefono,
            direccion_mostrar: cliente.direccion || '',
            etiqueta_documento: documento ? `${tipoDocumento} ${documento}` : 'Sin documento',
            texto_secundario: [
                documento ? `${tipoDocumento} ${documento}` : null,
                telefono || null,
                correo || null,
            ].filter(Boolean).join(' · '),
        };
    }

    async function guardarClienteRapido(ui) {
        limpiarErroresClienteRapido(ui);

        const payload = construirPayloadClienteRapido(ui);

        if (!payload.ok) {
            mostrarErrorClienteRapido(ui, payload.campo, payload.mensaje);
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
                mostrarErrorClienteRapido(
                    ui,
                    null,
                    datos.mensaje || 'No se pudo crear el cliente.'
                );
                return;
            }

            seleccionarCliente(prepararClienteCreado(datos.cliente), ui);
            cerrarModalClienteRapido(ui);
            limpiarAlerta(ui);
        } catch (error) {
            console.error('Error creando cliente rápido para remisión:', error);
            mostrarErrorClienteRapido(ui, null, 'Error de conexión creando el cliente.');
        } finally {
            if (ui.btnGuardarClienteRapido) {
                ui.btnGuardarClienteRapido.disabled = false;
                ui.btnGuardarClienteRapido.textContent = textoOriginal;
            }
        }
    }

    function inicializarRemisiones() {
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

        const btnLimpiarRemision = $('btnLimpiarRemision');

        btnLimpiarRemision?.addEventListener('click', function () {
            limpiarRemision(ui);
        });

        ui.form.addEventListener('submit', function (evento) {
            evento.preventDefault();
            guardarRemision(ui);
        });

        document.addEventListener('click', function (evento) {
            if (!ui.resultadosClientes.contains(evento.target) && evento.target !== ui.buscarCliente) {
                ocultarResultados(ui.resultadosClientes);
            }

            if (!ui.resultadosProductos.contains(evento.target) && evento.target !== ui.buscarProducto) {
                ocultarResultados(ui.resultadosProductos);
            }
        });

        inicializarClienteRapido(ui);
        renderItems(ui);
    }

    function obtenerUiConversionRemision() {
        return {
            btnAbrir: $('btnAbrirConversionRemision'),
            modal: $('modalConvertirRemision'),
            form: $('formConvertirRemision'),
            btnCerrar: $('btnCerrarConversionRemision'),
            btnCancelar: $('btnCancelarConversionRemision'),
            btnConfirmar: $('btnConfirmarConversionRemision'),

            alerta: $('alertaConversionRemision'),
            problemas: $('conversionProblemasRemision'),

            numero: $('conversionNumeroRemision'),
            cliente: $('conversionClienteRemision'),
            total: $('conversionTotalRemision'),

            medioPago: $('conversionMedioPagoRemision'),
            montoRecibido: $('conversionMontoRecibidoRemision'),
            referencia: $('conversionReferenciaRemision'),
            observaciones: $('conversionObservacionesRemision'),

            preparacion: null,
        };
    }

    function mostrarAlertaConversionRemision(ui, mensaje) {
        if (!ui.alerta) return;

        ui.alerta.textContent = mensaje;
        ui.alerta.hidden = false;
    }

    function limpiarAlertaConversionRemision(ui) {
        if (!ui.alerta) return;

        ui.alerta.textContent = '';
        ui.alerta.hidden = true;
    }

    function renderProblemasConversionRemision(ui, problemas = []) {
        if (!ui.problemas) return;

        if (!problemas.length) {
            ui.problemas.hidden = true;
            ui.problemas.innerHTML = '';
            return;
        }

        ui.problemas.innerHTML = `
        <strong>No se puede convertir todavía:</strong>
        <ul>
            ${problemas.map((problema) => `<li>${problema}</li>`).join('')}
        </ul>
    `;

        ui.problemas.hidden = false;
    }

    function renderMediosPagoConversionRemision(ui, mediosPago = []) {
        ui.medioPago.innerHTML = '';

        mediosPago.forEach(function (medio) {
            const option = document.createElement('option');

            option.value = medio.id_medio_pago;
            option.textContent = `${medio.nombre} · ${medio.tipo}`;
            option.dataset.requiereReferencia = medio.requiere_referencia || 0;
            option.dataset.afectaEfectivo = medio.afecta_efectivo_caja || 0;

            ui.medioPago.appendChild(option);
        });
    }

    function obtenerMedioPagoSeleccionadoConversionRemision(ui) {
        const option = ui.medioPago.options[ui.medioPago.selectedIndex];

        if (!option) {
            return null;
        }

        return {
            id_medio_pago: Number(option.value),
            nombre: option.textContent,
            requiere_referencia: Number(option.dataset.requiereReferencia || 0),
            afecta_efectivo_caja: Number(option.dataset.afectaEfectivo || 0),
        };
    }

    function actualizarReferenciaConversionRemision(ui) {
        const medio = obtenerMedioPagoSeleccionadoConversionRemision(ui);

        if (!medio || !ui.referencia) return;

        const requiereReferencia = medio.requiere_referencia === 1;

        ui.referencia.placeholder = requiereReferencia
            ? 'Referencia obligatoria'
            : 'Referencia opcional';

        ui.referencia.required = requiereReferencia;
    }

    async function abrirModalConversionRemision(ui) {
        limpiarAlertaConversionRemision(ui);
        renderProblemasConversionRemision(ui, []);

        ui.modal.hidden = false;

        if (ui.btnConfirmar) {
            ui.btnConfirmar.disabled = true;
            ui.btnConfirmar.textContent = 'Validando...';
        }

        try {
            const respuesta = await fetch(ui.btnAbrir.dataset.urlPreparar);
            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                mostrarAlertaConversionRemision(
                    ui,
                    datos.mensaje || 'No se pudo preparar la conversión.'
                );
                return;
            }

            ui.preparacion = datos;

            ui.numero.textContent = datos.remision?.numero_remision || '-';
            ui.cliente.textContent = datos.remision?.cliente_nombre_mostrar || 'Sin cliente';
            ui.total.textContent = dinero(datos.remision?.total || 0);

            ui.montoRecibido.value = datos.remision?.total || 0;
            ui.observaciones.value = `Venta generada desde remisión ${datos.remision?.numero_remision || ''}.`;

            renderMediosPagoConversionRemision(ui, datos.medios_pago || []);
            renderProblemasConversionRemision(ui, datos.problemas || []);
            actualizarReferenciaConversionRemision(ui);

            if (ui.btnConfirmar) {
                ui.btnConfirmar.disabled = !datos.puede_convertir;
                ui.btnConfirmar.textContent = datos.puede_convertir
                    ? 'Convertir a venta'
                    : 'No disponible';
            }
        } catch (error) {
            console.error('Error preparando conversión de remisión:', error);
            mostrarAlertaConversionRemision(ui, 'Error de conexión preparando la conversión.');
        }
    }

    function cerrarModalConversionRemision(ui) {
        ui.modal.hidden = true;
        limpiarAlertaConversionRemision(ui);
    }

    function construirPayloadConversionRemision(ui) {
        const medio = obtenerMedioPagoSeleccionadoConversionRemision(ui);

        if (!medio?.id_medio_pago) {
            return {
                ok: false,
                mensaje: 'Selecciona un medio de pago válido.',
            };
        }

        const total = Number(ui.preparacion?.remision?.total || 0);
        const montoRecibido = Number(ui.montoRecibido.value || 0);
        const referencia = limpiarTexto(ui.referencia.value);

        if (montoRecibido < total) {
            return {
                ok: false,
                mensaje: 'El valor recibido no cubre el total de la remisión.',
            };
        }

        if (medio.requiere_referencia === 1 && !referencia) {
            return {
                ok: false,
                mensaje: 'El medio de pago seleccionado requiere referencia.',
            };
        }

        if (medio.afecta_efectivo_caja !== 1 && montoRecibido > total) {
            return {
                ok: false,
                mensaje: 'El cambio solo aplica para pagos en efectivo.',
            };
        }

        return {
            ok: true,
            datos: {
                pago: {
                    id_medio_pago: medio.id_medio_pago,
                    monto_recibido: montoRecibido,
                    referencia,
                },
                observaciones: limpiarTexto(ui.observaciones.value),
            },
        };
    }

    async function confirmarConversionRemision(ui) {
        limpiarAlertaConversionRemision(ui);

        const payload = construirPayloadConversionRemision(ui);

        if (!payload.ok) {
            mostrarAlertaConversionRemision(ui, payload.mensaje);
            return;
        }

        const textoOriginal = ui.btnConfirmar.textContent;

        ui.btnConfirmar.disabled = true;
        ui.btnConfirmar.textContent = 'Convirtiendo...';

        try {
            const respuesta = await fetch(ui.btnAbrir.dataset.urlConvertir, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload.datos),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                mostrarAlertaConversionRemision(
                    ui,
                    datos.mensaje || 'No se pudo convertir la remisión.'
                );
                return;
            }

            const idRemision = datos.remision?.id_remision || ui.btnAbrir.dataset.idRemision;
            const mensaje = `${datos.mensaje} Venta: ${datos.venta?.numero_venta || ''}`;

            window.location.href = `/remisiones/${idRemision}?exito=${encodeURIComponent(mensaje)}`;
        } catch (error) {
            console.error('Error convirtiendo remisión:', error);
            mostrarAlertaConversionRemision(ui, 'Error de conexión convirtiendo la remisión.');
        } finally {
            ui.btnConfirmar.disabled = false;
            ui.btnConfirmar.textContent = textoOriginal;
        }
    }

    function inicializarConversionRemision() {
        const ui = obtenerUiConversionRemision();

        if (!ui.btnAbrir || !ui.modal || !ui.form) {
            return;
        }

        ui.btnAbrir.addEventListener('click', function () {
            abrirModalConversionRemision(ui);
        });

        ui.btnCerrar?.addEventListener('click', function () {
            cerrarModalConversionRemision(ui);
        });

        ui.btnCancelar?.addEventListener('click', function () {
            cerrarModalConversionRemision(ui);
        });

        ui.modal.addEventListener('click', function (evento) {
            if (evento.target === ui.modal) {
                cerrarModalConversionRemision(ui);
            }
        });

        ui.medioPago?.addEventListener('change', function () {
            actualizarReferenciaConversionRemision(ui);
        });

        ui.form.addEventListener('submit', function (evento) {
            evento.preventDefault();
            confirmarConversionRemision(ui);
        });

        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && !ui.modal.hidden) {
                cerrarModalConversionRemision(ui);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        inicializarRemisiones();
        inicializarConversionRemision();
    });
})();