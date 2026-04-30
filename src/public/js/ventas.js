(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', iniciarPOSVentas);

    function iniciarPOSVentas() {
        const estado = {
            carrito: [],
            puedeVender: obtenerPuedeVender(),
            usuarioEditoPago: false,
            enviandoVenta: false,
        };

        const ui = obtenerElementos();

        inicializarFecha(ui);
        inicializarBusquedaClientes(ui);
        inicializarBusqueda(ui, estado);
        inicializarCarrito(ui, estado);
        inicializarPago(ui, estado);
        inicializarAcciones(ui, estado);
        inicializarCierreResultados(ui);

        ocultarResultadosProductos(ui);
        renderizarCarrito(ui, estado);
        recalcularTodo(ui, estado);
    }

    function obtenerElementos() {
        return {
            shell: document.querySelector('.ventas-pos-shell'),

            fechaVenta: document.getElementById('fechaVenta'),

            inputCliente: document.getElementById('buscarCliente'),
            resultadosClientes: document.getElementById('resultadosClientes'),

            formularioBusqueda: document.getElementById('formBusquedaProductos'),
            inputBusqueda: document.getElementById('buscarProducto'),
            panelResultados: document.getElementById('panelResultados'),
            conteoResultados: document.getElementById('conteoResultados'),
            searchLoading: document.getElementById('searchLoading'),

            carritoItems: document.getElementById('ventasCarritoItems'),

            resumenCantidadItems: document.getElementById('resumenCantidadItems'),
            resumenSubtotal: document.getElementById('resumenSubtotal'),
            resumenDescuento: document.getElementById('resumenDescuento'),
            resumenIva: document.getElementById('resumenIva'),
            resumenTotal: document.getElementById('resumenTotal'),

            medioPagoPrincipal: document.getElementById('medioPagoPrincipal'),
            montoPagadoPrincipal: document.getElementById('montoPagadoPrincipal'),
            referenciaPagoPrincipal: document.getElementById('referenciaPagoPrincipal'),

            resumenPagado: document.getElementById('resumenPagado'),
            resumenSaldo: document.getElementById('resumenSaldo'),
            resumenCambio: document.getElementById('resumenCambio'),

            infoPagoCliente: document.getElementById('infoPagoCliente'),
            infoPagoDocumento: document.getElementById('infoPagoDocumento'),
            infoPagoMedio: document.getElementById('infoPagoMedio'),
            infoPagoItems: document.getElementById('infoPagoItems'),

            botonLimpiar: document.getElementById('btnLimpiarVenta'),
            botonPendiente: document.getElementById('btnVentaPendiente'),
            botonCobrar: document.querySelector('.ventas-charge-button'),
        };
    }

    function obtenerPuedeVender() {
        const shell = document.querySelector('.ventas-pos-shell');
        return Boolean(shell && shell.dataset && shell.dataset.puedeVender === '1');
    }

    function inicializarFecha(ui) {
        if (!ui.fechaVenta) return;

        const fechaHoy = ui.fechaVenta.dataset.fechaHoy;

        ui.fechaVenta.addEventListener('change', function () {
            if (ui.fechaVenta.value < fechaHoy) {
                ui.fechaVenta.classList.add('is-invalid');
                ui.fechaVenta.setCustomValidity('No puedes registrar ventas con fecha anterior.');
                ui.fechaVenta.reportValidity();
                ui.fechaVenta.value = fechaHoy;
                return;
            }

            ui.fechaVenta.classList.remove('is-invalid');
            ui.fechaVenta.setCustomValidity('');
        });
    }

    function inicializarBusqueda(ui, estado) {
        if (!ui.inputBusqueda || !ui.panelResultados) return;

        const url = ui.inputBusqueda.dataset.searchProductsUrl || '/ventas/productos/buscar';
        let temporizadorBusqueda = null;
        let abortController = null;

        ui.inputBusqueda.addEventListener('input', function () {
            clearTimeout(temporizadorBusqueda);

            const termino = ui.inputBusqueda.value.trim();

            if (termino.length === 0) {
                ocultarResultadosProductos(ui);
                return;
            }

            temporizadorBusqueda = setTimeout(function () {
                buscarProductos(termino, url, ui, estado, abortController, function (nuevoController) {
                    abortController = nuevoController;
                });
            }, 180);
        });

        ui.inputBusqueda.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') {
                ocultarResultadosProductos(ui);
                ui.inputBusqueda.blur();
            }
        });

        if (ui.formularioBusqueda) {
            ui.formularioBusqueda.addEventListener('submit', function (evento) {
                evento.preventDefault();
                clearTimeout(temporizadorBusqueda);

                const termino = ui.inputBusqueda.value.trim();

                if (termino.length === 0) {
                    ocultarResultadosProductos(ui);
                    return;
                }

                buscarProductos(termino, url, ui, estado, abortController, function (nuevoController) {
                    abortController = nuevoController;
                });
            });
        }
    }

    function inicializarBusquedaClientes(ui) {
        if (!ui.inputCliente || !ui.resultadosClientes) {
            return;
        }

        const url = ui.inputCliente.dataset.searchClientsUrl || '/ventas/clientes/buscar';

        let temporizadorBusqueda = null;
        let abortController = null;

        ui.inputCliente.addEventListener('input', function () {
            clearTimeout(temporizadorBusqueda);

            const termino = ui.inputCliente.value.trim();

            ui.inputCliente.dataset.selectedClientId = '';

            if (termino.length === 0) {
                ocultarResultadosClientes(ui);
                actualizarInfoPago(ui, { carrito: [] });
                return;
            }

            temporizadorBusqueda = setTimeout(function () {
                buscarClientes(termino, url, ui, abortController, function (nuevoController) {
                    abortController = nuevoController;
                });
            }, 180);
        });

        ui.inputCliente.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') {
                ocultarResultadosClientes(ui);
                ui.inputCliente.blur();
            }
        });

        ui.resultadosClientes.addEventListener('click', function (evento) {
            const itemCliente = evento.target.closest('.ventas-client-result-item');

            if (!itemCliente) {
                return;
            }

            seleccionarClienteDesdeElemento(itemCliente, ui);
        });
    }

    async function buscarClientes(termino, url, ui, abortControllerActual, setAbortController) {
        if (abortControllerActual) {
            abortControllerActual.abort();
        }

        const nuevoController = new AbortController();
        setAbortController(nuevoController);

        try {
            const respuesta = await fetch(`${url}?busqueda=${encodeURIComponent(termino)}`, {
                signal: nuevoController.signal,
            });

            const datos = await respuesta.json();

            if (!datos.ok || !Array.isArray(datos.clientes)) {
                renderizarClientes([], ui);
                return;
            }

            renderizarClientes(datos.clientes, ui);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error buscando clientes:', error);
            }
        }
    }

    function renderizarClientes(clientes, ui) {
        if (!ui.resultadosClientes) {
            return;
        }

        ui.resultadosClientes.hidden = false;

        if (clientes.length === 0) {
            ui.resultadosClientes.innerHTML = `
            <div class="ventas-client-result-empty">
                No se encontraron clientes.
            </div>
        `;
            return;
        }

        ui.resultadosClientes.innerHTML = clientes.map(construirResultadoCliente).join('');
    }

    function construirResultadoCliente(cliente) {
        const documento = cliente.etiqueta_documento || cliente.documento || 'Sin documento';
        const secundario = cliente.texto_secundario || documento;

        return `
        <button
            type="button"
            class="ventas-client-result-item"
            data-client-id="${cliente.id_cliente}"
            data-client-name="${escaparHtml(cliente.nombre)}"
            data-client-document="${escaparHtml(cliente.documento || '')}"
            data-client-document-type="${escaparHtml(cliente.tipo_documento || '')}"
            data-client-phone="${escaparHtml(cliente.telefono || '')}"
            data-client-email="${escaparHtml(cliente.correo || '')}"
        >
            <span>${escaparHtml(cliente.nombre)}</span>
            <small>${escaparHtml(secundario)}</small>
        </button>
    `;
    }

    function seleccionarClienteDesdeElemento(elemento, ui) {
        const idCliente = elemento.dataset.clientId || '';
        const nombre = elemento.dataset.clientName || 'Consumidor final';
        const documento = elemento.dataset.clientDocument || '0000000000';

        ui.inputCliente.value = nombre;
        ui.inputCliente.dataset.selectedClientId = idCliente;

        const documentoActual = document.getElementById('clienteDocumentoActual');

        if (documentoActual) {
            documentoActual.textContent = documento || '0000000000';
        }

        ocultarResultadosClientes(ui);

        if (ui.infoPagoCliente) {
            ui.infoPagoCliente.textContent = nombre;
        }

        if (ui.infoPagoDocumento) {
            ui.infoPagoDocumento.textContent = documento || '0000000000';
        }

        if (ui.inputBusqueda) {
            ui.inputBusqueda.focus();
        }
    }

    function ocultarResultadosClientes(ui) {
        if (!ui.resultadosClientes) {
            return;
        }

        ui.resultadosClientes.hidden = true;
    }

    function inicializarCierreResultados(ui) {
        document.addEventListener('click', function (evento) {
            const clickDentroProductos = evento.target.closest('.ventas-search-section');

            if (!clickDentroProductos) {
                ocultarResultadosProductos(ui);
            }

            const clickDentroClientes = evento.target.closest('.ventas-client-search-box');

            if (!clickDentroClientes) {
                ocultarResultadosClientes(ui);
            }
        });

        if (ui.inputCliente && ui.resultadosClientes) {
            ui.inputCliente.addEventListener('focus', function () {
                ocultarResultadosClientes(ui);
            });
        }
    }

    function ocultarResultadosProductos(ui) {
        if (ui.panelResultados) {
            ui.panelResultados.hidden = true;
            ui.panelResultados.innerHTML = '';
        }

        if (ui.conteoResultados) {
            ui.conteoResultados.textContent = '0';
        }
    }

    async function buscarProductos(termino, url, ui, estado, abortControllerActual, setAbortController) {
        if (abortControllerActual) {
            abortControllerActual.abort();
        }

        const nuevoController = new AbortController();
        setAbortController(nuevoController);

        if (ui.searchLoading) {
            ui.searchLoading.classList.add('is-active');
        }

        try {
            const respuesta = await fetch(`${url}?busqueda=${encodeURIComponent(termino)}`, {
                signal: nuevoController.signal,
            });

            const datos = await respuesta.json();

            if (!datos.ok || !Array.isArray(datos.productos)) {
                renderizarResultados([], ui, estado);
                return;
            }

            renderizarResultados(datos.productos, ui, estado);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error buscando productos:', error);
            }
        } finally {
            if (ui.searchLoading) {
                ui.searchLoading.classList.remove('is-active');
            }
        }
    }

    function renderizarResultados(productos, ui, estado) {
        if (!ui.panelResultados) return;

        if (ui.conteoResultados) {
            ui.conteoResultados.textContent = productos.length;
        }

        ui.panelResultados.hidden = false;

        if (productos.length === 0) {
            ui.panelResultados.innerHTML = `
                <div class="ventas-empty-results">
                    <strong>Sin resultados</strong>
                    <span>Prueba con otro término.</span>
                </div>
            `;
            return;
        }

        ui.panelResultados.innerHTML = productos.map(function (producto) {
            return construirResultadoProducto(producto, estado);
        }).join('');
    }

    function construirResultadoProducto(producto, estado) {
        const stockDisponible = numero(producto.stock_disponible);
        const controlaInventario = numero(producto.controla_inventario) === 1;
        const permiteDecimal = numero(producto.permite_cantidad_decimal) === 1;
        const manejaIva = numero(producto.maneja_iva) === 1;
        const puedeVenderProducto = Boolean(producto.puede_vender);
        const unidad = producto.unidad_abreviatura || 'und';

        const disabled = estado.puedeVender && puedeVenderProducto ? '' : 'disabled';
        const claseDisabled = puedeVenderProducto ? '' : 'is-disabled';

        const stockTexto = controlaInventario
            ? `${formatearCantidad(stockDisponible)} ${escaparHtml(unidad)}`
            : 'Libre';

        const ivaTexto = manejaIva
            ? `<span class="ventas-iva-tag">${numero(producto.porcentaje_iva)}%</span>`
            : '';

        return `
            <div
                class="ventas-result-item ${claseDisabled}"
                data-product-id="${producto.id_producto}"
                data-product-name="${escaparHtml(producto.nombre)}"
                data-product-price="${numero(producto.precio_venta)}"
                data-product-stock="${stockDisponible}"
                data-product-controls-stock="${controlaInventario ? 1 : 0}"
                data-product-decimal="${permiteDecimal ? 1 : 0}"
                data-product-unit="${escaparHtml(unidad)}"
                data-product-tax="${numero(producto.porcentaje_iva)}"
                data-product-has-tax="${manejaIva ? 1 : 0}"
                data-product-price-includes-tax="${numero(producto.precio_incluye_iva)}"
                data-product-can-sell="${puedeVenderProducto ? 1 : 0}"
            >
                <div class="ventas-result-info">
                    <span class="ventas-result-name">${escaparHtml(producto.nombre)}</span>
                    <span class="ventas-result-stock">${stockTexto}</span>
                </div>

                <span class="ventas-result-price">
                    ${formatearPesos(producto.precio_venta)}
                    ${ivaTexto}
                </span>

                <button
                    type="button"
                    class="ventas-add-button"
                    data-add-product-id="${producto.id_producto}"
                    ${disabled}
                >
                    +
                </button>
            </div>
        `;
    }

    function inicializarCarrito(ui, estado) {
        if (ui.panelResultados) {
            ui.panelResultados.addEventListener('click', function (evento) {
                const filaProducto = evento.target.closest('.ventas-result-item');
                if (!filaProducto) return;

                if (filaProducto.classList.contains('is-disabled')) return;

                const botonAgregar = evento.target.closest('.ventas-add-button');
                if (botonAgregar && botonAgregar.disabled) return;

                agregarProductoDesdeElemento(filaProducto, ui, estado);
            });
        }

        if (ui.carritoItems) {
            ui.carritoItems.addEventListener('click', function (evento) {
                const boton = evento.target.closest('[data-cart-action]');
                if (!boton) return;

                const idProducto = Number(boton.dataset.productId);
                const accion = boton.dataset.cartAction;

                if (accion === 'sumar') {
                    cambiarCantidadProducto(idProducto, 1, ui, estado);
                    return;
                }

                if (accion === 'restar') {
                    cambiarCantidadProducto(idProducto, -1, ui, estado);
                    return;
                }

                if (accion === 'eliminar') {
                    eliminarProducto(idProducto, ui, estado);
                }
            });

            ui.carritoItems.addEventListener('change', function (evento) {
                const inputCantidad = evento.target.closest('[data-cart-quantity]');
                if (!inputCantidad) return;

                const idProducto = Number(inputCantidad.dataset.productId);
                actualizarCantidadManual(idProducto, inputCantidad.value, ui, estado);
            });
        }
    }

    function agregarProductoDesdeElemento(elementoProducto, ui, estado) {
        if (!estado.puedeVender) {
            mostrarAviso('Debes abrir caja antes de vender.', 'error');
            return;
        }

        const producto = leerProductoDesdeElemento(elementoProducto);

        if (!producto.puedeVender) {
            mostrarAviso('Este producto no está disponible para la venta.', 'error');
            return;
        }

        const itemExistente = estado.carrito.find(function (item) {
            return item.idProducto === producto.idProducto;
        });

        if (itemExistente) {
            const nuevaCantidad = itemExistente.cantidad + 1;

            if (!cantidadValidaParaProducto(nuevaCantidad, itemExistente)) {
                mostrarAviso('La cantidad supera el stock disponible.', 'error');
                return;
            }

            itemExistente.cantidad = normalizarCantidad(nuevaCantidad, itemExistente.permiteDecimal);
        } else {
            estado.carrito.push({
                ...producto,
                cantidad: 1,
            });
        }

        renderizarCarrito(ui, estado);
        recalcularTodo(ui, estado);

        if (ui.inputBusqueda) {
            ui.inputBusqueda.value = '';
            ui.inputBusqueda.focus();
        }

        ocultarResultadosProductos(ui);
    }

    function leerProductoDesdeElemento(elemento) {
        return {
            idProducto: Number(elemento.dataset.productId),
            nombre: elemento.dataset.productName || 'Producto',
            precio: numero(elemento.dataset.productPrice),
            stock: numero(elemento.dataset.productStock),
            controlaInventario: elemento.dataset.productControlsStock === '1',
            permiteDecimal: elemento.dataset.productDecimal === '1',
            unidad: elemento.dataset.productUnit || 'und',
            porcentajeIva: numero(elemento.dataset.productTax),
            manejaIva: elemento.dataset.productHasTax === '1',
            precioIncluyeIva: elemento.dataset.productPriceIncludesTax === '1',
            puedeVender: elemento.dataset.productCanSell === '1',
        };
    }

    function cambiarCantidadProducto(idProducto, delta, ui, estado) {
        const item = estado.carrito.find(function (producto) {
            return producto.idProducto === idProducto;
        });

        if (!item) return;

        const nuevaCantidad = item.cantidad + delta;

        if (nuevaCantidad <= 0) {
            eliminarProducto(idProducto, ui, estado);
            return;
        }

        if (!cantidadValidaParaProducto(nuevaCantidad, item)) {
            mostrarAviso('La cantidad supera el stock disponible.', 'error');
            return;
        }

        item.cantidad = normalizarCantidad(nuevaCantidad, item.permiteDecimal);

        renderizarCarrito(ui, estado);
        recalcularTodo(ui, estado);
    }

    function actualizarCantidadManual(idProducto, valor, ui, estado) {
        const item = estado.carrito.find(function (producto) {
            return producto.idProducto === idProducto;
        });

        if (!item) return;

        let nuevaCantidad = numero(valor);

        if (!item.permiteDecimal) {
            nuevaCantidad = Math.trunc(nuevaCantidad);
        }

        if (nuevaCantidad <= 0) {
            eliminarProducto(idProducto, ui, estado);
            return;
        }

        if (!cantidadValidaParaProducto(nuevaCantidad, item)) {
            mostrarAviso('La cantidad supera el stock disponible.', 'error');
            renderizarCarrito(ui, estado);
            recalcularTodo(ui, estado);
            return;
        }

        item.cantidad = normalizarCantidad(nuevaCantidad, item.permiteDecimal);

        renderizarCarrito(ui, estado);
        recalcularTodo(ui, estado);
    }

    function eliminarProducto(idProducto, ui, estado) {
        estado.carrito = estado.carrito.filter(function (producto) {
            return producto.idProducto !== idProducto;
        });

        if (estado.carrito.length === 0) {
            estado.usuarioEditoPago = false;
        }

        renderizarCarrito(ui, estado);
        recalcularTodo(ui, estado);
    }

    function renderizarCarrito(ui, estado) {
        if (!ui.carritoItems) return;

        if (estado.carrito.length === 0) {
            ui.carritoItems.innerHTML = `
                <tr class="ventas-cart-empty-row">
                    <td colspan="7">
                        <div class="ventas-cart-empty">
                            <strong>Carrito vacío</strong>
                            <span>Busca un producto y agrégalo con el botón +.</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        ui.carritoItems.innerHTML = estado.carrito.map(function (item, indice) {
            const resumenLinea = calcularLinea(item);
            const step = item.permiteDecimal ? '0.001' : '1';
            const minimo = item.permiteDecimal ? '0.001' : '1';
            const cantidad = item.permiteDecimal ? item.cantidad : Math.trunc(item.cantidad);

            return `
                <tr class="ventas-cart-row">
                    <td class="text-center">
                        <span class="ventas-line-index">${indice + 1}</span>
                    </td>

                    <td>
                        <div class="ventas-cart-product">
                            <strong>${escaparHtml(item.nombre)}</strong>
                            <small>${escaparHtml(item.unidad)} · ${item.manejaIva ? `IVA ${item.porcentajeIva}%` : 'Sin IVA'}</small>
                        </div>
                    </td>

                    <td class="text-center">
                        <div class="ventas-cart-qty">
                            <button
                                type="button"
                                data-cart-action="restar"
                                data-product-id="${item.idProducto}"
                                aria-label="Restar cantidad"
                            >
                                −
                            </button>

                            <input
                                type="number"
                                data-cart-quantity
                                data-product-id="${item.idProducto}"
                                min="${minimo}"
                                step="${step}"
                                value="${cantidad}"
                            >

                            <button
                                type="button"
                                data-cart-action="sumar"
                                data-product-id="${item.idProducto}"
                                aria-label="Sumar cantidad"
                            >
                                +
                            </button>
                        </div>
                    </td>

                    <td class="text-right">
                        <strong>${formatearPesos(item.precio)}</strong>
                    </td>

                    <td class="text-right">
                        <strong>${formatearPesos(resumenLinea.iva)}</strong>
                    </td>

                    <td class="text-right">
                        <strong>${formatearPesos(resumenLinea.total)}</strong>
                    </td>

                    <td class="text-center">
                        <button
                            type="button"
                            class="ventas-cart-remove"
                            data-cart-action="eliminar"
                            data-product-id="${item.idProducto}"
                            aria-label="Eliminar producto"
                        >
                            ×
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function inicializarPago(ui, estado) {
        if (ui.montoPagadoPrincipal) {
            ui.montoPagadoPrincipal.addEventListener('input', function () {
                estado.usuarioEditoPago = true;
                recalcularTodo(ui, estado);
            });

            ui.montoPagadoPrincipal.addEventListener('wheel', function (evento) {
                if (document.activeElement === ui.montoPagadoPrincipal) {
                    evento.preventDefault();
                    ui.montoPagadoPrincipal.blur();
                }
            }, { passive: false });
        }

        if (ui.medioPagoPrincipal) {
            ui.medioPagoPrincipal.addEventListener('change', function () {
                const hayCarrito = estado.carrito.length > 0 && estado.puedeVender;
                actualizarReferenciaPago(ui, hayCarrito);
                actualizarInfoPago(ui, estado);
            });
        }

        if (ui.carritoItems) {
            ui.carritoItems.addEventListener('wheel', function (evento) {
                const inputNumero = evento.target.closest('input[type="number"]');
                if (!inputNumero) return;

                evento.preventDefault();
                inputNumero.blur();
            }, { passive: false });
        }

        actualizarReferenciaPago(ui, false);
    }
    function actualizarReferenciaPago(ui, hayCarrito) {
        if (!ui.medioPagoPrincipal || !ui.referenciaPagoPrincipal) return;

        const opcionSeleccionada = ui.medioPagoPrincipal.selectedOptions[0];

        if (!opcionSeleccionada || !hayCarrito) {
            ui.referenciaPagoPrincipal.disabled = true;
            return;
        }

        const tipo = opcionSeleccionada.dataset.paymentType || '';
        const requiereReferencia = opcionSeleccionada.dataset.requiresReference === '1';

        ui.referenciaPagoPrincipal.disabled = !(requiereReferencia || tipo === 'transferencia' || tipo === 'tarjeta');
    }

    function inicializarAcciones(ui, estado) {
        if (ui.botonLimpiar) {
            ui.botonLimpiar.addEventListener('click', function () {
                limpiarVentaActual(ui, estado);
            });
        }

        if (ui.botonPendiente) {
            ui.botonPendiente.addEventListener('click', function () {
                mostrarAviso('Ventas pendientes se conectará después.', 'ok');
            });
        }

        if (ui.botonCobrar) {
            ui.botonCobrar.addEventListener('click', async function () {
                if (estado.enviandoVenta) {
                    return;
                }

                const resumen = calcularResumen(estado.carrito);
                const pagado = obtenerMontoPagado(ui);

                if (!estado.puedeVender) {
                    mostrarAviso('Debes abrir caja antes de cobrar.', 'error');
                    return;
                }

                if (estado.carrito.length === 0) {
                    mostrarAviso('Agrega productos antes de cobrar.', 'error');
                    return;
                }

                if (pagado < resumen.total) {
                    mostrarAviso('El monto recibido no cubre el total.', 'error');
                    return;
                }

                const payload = construirPayloadVenta(ui, estado);

                if (!payload.ok) {
                    mostrarAviso(payload.mensaje, 'error');
                    return;
                }

                await enviarVentaAlBackend(payload.datos, ui, estado);
            });
        }
    }

    function limpiarVentaActual(ui, estado) {
        estado.carrito = [];
        estado.usuarioEditoPago = false;

        if (ui.montoPagadoPrincipal) ui.montoPagadoPrincipal.value = '';
        if (ui.referenciaPagoPrincipal) ui.referenciaPagoPrincipal.value = '';

        renderizarCarrito(ui, estado);
        recalcularTodo(ui, estado);

        if (ui.inputBusqueda) {
            ui.inputBusqueda.focus();
        }
    }

    function construirPayloadVenta(ui, estado) {
        const idMedioPago = Number(ui.medioPagoPrincipal ? ui.medioPagoPrincipal.value : 0);
        const montoRecibido = obtenerMontoPagado(ui);

        if (!Number.isInteger(idMedioPago) || idMedioPago <= 0) {
            return {
                ok: false,
                mensaje: 'Selecciona un medio de pago válido.',
            };
        }

        const idClienteSeleccionado = Number(ui.inputCliente?.dataset.selectedClientId || 0);

        return {
            ok: true,
            datos: {
                id_cliente: Number.isInteger(idClienteSeleccionado) && idClienteSeleccionado > 0
                    ? idClienteSeleccionado
                    : null,
                fecha_venta: ui.fechaVenta ? ui.fechaVenta.value : '',
                items: estado.carrito.map(function (item) {
                    return {
                        id_producto: item.idProducto,
                        cantidad: item.cantidad,
                    };
                }),
                pago: {
                    id_medio_pago: idMedioPago,
                    monto_recibido: montoRecibido,
                    referencia: ui.referenciaPagoPrincipal
                        ? ui.referenciaPagoPrincipal.value.trim()
                        : '',
                },
            },
        };
    }

    async function enviarVentaAlBackend(payload, ui, estado) {
        estado.enviandoVenta = true;

        const textoOriginalBoton = ui.botonCobrar ? ui.botonCobrar.textContent : '';

        if (ui.botonCobrar) {
            ui.botonCobrar.disabled = true;
            ui.botonCobrar.textContent = 'Guardando...';
        }

        try {
            const respuesta = await fetch('/ventas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                mostrarAviso(datos.mensaje || 'No se pudo registrar la venta.', 'error');
                return;
            }

            limpiarVentaActual(ui, estado);

            mostrarAviso(
                `Venta ${datos.venta.numero_venta} registrada correctamente.`,
                'ok'
            );
        } catch (error) {
            console.error('Error enviando venta:', error);
            mostrarAviso('Error de conexión registrando la venta.', 'error');
        } finally {
            estado.enviandoVenta = false;

            if (ui.botonCobrar) {
                ui.botonCobrar.textContent = textoOriginalBoton || 'Cobrar';
            }

            recalcularTodo(ui, estado);
        }
    }

    function recalcularTodo(ui, estado) {
        const resumen = calcularResumen(estado.carrito);

        actualizarResumenFactura(ui, resumen);
        actualizarPago(ui, estado, resumen);
        actualizarBotones(ui, estado, resumen);
        actualizarInfoPago(ui, estado);
    }

    function actualizarInfoPago(ui, estado) {
        if (ui.infoPagoCliente && ui.inputCliente) {
            ui.infoPagoCliente.textContent = ui.inputCliente.value.trim() || 'Consumidor final';
        }

        const documentoCliente = document.getElementById('clienteDocumentoActual');
        if (ui.infoPagoDocumento && documentoCliente) {
            ui.infoPagoDocumento.textContent = documentoCliente.textContent.trim() || '0000000000';
        }

        if (ui.infoPagoMedio && ui.medioPagoPrincipal) {
            const opcion = ui.medioPagoPrincipal.selectedOptions[0];
            ui.infoPagoMedio.textContent = opcion
                ? opcion.textContent.trim()
                : 'Sin medio seleccionado';
        }

        if (ui.infoPagoItems) {
            ui.infoPagoItems.textContent = String(estado.carrito.length);
        }
    }

    function calcularLinea(item) {
        const brutoLinea = item.precio * item.cantidad;
        let subtotalLinea = brutoLinea;
        let ivaLinea = 0;

        if (item.manejaIva && item.porcentajeIva > 0) {
            if (item.precioIncluyeIva) {
                subtotalLinea = brutoLinea / (1 + item.porcentajeIva / 100);
                ivaLinea = brutoLinea - subtotalLinea;
            } else {
                ivaLinea = brutoLinea * (item.porcentajeIva / 100);
            }
        }

        return {
            subtotal: subtotalLinea,
            iva: ivaLinea,
            total: subtotalLinea + ivaLinea,
        };
    }

    function calcularResumen(carrito) {
        return carrito.reduce(function (resumen, item) {
            const linea = calcularLinea(item);

            resumen.cantidadItems += item.cantidad;
            resumen.subtotal += linea.subtotal;
            resumen.iva += linea.iva;
            resumen.total += linea.total;

            return resumen;
        }, {
            cantidadItems: 0,
            subtotal: 0,
            descuento: 0,
            iva: 0,
            total: 0,
        });
    }

    function actualizarResumenFactura(ui, resumen) {
        asignarTexto(ui.resumenCantidadItems, formatearCantidad(resumen.cantidadItems));
        asignarTexto(ui.resumenSubtotal, formatearPesos(resumen.subtotal));
        asignarTexto(ui.resumenDescuento, formatearPesos(resumen.descuento));
        asignarTexto(ui.resumenIva, formatearPesos(resumen.iva));
        asignarTexto(ui.resumenTotal, formatearPesos(resumen.total));
    }

    function actualizarPago(ui, estado, resumen) {
        const hayCarrito = estado.carrito.length > 0 && estado.puedeVender;

        if (ui.montoPagadoPrincipal) {
            ui.montoPagadoPrincipal.disabled = !hayCarrito;

            if (!hayCarrito) {
                ui.montoPagadoPrincipal.value = '';
                estado.usuarioEditoPago = false;
            } else if (!estado.usuarioEditoPago) {
                ui.montoPagadoPrincipal.value = Math.round(resumen.total);
            }
        }

        if (ui.medioPagoPrincipal) {
            ui.medioPagoPrincipal.disabled = !hayCarrito;
        }

        actualizarReferenciaPago(ui, hayCarrito);

        const pagado = obtenerMontoPagado(ui);
        const saldo = Math.max(resumen.total - pagado, 0);
        const cambio = Math.max(pagado - resumen.total, 0);

        asignarTexto(ui.resumenPagado, formatearPesos(pagado));
        asignarTexto(ui.resumenSaldo, formatearPesos(saldo));
        asignarTexto(ui.resumenCambio, formatearPesos(cambio));
    }

    function actualizarBotones(ui, estado, resumen) {
        const hayCarrito = estado.carrito.length > 0;
        const pagado = obtenerMontoPagado(ui);
        const puedeCobrar = estado.puedeVender && hayCarrito && pagado >= resumen.total && resumen.total > 0;

        if (ui.botonLimpiar) {
            ui.botonLimpiar.disabled = !hayCarrito;
        }

        if (ui.botonPendiente) {
            ui.botonPendiente.disabled = !hayCarrito;
        }

        if (ui.botonCobrar) {
            ui.botonCobrar.disabled = !puedeCobrar;
        }
    }

    function obtenerMontoPagado(ui) {
        if (!ui.montoPagadoPrincipal) return 0;
        return numero(ui.montoPagadoPrincipal.value);
    }

    function cantidadValidaParaProducto(cantidad, item) {
        if (!item.controlaInventario) return true;
        return cantidad <= item.stock;
    }

    function normalizarCantidad(cantidad, permiteDecimal) {
        if (!permiteDecimal) return Math.trunc(cantidad);
        return Math.round(cantidad * 1000) / 1000;
    }

    function numero(valor) {
        const convertido = Number(valor);
        return Number.isFinite(convertido) ? convertido : 0;
    }

    function formatearPesos(valor) {
        const numeroRedondeado = Math.round(numero(valor));
        return '$ ' + numeroRedondeado.toLocaleString('es-CO');
    }

    function formatearCantidad(valor) {
        const cantidad = numero(valor);

        return cantidad.toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        });
    }

    function asignarTexto(elemento, texto) {
        if (elemento) {
            elemento.textContent = texto;
        }
    }

    function escaparHtml(valor) {
        const div = document.createElement('div');
        div.textContent = String(valor || '');
        return div.innerHTML;
    }

    function mostrarAviso(mensaje, tipo) {
        let aviso = document.querySelector('.ventas-toast');

        if (!aviso) {
            aviso = document.createElement('div');
            aviso.className = 'ventas-toast';
            document.body.appendChild(aviso);
        }

        aviso.textContent = mensaje;
        aviso.classList.remove('is-ok', 'is-error', 'is-visible');
        aviso.classList.add(tipo === 'error' ? 'is-error' : 'is-ok');

        window.requestAnimationFrame(function () {
            aviso.classList.add('is-visible');
        });

        window.clearTimeout(aviso._timeout);

        aviso._timeout = window.setTimeout(function () {
            aviso.classList.remove('is-visible');
        }, 2600);
    }
})();