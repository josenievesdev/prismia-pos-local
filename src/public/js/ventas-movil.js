(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', iniciarPOSMovil);

    const estado = {
        carrito: [],
        scanner: null,
        scannerActivo: false,
        ultimoCodigo: '',
        ultimoCodigoEn: 0,
        audioContext: null,
        enviando: false,
    };
    function iniciarPOSMovil() {
        const ui = obtenerUI();

        inicializarClienteMovil(ui);
        inicializarBusqueda(ui);
        inicializarScanner(ui);
        inicializarCarrito(ui);
        inicializarPago(ui);
        inicializarFacturacion(ui);
        renderizarCarrito(ui);
    }

    function obtenerUI() {
        return {
            shell: document.querySelector('.pos-movil'),

            inputCliente: document.getElementById('buscarClienteMovil'),
            resultadosClientes: document.getElementById('resultadosClientesMovil'),
            clienteActual: document.getElementById('clienteActualMovil'),
            btnClienteFinal: document.getElementById('btnClienteFinalMovil'),

            formBuscar: document.getElementById('formBuscarCodigoMovil'),
            inputCodigo: document.getElementById('inputCodigoMovil'),
            resultados: document.getElementById('resultadosProductosMovil'),

            btnIniciarScanner: document.getElementById('btnIniciarScannerMovil'),
            btnDetenerScanner: document.getElementById('btnDetenerScannerMovil'),
            estadoScanner: document.getElementById('estadoScannerMovil'),
            lector: document.getElementById('lectorCodigoMovil'),

            carrito: document.getElementById('carritoMovil'),
            conteoCarrito: document.getElementById('conteoCarritoMovil'),

            subtotal: document.getElementById('subtotalMovil'),
            iva: document.getElementById('ivaMovil'),
            total: document.getElementById('totalMovil'),

            medioPago: document.getElementById('medioPagoMovil'),
            montoRecibido: document.getElementById('montoRecibidoMovil'),
            referencia: document.getElementById('referenciaPagoMovil'),

            listaPagos: document.getElementById('listaPagosMovil'),
            btnAgregarPago: document.getElementById('btnAgregarPagoMovil'),
            resumenPagos: document.getElementById('resumenPagosMovil'),

            btnFacturar: document.getElementById('btnFacturarMovil'),
            mensaje: document.getElementById('mensajeMovil'),
        };
    }

    function puedeVender(ui) {
        return Boolean(ui.shell && ui.shell.dataset.puedeVender === '1');
    }

    function formatearPesos(valor) {
        return '$ ' + Math.round(Number(valor || 0)).toLocaleString('es-CO');
    }

    function numero(valor) {
        const n = Number(valor || 0);
        return Number.isFinite(n) ? n : 0;
    }

    function mostrarMensaje(ui, tipo, texto, htmlExtra) {
        if (!ui.mensaje) return;

        ui.mensaje.hidden = false;
        ui.mensaje.className = 'pos-movil-message ' + tipo;
        ui.mensaje.innerHTML = texto + (htmlExtra || '');
    }

    function limpiarMensaje(ui) {
        if (!ui.mensaje) return;

        ui.mensaje.hidden = true;
        ui.mensaje.textContent = '';
        ui.mensaje.className = 'pos-movil-message';
    }

    function inicializarClienteMovil(ui) {
        if (!ui.inputCliente || !ui.resultadosClientes) {
            return;
        }

        const nombreInicial = ui.inputCliente.value || 'Consumidor final';
        const idInicial = ui.inputCliente.dataset.selectedClientId || '';
        const documentoInicial = ui.clienteActual ? ui.clienteActual.textContent.trim() : 'Consumidor final';

        ui.inputCliente.dataset.defaultName = nombreInicial;
        ui.inputCliente.dataset.defaultClientId = idInicial;
        ui.inputCliente.dataset.defaultDocument = documentoInicial;

        let temporizador = null;
        let abortController = null;

        ui.inputCliente.addEventListener('input', function () {
            clearTimeout(temporizador);

            const termino = ui.inputCliente.value.trim();
            ui.inputCliente.dataset.selectedClientId = '';

            if (ui.clienteActual) {
                ui.clienteActual.textContent = 'Sin cliente seleccionado. Se usará consumidor final si no eliges uno.';
            }

            if (!termino) {
                ocultarClientesMovil(ui);
                return;
            }

            temporizador = window.setTimeout(function () {
                buscarClientesMovil(ui, termino, abortController, function (nuevoController) {
                    abortController = nuevoController;
                });
            }, 180);
        });

        ui.inputCliente.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') {
                ocultarClientesMovil(ui);
                ui.inputCliente.blur();
            }
        });

        ui.resultadosClientes.addEventListener('click', function (evento) {
            const item = evento.target.closest('[data-mobile-client-id]');

            if (!item) {
                return;
            }

            seleccionarClienteMovil(ui, item);
        });

        if (ui.btnClienteFinal) {
            ui.btnClienteFinal.addEventListener('click', function () {
                ui.inputCliente.value = ui.inputCliente.dataset.defaultName || 'Consumidor final';
                ui.inputCliente.dataset.selectedClientId = ui.inputCliente.dataset.defaultClientId || '';

                if (ui.clienteActual) {
                    ui.clienteActual.textContent = ui.inputCliente.dataset.defaultDocument || 'Consumidor final';
                }

                ocultarClientesMovil(ui);
            });
        }
    }

    async function buscarClientesMovil(ui, termino, abortControllerActual, setAbortController) {
        if (abortControllerActual) {
            abortControllerActual.abort();
        }

        const nuevoController = new AbortController();
        setAbortController(nuevoController);

        const url = ui.inputCliente.dataset.searchClientsUrl || '/ventas/clientes/buscar';

        try {
            const respuesta = await fetch(url + '?busqueda=' + encodeURIComponent(termino), {
                signal: nuevoController.signal,
            });

            const data = await respuesta.json();

            if (!respuesta.ok || !data.ok) {
                throw new Error(data.mensaje || 'No se pudo buscar clientes.');
            }

            renderizarClientesMovil(ui, Array.isArray(data.clientes) ? data.clientes : []);
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            renderizarClientesMovil(ui, []);
        }
    }

    function renderizarClientesMovil(ui, clientes) {
        if (!ui.resultadosClientes) {
            return;
        }

        if (!clientes.length) {
            ui.resultadosClientes.hidden = false;
            ui.resultadosClientes.innerHTML = `
            <div class="pos-movil-client-empty">
                No se encontraron clientes.
            </div>
        `;
            return;
        }

        ui.resultadosClientes.hidden = false;
        ui.resultadosClientes.innerHTML = clientes.map(function (cliente) {
            const nombre = escapar(cliente.nombre || cliente.razon_social || cliente.nombre_comercial || 'Cliente');
            const documento = escapar(cliente.etiqueta_documento || cliente.documento || 'Sin documento');
            const secundario = escapar(cliente.texto_secundario || cliente.telefono || cliente.correo || '');

            return `
            <button
                type="button"
                class="pos-movil-client-result"
                data-mobile-client-id="${cliente.id_cliente}"
                data-mobile-client-name="${nombre}"
                data-mobile-client-document="${documento}"
            >
                <strong>${nombre}</strong>
                <small>${documento}${secundario ? ' · ' + secundario : ''}</small>
            </button>
        `;
        }).join('');
    }

    function seleccionarClienteMovil(ui, item) {
        const idCliente = item.dataset.mobileClientId || '';
        const nombre = item.dataset.mobileClientName || 'Cliente';
        const documento = item.dataset.mobileClientDocument || '';

        ui.inputCliente.value = nombre;
        ui.inputCliente.dataset.selectedClientId = idCliente;

        if (ui.clienteActual) {
            ui.clienteActual.textContent = documento || 'Cliente seleccionado';
        }

        ocultarClientesMovil(ui);

        if (ui.inputCodigo) {
            ui.inputCodigo.focus();
        }
    }

    function ocultarClientesMovil(ui) {
        if (!ui.resultadosClientes) {
            return;
        }

        ui.resultadosClientes.hidden = true;
        ui.resultadosClientes.innerHTML = '';
    }

    function obtenerIdClienteMovil(ui) {
        const idCliente = Number(ui.inputCliente && ui.inputCliente.dataset.selectedClientId || 0);

        return Number.isInteger(idCliente) && idCliente > 0
            ? idCliente
            : null;
    }

    function inicializarBusqueda(ui) {
        if (!ui.formBuscar || !ui.inputCodigo) return;

        ui.formBuscar.addEventListener('submit', function (evento) {
            evento.preventDefault();

            const termino = ui.inputCodigo.value.trim();

            if (!termino) {
                return;
            }

            buscarYMostrarProductos(ui, termino, true);
        });

        ui.inputCodigo.addEventListener('keydown', function (evento) {
            if (evento.key !== 'Enter') {
                return;
            }

            evento.preventDefault();

            const termino = ui.inputCodigo.value.trim();

            if (!termino) {
                return;
            }

            buscarYMostrarProductos(ui, termino, true);
        });

        setTimeout(function () {
            ui.inputCodigo.focus();
        }, 250);
    }

    async function buscarYMostrarProductos(ui, termino, agregarSiExacto) {
        limpiarMensaje(ui);

        const url = ui.shell.dataset.searchProductsUrl || '/ventas/productos/buscar';

        try {
            const respuesta = await fetch(url + '?busqueda=' + encodeURIComponent(termino));
            const data = await respuesta.json();

            if (!respuesta.ok || !data.ok) {
                throw new Error(data.mensaje || 'No se pudo buscar el producto.');
            }

            const productos = Array.isArray(data.productos) ? data.productos : [];

            if (!productos.length) {
                renderizarResultados(ui, []);
                mostrarMensaje(ui, 'error', 'No se encontró producto para: ' + termino);
                return;
            }

            const exacto = encontrarProductoExacto(productos, termino);

            if (agregarSiExacto && exacto) {
                agregarProducto(ui, exacto);
                ui.inputCodigo.value = '';
                renderizarResultados(ui, []);
                return;
            }

            if (agregarSiExacto && productos.length === 1) {
                agregarProducto(ui, productos[0]);
                ui.inputCodigo.value = '';
                renderizarResultados(ui, []);
                return;
            }

            renderizarResultados(ui, productos);
        } catch (error) {
            mostrarMensaje(ui, 'error', error.message || 'Error buscando producto.');
        }
    }

    function encontrarProductoExacto(productos, termino) {
        const codigo = String(termino || '').trim().toLowerCase();

        return productos.find(function (producto) {
            return String(producto.codigo_barras || '').trim().toLowerCase() === codigo
                || String(producto.codigo_interno || '').trim().toLowerCase() === codigo;
        }) || null;
    }

    function renderizarResultados(ui, productos) {
        if (!ui.resultados) return;

        if (!productos.length) {
            ui.resultados.hidden = true;
            ui.resultados.innerHTML = '';
            return;
        }

        ui.resultados.hidden = false;
        ui.resultados.innerHTML = productos.map(function (producto) {
            return `
                <article class="pos-product-result">
                    <div>
                        <strong>${escapar(producto.nombre || 'Producto')}</strong>
                        <small>${escapar(producto.codigo_interno || 'Sin código')} · Stock ${Number(producto.stock_disponible || 0)}</small>
                    </div>

                    <div class="pos-product-result-footer">
                        <span class="pos-product-price">${formatearPesos(producto.precio_venta)}</span>
                        <button type="button" class="pos-btn primary" data-add-product="${producto.id_producto}">
                            Agregar
                        </button>
                    </div>
                </article>
            `;
        }).join('');

        ui.resultados.querySelectorAll('[data-add-product]').forEach(function (boton) {
            boton.addEventListener('click', function () {
                const id = Number(boton.dataset.addProduct);
                const producto = productos.find(function (item) {
                    return Number(item.id_producto) === id;
                });

                if (producto) {
                    agregarProducto(ui, producto);
                    ui.inputCodigo.value = '';
                    renderizarResultados(ui, []);
                }
            });
        });
    }

    function escapar(valor) {
        return String(valor || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function agregarProducto(ui, producto) {
        if (!puedeVender(ui)) {
            mostrarMensaje(ui, 'error', 'Debes abrir caja antes de facturar.');
            return;
        }

        if (!producto.puede_vender) {
            mostrarMensaje(ui, 'error', 'Este producto no está disponible para venta.');
            return;
        }

        const idProducto = Number(producto.id_producto);
        const existente = estado.carrito.find(function (item) {
            return item.id_producto === idProducto;
        });

        const controlaInventario = Number(producto.controla_inventario || 0) === 1;
        const stockDisponible = numero(producto.stock_disponible);
        const cantidadActual = existente ? existente.cantidad : 0;

        if (controlaInventario && cantidadActual + 1 > stockDisponible) {
            mostrarMensaje(ui, 'error', 'No hay stock suficiente para agregar más unidades.');
            return;
        }

        if (existente) {
            existente.cantidad += 1;
        } else {
            estado.carrito.push({
                id_producto: idProducto,
                nombre: producto.nombre || 'Producto',
                codigo_interno: producto.codigo_interno || '',
                unidad_abreviatura: producto.unidad_abreviatura || 'und',
                precio_venta: numero(producto.precio_venta),
                porcentaje_iva: numero(producto.porcentaje_iva),
                maneja_iva: Number(producto.maneja_iva || 0),
                precio_incluye_iva: Number(producto.precio_incluye_iva || 0),
                controla_inventario: Number(producto.controla_inventario || 0),
                stock_disponible: stockDisponible,
                cantidad: 1,
            });
        }

        renderizarCarrito(ui);
        mostrarMensaje(ui, 'success', 'Producto agregado: ' + escapar(producto.nombre || 'Producto'));

        setTimeout(function () {
            limpiarMensaje(ui);
        }, 1300);
    }

    function inicializarCarrito(ui) {
        if (!ui.carrito) return;

        ui.carrito.addEventListener('click', function (evento) {
            const btn = evento.target.closest('[data-cart-action]');

            if (!btn) return;

            const id = Number(btn.dataset.productId);
            const accion = btn.dataset.cartAction;

            if (accion === 'sumar') cambiarCantidad(ui, id, 1);
            if (accion === 'restar') cambiarCantidad(ui, id, -1);
            if (accion === 'eliminar') eliminarProducto(ui, id);
        });

        ui.carrito.addEventListener('change', function (evento) {
            const input = evento.target.closest('[data-cart-qty]');

            if (!input) return;

            const id = Number(input.dataset.productId);
            const cantidad = numero(input.value);

            fijarCantidad(ui, id, cantidad);
        });
    }

    function cambiarCantidad(ui, idProducto, delta) {
        const item = estado.carrito.find(function (producto) {
            return producto.id_producto === idProducto;
        });

        if (!item) return;

        fijarCantidad(ui, idProducto, item.cantidad + delta);
    }

    function fijarCantidad(ui, idProducto, cantidad) {
        const item = estado.carrito.find(function (producto) {
            return producto.id_producto === idProducto;
        });

        if (!item) return;

        const nuevaCantidad = Math.max(0, cantidad);

        if (nuevaCantidad <= 0) {
            eliminarProducto(ui, idProducto);
            return;
        }

        if (item.controla_inventario === 1 && nuevaCantidad > item.stock_disponible) {
            mostrarMensaje(ui, 'error', 'No hay stock suficiente.');
            renderizarCarrito(ui);
            return;
        }

        item.cantidad = nuevaCantidad;
        renderizarCarrito(ui);
    }

    function eliminarProducto(ui, idProducto) {
        estado.carrito = estado.carrito.filter(function (producto) {
            return producto.id_producto !== idProducto;
        });

        renderizarCarrito(ui);
    }

    function calcularResumen() {
        return estado.carrito.reduce(function (resumen, item) {
            const totalLinea = item.precio_venta * item.cantidad;
            const ivaLinea = item.maneja_iva === 1 && item.precio_incluye_iva === 1
                ? totalLinea - (totalLinea / (1 + (item.porcentaje_iva / 100)))
                : item.maneja_iva === 1
                    ? totalLinea * (item.porcentaje_iva / 100)
                    : 0;

            resumen.subtotal += totalLinea - ivaLinea;
            resumen.iva += ivaLinea;
            resumen.total += totalLinea;

            return resumen;
        }, {
            subtotal: 0,
            iva: 0,
            total: 0,
        });
    }

    function renderizarCarrito(ui) {
        if (!ui.carrito) return;

        if (!estado.carrito.length) {
            ui.carrito.innerHTML = `
                <div class="pos-movil-empty">
                    <strong>Carrito vacío</strong>
                    <p>Escanea un producto para agregarlo.</p>
                </div>
            `;
        } else {
            ui.carrito.innerHTML = estado.carrito.map(function (item) {
                return `
                    <article class="pos-cart-item">
                        <div class="pos-cart-row">
                            <div class="pos-cart-main">
                                <strong>${escapar(item.nombre)}</strong>
                                <small>${escapar(item.codigo_interno)} · ${escapar(item.unidad_abreviatura)}</small>
                            </div>

                            <button type="button" class="pos-cart-remove" data-cart-action="eliminar" data-product-id="${item.id_producto}">
                                Quitar
                            </button>
                        </div>

                        <div class="pos-cart-row">
                            <div class="pos-cart-qty">
                                <button type="button" data-cart-action="restar" data-product-id="${item.id_producto}">−</button>
                                <input type="number" min="0" step="1" value="${item.cantidad}" data-cart-qty data-product-id="${item.id_producto}">
                                <button type="button" data-cart-action="sumar" data-product-id="${item.id_producto}">+</button>
                            </div>

                            <strong>${formatearPesos(item.precio_venta * item.cantidad)}</strong>
                        </div>
                    </article>
                `;
            }).join('');
        }

        const resumen = calcularResumen();

        ui.conteoCarrito.textContent = estado.carrito.length + ' ítem(s)';
        ui.subtotal.textContent = formatearPesos(resumen.subtotal);
        ui.iva.textContent = formatearPesos(resumen.iva);
        ui.total.textContent = formatearPesos(resumen.total);

        actualizarMontoPrincipalMovil(ui, resumen.total);
    }

    function inicializarPago(ui) {
        if (ui.listaPagos) {
            ui.listaPagos.addEventListener('input', function (evento) {
                const inputMonto = evento.target.closest('[data-mobile-payment-amount]');

                if (inputMonto) {
                    inputMonto.dataset.editado = '1';
                    actualizarResumenPagos(ui);
                }
            });

            ui.listaPagos.addEventListener('change', function (evento) {
                const selectMedio = evento.target.closest('[data-mobile-payment-method]');

                if (selectMedio) {
                    const fila = selectMedio.closest('[data-mobile-payment-row]');
                    actualizarReferenciaPagoMovilFila(fila);
                    actualizarResumenPagos(ui);
                }
            });

            ui.listaPagos.addEventListener('click', function (evento) {
                const botonQuitar = evento.target.closest('[data-mobile-payment-remove]');

                if (!botonQuitar) {
                    return;
                }

                const fila = botonQuitar.closest('[data-mobile-payment-row]');
                const filas = obtenerFilasPagoMovil(ui);

                if (!fila || filas.length <= 1) {
                    return;
                }

                fila.remove();
                actualizarPagosMovil(ui);
            });
        }

        if (ui.btnAgregarPago) {
            ui.btnAgregarPago.addEventListener('click', function () {
                agregarFilaPagoMovil(ui);
            });
        }

        actualizarPagosMovil(ui);
    }

    function obtenerFilasPagoMovil(ui) {
        if (!ui.listaPagos) {
            return [];
        }

        return Array.from(ui.listaPagos.querySelectorAll('[data-mobile-payment-row]'));
    }

    function obtenerCamposPagoMovilFila(fila) {
        return {
            medio: fila.querySelector('[data-mobile-payment-method]'),
            monto: fila.querySelector('[data-mobile-payment-amount]'),
            referencia: fila.querySelector('[data-mobile-payment-reference]'),
            quitar: fila.querySelector('[data-mobile-payment-remove]'),
        };
    }

    function obtenerPagosMovil(ui) {
        return obtenerFilasPagoMovil(ui).map(function (fila) {
            const campos = obtenerCamposPagoMovilFila(fila);
            const opcion = campos.medio ? campos.medio.selectedOptions[0] : null;

            return {
                fila,
                medio: campos.medio,
                monto: campos.monto,
                referencia: campos.referencia,
                opcion,
                id_medio_pago: Number(campos.medio ? campos.medio.value : 0),
                monto_recibido: numero(campos.monto ? campos.monto.value : 0),
                referencia_valor: campos.referencia ? campos.referencia.value.trim() : '',
                tipo: opcion ? opcion.dataset.paymentType || '' : '',
                afecta_efectivo: opcion ? opcion.dataset.affectsCash === '1' : false,
                requiere_referencia: opcion ? opcion.dataset.requiresReference === '1' : false,
                nombre: opcion ? opcion.textContent.trim() : 'Medio de pago',
            };
        });
    }

    function actualizarReferenciaPagoMovilFila(fila) {
        if (!fila) {
            return;
        }

        const campos = obtenerCamposPagoMovilFila(fila);

        if (!campos.medio || !campos.referencia) {
            return;
        }

        const opcion = campos.medio.selectedOptions[0];

        if (!opcion) {
            campos.referencia.disabled = true;
            campos.referencia.value = '';
            return;
        }

        const tipo = opcion.dataset.paymentType || '';
        const requiereReferencia = opcion.dataset.requiresReference === '1';

        campos.referencia.disabled = !(requiereReferencia || tipo === 'transferencia' || tipo === 'tarjeta');

        if (campos.referencia.disabled) {
            campos.referencia.value = '';
        }
    }

    function construirOpcionesPagoMovil(ui) {
        if (!ui.medioPago) {
            return '<option value="">Sin medios activos</option>';
        }

        return ui.medioPago.innerHTML;
    }

    function agregarFilaPagoMovil(ui) {
        if (!ui.listaPagos || !ui.medioPago) {
            return;
        }

        const fila = document.createElement('div');
        fila.className = 'pos-movil-payment-row';
        fila.setAttribute('data-mobile-payment-row', '');

        fila.innerHTML = `
        <label>
            <span>Medio de pago</span>
            <select data-mobile-payment-method>
                ${construirOpcionesPagoMovil(ui)}
            </select>
        </label>

        <label>
            <span>Recibido</span>
            <input
                type="number"
                data-mobile-payment-amount
                min="0"
                step="1"
                placeholder="0"
            >
        </label>

        <label>
            <span>Referencia</span>
            <input
                type="text"
                data-mobile-payment-reference
                placeholder="Opcional"
            >
        </label>

        <button
            type="button"
            class="pos-mobile-payment-remove"
            data-mobile-payment-remove
        >
            Quitar
        </button>
    `;

        ui.listaPagos.appendChild(fila);

        const campos = obtenerCamposPagoMovilFila(fila);

        if (campos.monto) {
            campos.monto.focus();
        }

        actualizarReferenciaPagoMovilFila(fila);
        actualizarPagosMovil(ui);
    }

    function actualizarPagosMovil(ui) {
        const filas = obtenerFilasPagoMovil(ui);

        filas.forEach(function (fila) {
            const campos = obtenerCamposPagoMovilFila(fila);

            if (campos.quitar) {
                campos.quitar.hidden = filas.length <= 1;
            }

            actualizarReferenciaPagoMovilFila(fila);
        });

        actualizarResumenPagos(ui);
    }

    function actualizarResumenPagos(ui) {
        if (!ui.resumenPagos) {
            return;
        }

        const pagos = obtenerPagosMovil(ui);
        const totalPagado = pagos.reduce(function (acumulado, pago) {
            return acumulado + pago.monto_recibido;
        }, 0);

        ui.resumenPagos.textContent = pagos.length > 1
            ? pagos.length + ' pagos · Recibido ' + formatearPesos(totalPagado)
            : 'Un solo pago';
    }

    function limpiarPagosMovil(ui) {
        const filas = obtenerFilasPagoMovil(ui);

        filas.forEach(function (fila, indice) {
            const campos = obtenerCamposPagoMovilFila(fila);

            if (indice === 0) {
                if (campos.monto) {
                    campos.monto.value = '';
                    campos.monto.dataset.editado = '';
                }

                if (campos.referencia) {
                    campos.referencia.value = '';
                }

                return;
            }

            fila.remove();
        });

        actualizarPagosMovil(ui);
    }

    function actualizarMontoPrincipalMovil(ui, total) {
        const filas = obtenerFilasPagoMovil(ui);

        if (filas.length !== 1) {
            actualizarResumenPagos(ui);
            return;
        }

        const campos = obtenerCamposPagoMovilFila(filas[0]);

        if (campos.monto && !campos.monto.dataset.editado) {
            campos.monto.value = Math.round(total || 0);
        }

        actualizarResumenPagos(ui);
    }

    function validarPagosMovil(ui, totalVenta) {
        const pagos = obtenerPagosMovil(ui);

        if (!pagos.length) {
            return {
                ok: false,
                mensaje: 'Registra al menos un pago.',
            };
        }

        let totalRecibido = 0;
        let totalEfectivo = 0;

        for (const pago of pagos) {
            if (!Number.isInteger(pago.id_medio_pago) || pago.id_medio_pago <= 0) {
                return {
                    ok: false,
                    mensaje: 'Selecciona un medio de pago válido.',
                };
            }

            if (!Number.isFinite(pago.monto_recibido) || pago.monto_recibido <= 0) {
                return {
                    ok: false,
                    mensaje: 'Cada pago debe tener un monto mayor a cero.',
                };
            }

            if (pago.requiere_referencia && !pago.referencia_valor) {
                return {
                    ok: false,
                    mensaje: 'El medio de pago "' + pago.nombre + '" requiere referencia.',
                };
            }

            totalRecibido += pago.monto_recibido;

            if (pago.afecta_efectivo) {
                totalEfectivo += pago.monto_recibido;
            }
        }

        if (totalRecibido < totalVenta) {
            return {
                ok: false,
                mensaje: 'El monto recibido es menor que el total.',
            };
        }

        const cambio = totalRecibido - totalVenta;

        if (cambio > 0 && totalEfectivo <= 0) {
            return {
                ok: false,
                mensaje: 'El cambio solo puede generarse cuando existe pago en efectivo.',
            };
        }

        if (cambio > totalEfectivo) {
            return {
                ok: false,
                mensaje: 'El cambio no puede ser mayor al efectivo recibido.',
            };
        }

        return {
            ok: true,
            pagos: pagos.map(function (pago) {
                return {
                    id_medio_pago: pago.id_medio_pago,
                    monto_recibido: pago.monto_recibido,
                    referencia: pago.referencia_valor,
                };
            }),
            total_recibido: totalRecibido,
            cambio,
        };
    }

    function inicializarFacturacion(ui) {
        if (!ui.btnFacturar) return;

        ui.btnFacturar.addEventListener('click', function () {
            facturarMovil(ui);
        });
    }

    async function facturarMovil(ui) {
        if (estado.enviando) return;

        limpiarMensaje(ui);

        if (!estado.carrito.length) {
            mostrarMensaje(ui, 'error', 'Agrega productos antes de facturar.');
            return;
        }

        const resumen = calcularResumen();
        const resultadoPagos = validarPagosMovil(ui, resumen.total);

        if (!resultadoPagos.ok) {
            mostrarMensaje(ui, 'error', resultadoPagos.mensaje);
            return;
        }

        estado.enviando = true;
        ui.btnFacturar.disabled = true;
        ui.btnFacturar.textContent = 'Facturando...';

        const hoy = new Date().toISOString().slice(0, 10);

        const payload = {
            id_cliente: obtenerIdClienteMovil(ui),
            fecha_venta: hoy,
            items: estado.carrito.map(function (item) {
                return {
                    id_producto: item.id_producto,
                    cantidad: item.cantidad,
                };
            }),
            pagos: resultadoPagos.pagos,
        };

        try {
            const respuesta = await fetch(ui.shell.dataset.registerSaleUrl || '/ventas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await respuesta.json();

            if (!respuesta.ok || !data.ok) {
                throw new Error(data.mensaje || 'No se pudo registrar la venta.');
            }

            const idVenta = data.venta && data.venta.id_venta
                ? data.venta.id_venta
                : null;

            estado.carrito = [];
            limpiarPagosMovil(ui);

            renderizarCarrito(ui);

            const ticket = idVenta
                ? `<br><a class="pos-ticket-link" href="/ventas/${idVenta}/ticket" target="_blank">Ver ticket / imprimir</a>`
                : '';

            mostrarMensaje(ui, 'success', data.mensaje || 'Venta registrada correctamente.', ticket);

            if (ui.inputCodigo) {
                ui.inputCodigo.focus();
            }
        } catch (error) {
            mostrarMensaje(ui, 'error', error.message || 'Error registrando venta.');
        } finally {
            estado.enviando = false;
            ui.btnFacturar.disabled = false;
            ui.btnFacturar.textContent = 'Facturar';
        }
    }

    function inicializarScanner(ui) {
        if (!ui.btnIniciarScanner || !ui.btnDetenerScanner) return;

        ui.btnIniciarScanner.addEventListener('click', function () {
            prepararAudioEscaneo();
            iniciarScanner(ui);
        });

        ui.btnDetenerScanner.addEventListener('click', function () {
            detenerScanner(ui);
        });
    }

    function prepararAudioEscaneo() {
        if (estado.audioContext) {
            return;
        }

        const AudioContextSeguro = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextSeguro) {
            return;
        }

        try {
            estado.audioContext = new AudioContextSeguro();
        } catch (error) {
            estado.audioContext = null;
        }
    }

    function emitirPitidoEscaneo() {
        if (!estado.audioContext) {
            return;
        }

        try {
            if (estado.audioContext.state === 'suspended') {
                estado.audioContext.resume();
            }

            const ahora = estado.audioContext.currentTime;

            function crearTono(frecuencia, inicio, duracion, volumen) {
                const oscilador = estado.audioContext.createOscillator();
                const ganancia = estado.audioContext.createGain();

                oscilador.type = 'square';
                oscilador.frequency.setValueAtTime(frecuencia, ahora + inicio);

                ganancia.gain.setValueAtTime(0.001, ahora + inicio);
                ganancia.gain.exponentialRampToValueAtTime(volumen, ahora + inicio + 0.012);
                ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + inicio + duracion);

                oscilador.connect(ganancia);
                ganancia.connect(estado.audioContext.destination);

                oscilador.start(ahora + inicio);
                oscilador.stop(ahora + inicio + duracion + 0.02);
            }

            crearTono(980, 0, 0.11, 0.28);
            crearTono(1320, 0.12, 0.12, 0.24);
        } catch (error) {
            // El pitido no debe romper el POS móvil.
        }
    }

    function vibrarEscaneo() {
        if (!navigator.vibrate) {
            return;
        }

        try {
            navigator.vibrate([120, 45, 120]);
        } catch (error) {
            // En iOS puede no sentirse o ser ignorado por el navegador.
        }
    }

    function mostrarFeedbackEscaneo(ui, codigo) {
        emitirPitidoEscaneo();
        vibrarEscaneo();

        if (ui.estadoScanner) {
            ui.estadoScanner.textContent = 'Leído: ' + codigo;
        }

        if (ui.lector) {
            ui.lector.classList.remove('is-scan-success');

            window.requestAnimationFrame(function () {
                ui.lector.classList.add('is-scan-success');

                window.setTimeout(function () {
                    ui.lector.classList.remove('is-scan-success');
                }, 420);
            });
        }
    }

    async function iniciarScanner(ui) {
        if (!window.Html5Qrcode) {
            mostrarMensaje(ui, 'error', 'No se cargó la librería local del escáner.');
            return;
        }

        if (estado.scannerActivo) {
            return;
        }

        try {
            ui.lector.hidden = false;

            const formatos = window.Html5QrcodeSupportedFormats
                ? [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                ]
                : undefined;

            estado.scanner = new Html5Qrcode('lectorCodigoMovil', {
                formatsToSupport: formatos,
            });

            await estado.scanner.start(
                {
                    facingMode: 'environment',
                },
                {
                    fps: 15,
                    qrbox: function (viewfinderWidth, viewfinderHeight) {
                        const ancho = Math.floor(viewfinderWidth * 0.94);
                        const alto = Math.max(110, Math.floor(viewfinderHeight * 0.24));

                        return {
                            width: ancho,
                            height: alto,
                        };
                    },
                    aspectRatio: 1.777,
                    disableFlip: false,
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true,
                    },
                },
                function (decodedText) {
                    procesarCodigoEscaneado(ui, decodedText);
                },
                function () {
                    // Lecturas fallidas ignoradas. Si no, esto parecería consola de error con cámara.
                }
            );

            estado.scannerActivo = true;
            ui.btnIniciarScanner.disabled = true;
            ui.btnDetenerScanner.disabled = false;
            ui.estadoScanner.textContent = 'Cámara activa';
        } catch (error) {
            ui.lector.hidden = true;
            mostrarMensaje(
                ui,
                'error',
                'No se pudo activar la cámara. En celular puede requerir HTTPS local o permisos del navegador.'
            );
        }
    }

    async function detenerScanner(ui) {
        if (!estado.scanner || !estado.scannerActivo) {
            ui.lector.hidden = true;
            return;
        }

        try {
            await estado.scanner.stop();
            await estado.scanner.clear();
        } catch (error) {
            // Nada. Apagar cámara no debería tumbar una venta. Qué concepto.
        }

        estado.scanner = null;
        estado.scannerActivo = false;
        ui.lector.hidden = true;
        ui.btnIniciarScanner.disabled = false;
        ui.btnDetenerScanner.disabled = true;
        ui.estadoScanner.textContent = 'Manual';
    }

    function procesarCodigoEscaneado(ui, codigo) {
        const texto = String(codigo || '').trim();
        const ahora = Date.now();

        if (!texto) return;

        if (estado.ultimoCodigo === texto && ahora - estado.ultimoCodigoEn < 1100) {
            return;
        }

        estado.ultimoCodigo = texto;
        estado.ultimoCodigoEn = ahora;

        mostrarFeedbackEscaneo(ui, texto);

        ui.inputCodigo.value = texto;
        buscarYMostrarProductos(ui, texto, true);
    }
})();