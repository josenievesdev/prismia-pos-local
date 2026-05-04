(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', iniciarPOSMovil);

    const estado = {
        carrito: [],
        scanner: null,
        scannerActivo: false,
        ultimoCodigo: '',
        ultimoCodigoEn: 0,
        enviando: false,
    };

    function iniciarPOSMovil() {
        const ui = obtenerUI();

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

        if (ui.montoRecibido && !ui.montoRecibido.dataset.editado) {
            ui.montoRecibido.value = Math.round(resumen.total || 0);
        }
    }

    function inicializarPago(ui) {
        if (!ui.montoRecibido) return;

        ui.montoRecibido.addEventListener('input', function () {
            ui.montoRecibido.dataset.editado = '1';
        });
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
        const idMedioPago = Number(ui.medioPago.value || 0);
        const montoRecibido = numero(ui.montoRecibido.value);

        if (!Number.isInteger(idMedioPago) || idMedioPago <= 0) {
            mostrarMensaje(ui, 'error', 'Selecciona un medio de pago válido.');
            return;
        }

        if (montoRecibido < resumen.total) {
            mostrarMensaje(ui, 'error', 'El monto recibido es menor que el total.');
            return;
        }

        estado.enviando = true;
        ui.btnFacturar.disabled = true;
        ui.btnFacturar.textContent = 'Facturando...';

        const hoy = new Date().toISOString().slice(0, 10);

        const payload = {
            id_cliente: null,
            fecha_venta: hoy,
            items: estado.carrito.map(function (item) {
                return {
                    id_producto: item.id_producto,
                    cantidad: item.cantidad,
                };
            }),
            pagos: [
                {
                    id_medio_pago: idMedioPago,
                    monto_recibido: montoRecibido,
                    referencia: ui.referencia.value.trim(),
                },
            ],
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
            ui.montoRecibido.dataset.editado = '';
            ui.referencia.value = '';

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
            iniciarScanner(ui);
        });

        ui.btnDetenerScanner.addEventListener('click', function () {
            detenerScanner(ui);
        });
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
                { facingMode: 'environment' },
                {
                    fps: 8,
                    qrbox: {
                        width: 280,
                        height: 140,
                    },
                },
                function (decodedText) {
                    procesarCodigoEscaneado(ui, decodedText);
                },
                function () {
                    // Ignoramos lecturas fallidas. Si mostráramos cada una, la UI parecería poseída.
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

        if (estado.ultimoCodigo === texto && ahora - estado.ultimoCodigoEn < 1500) {
            return;
        }

        estado.ultimoCodigo = texto;
        estado.ultimoCodigoEn = ahora;

        ui.inputCodigo.value = texto;
        buscarYMostrarProductos(ui, texto, true);
    }
})();