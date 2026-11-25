/* =========================================================
   Prismia · Facturación (punto de venta)
   Todo se dibuja desde un solo estado en memoria. El dinero se calcula con
   PrismiaDinero (enteros exactos): lo que ve el cajero es exactamente lo
   que el servidor cobra.
   Teclado: F2 buscar · F4 cliente · F8 cantidad · F9 cobrar/registrar ·
   Supr quitar línea · Ctrl+Z deshacer · Alt+1…6 frecuentes (Alt+1…9 medios
   de pago en el cobro) · Esc cancelar · Ctrl+P imprimir la última venta.
   ========================================================= */
(function () {
    'use strict';

    const CLAVES = {
        modo: 'prismia.pos.modoVista',
        perfil: 'prismia.pos.perfilVista',
        enfoque: 'prismia.pos.enfoque',
        plegados: 'prismia.pos.frecuentesPlegados',
        pendientes: 'prismia.pos.pendientes',
        ventaEnCurso: 'prismia.pos.ventaEnCurso',
    };

    const SEGUNDOS_DESHACER = 5;
    const MAX_PENDIENTES = 10;
    // "25*", "25×" o "25x " antes del producto = cantidad. "2x4" (sin espacio) es texto.
    const RE_MULTIPLICADOR = /^\s*(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:[*×]|[xX](?=\s|$))\s*(.*)$/;

    const formatoPesos = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
    const formatoCantidad = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3, useGrouping: false });

    let datos = null;
    let ui = null;
    let estado = null;

    document.addEventListener('DOMContentLoaded', iniciar);

    function iniciar() {
        const nodoDatos = document.getElementById('datosPOS');

        if (!nodoDatos || !document.getElementById('pos')) {
            return;
        }

        try {
            datos = JSON.parse(nodoDatos.textContent || '{}');
        } catch (error) {
            console.error('Datos del POS inválidos:', error);
            return;
        }

        ui = obtenerElementos();
        estado = {
            puedeVender: Boolean(datos.puedeVender),
            numeroFactura: datos.numeroFactura || 'FV-BORRADOR',
            cliente: clienteConsumidorFinal(),
            carrito: [],
            seleccion: null,
            destello: null,
            enfocarCantidad: null,
            deshacer: null,
            multiplicador: null,
            busqueda: { termino: '', resultados: [], activo: 0, controlador: null, temporizador: null },
            clientes: { resultados: [], activo: 0, controlador: null, temporizador: null },
            vista: 'venta',
            pagos: [],
            borrador: null,
            errorCobro: null,
            enviando: false,
            ultimaVenta: null,
            frecuentes: (Array.isArray(datos.frecuentes) ? datos.frecuentes : []).map(function (producto) {
                return producto ? normalizarProducto(producto) : null;
            }),
            editandoFrecuentes: false,
            productoConfig: null,
            ultimoEscape: 0,
        };

        while (estado.frecuentes.length < 6) {
            estado.frecuentes.push(null);
        }

        iniciarHerramientas();
        iniciarBuscador();
        iniciarTicket();
        iniciarCliente();
        iniciarClienteRapido();
        iniciarFrecuentes();
        iniciarConfiguracionFrecuentes();
        iniciarPago();
        iniciarExito();
        iniciarAcciones();
        iniciarTeclado();
        iniciarClicFuera();

        dibujarTodo();
        recuperarVentaEnCurso();

        if (estado.puedeVender && ui.buscar) {
            ui.buscar.focus();
        }
    }

    function obtenerElementos() {
        const id = function (nombre) {
            return document.getElementById(nombre);
        };

        return {
            botonesModo: document.querySelectorAll('[data-pos-modo]'),
            perfil: id('perfilPOS'),
            enfoque: id('btnEnfoquePOS'),

            buscador: id('buscadorPOS'),
            buscar: id('buscarProducto'),
            multiplicador: id('multiplicadorPOS'),
            resultados: id('resultadosPOS'),

            botonCliente: id('btnClientePOS'),
            clienteNombre: id('clienteNombrePOS'),
            clienteDocumento: id('clienteDocumentoPOS'),
            panelCliente: id('panelClientePOS'),
            buscarCliente: id('buscarCliente'),
            resultadosClientes: id('resultadosClientes'),
            clienteFinal: id('btnClienteFinalPOS'),
            abrirClienteRapido: id('btnAbrirClienteRapido'),

            numeroFactura: id('numeroFacturaPOS'),
            resumenTicket: id('resumenTicketPOS'),
            tabla: id('tablaTicketPOS'),
            lineas: id('lineasPOS'),
            vacio: id('vacioTicketPOS'),
            arriba: id('btnArribaPOS'),

            pendiente: id('btnPendientePOS'),
            pendientes: id('btnPendientesPOS'),
            panelPendientes: id('panelPendientesPOS'),
            limpiar: id('btnLimpiarVenta'),

            exito: id('exitoPOS'),
            exitoNumero: id('exitoNumeroPOS'),
            exitoTotal: id('exitoTotalPOS'),
            exitoCambio: id('exitoCambioPOS'),
            exitoImprimir: id('exitoImprimirPOS'),
            exitoOcultar: id('exitoOcultarPOS'),

            lateralVenta: id('lateralVentaPOS'),
            frecuentes: id('frecuentesPOS'),
            listaFrecuentes: id('listaFrecuentesPOS'),
            editarFrecuentes: id('btnEditarFrecuentesPOS'),
            plegarFrecuentes: id('btnPlegarFrecuentesPOS'),

            subtotal: id('subtotalPOS'),
            etiquetaIva: id('etiquetaIvaPOS'),
            iva: id('ivaPOS'),
            descuento: id('descuentoPOS'),
            filaDescuento: id('filaDescuentoPOS'),
            total: id('totalPOS'),
            cobrar: id('btnCobrarVenta'),
            cobrarMonto: id('cobrarMontoPOS'),

            pago: id('pagoPOS'),
            volverPago: id('btnVolverPagoPOS'),
            pagoTotal: id('pagoTotalPOS'),
            medios: id('mediosPOS'),
            montoZona: id('montoZonaPOS'),
            montoEtiqueta: id('montoEtiquetaPOS'),
            referencia: id('referenciaPOS'),
            monto: id('montoPOS'),
            billetes: id('billetesPOS'),
            pagos: id('pagosPOS'),
            teclado: id('tecladoPOS'),
            errorPago: id('errorPagoPOS'),
            errorPagoTexto: id('errorPagoTextoPOS'),
            estadoPago: id('estadoPagoPOS'),
            estadoPagoEtiqueta: id('estadoPagoEtiquetaPOS'),
            estadoPagoMonto: id('estadoPagoMontoPOS'),
            registrar: id('btnRegistrarVentaPOS'),
            textoRegistrar: id('textoRegistrarPOS'),

            modalClienteRapido: id('modalClienteRapido'),
            formClienteRapido: id('formClienteRapido'),
            cerrarClienteRapido: id('btnCerrarClienteRapido'),
            cancelarClienteRapido: id('btnCancelarClienteRapido'),
            guardarClienteRapido: id('btnGuardarClienteRapido'),
            avisoClienteRapido: id('avisoClienteRapido'),
            tipoDocumentoClienteRapido: id('clienteRapidoTipoDocumento'),
            documentoClienteRapido: id('clienteRapidoDocumento'),
            campoDvClienteRapido: id('campoClienteRapidoDv'),
            dvClienteRapido: id('clienteRapidoDv'),
            nombreClienteRapido: id('clienteRapidoNombre'),
            celularClienteRapido: id('clienteRapidoCelular'),
            correoClienteRapido: id('clienteRapidoCorreo'),
            autorizaClienteRapido: id('clienteRapidoAutoriza'),

            modalFrecuente: id('modalAccesoRapidoTactil'),
            formFrecuente: id('formAccesoRapidoTactil'),
            cerrarFrecuente: id('btnCerrarAccesoRapidoTactil'),
            cancelarFrecuente: id('btnCancelarAccesoRapidoTactil'),
            guardarFrecuente: id('btnGuardarAccesoRapidoTactil'),
            buscarFrecuente: id('buscarProductoAccesoRapido'),
            posicionFrecuente: id('slotAccesoRapidoTactil'),
            productoFrecuente: id('productoAccesoRapidoTactil'),
            seleccionadoFrecuente: id('productoAccesoRapidoSeleccionado'),
            resultadosFrecuente: id('resultadosAccesoRapidoTactil'),
        };
    }

    /* ---------------------------------------------------------------
       Utilidades
       --------------------------------------------------------------- */
    function leerAlmacen(clave, almacen) {
        try {
            return (almacen || window.localStorage).getItem(clave);
        } catch (error) {
            return null;
        }
    }

    function guardarAlmacen(clave, valor, almacen) {
        try {
            const destino = almacen || window.localStorage;

            if (valor === null || valor === undefined) {
                destino.removeItem(clave);
            } else {
                destino.setItem(clave, valor);
            }
        } catch (error) {
            // Sin almacenamiento el POS sigue funcionando; solo no recuerda preferencias.
        }
    }

    function pesos(valor) {
        return '$ ' + formatoPesos.format(Math.round(Number(valor) || 0));
    }

    function cantidadTexto(valor) {
        return formatoCantidad.format(Number(valor) || 0);
    }

    // Acepta "2", "2,5" o "2.5". Devuelve NaN si no es un número válido.
    function leerCantidad(texto) {
        const limpio = String(texto === undefined || texto === null ? '' : texto)
            .trim()
            .replace(/\s+/g, '')
            .replace(',', '.');

        if (!limpio || !/^\d*\.?\d*$/.test(limpio) || limpio === '.') {
            return NaN;
        }

        return Number(limpio);
    }

    function normalizarCantidad(cantidad, permiteDecimal) {
        return permiteDecimal ? Math.round(cantidad * 1000) / 1000 : Math.trunc(cantidad);
    }

    function escapar(valor) {
        return String(valor === undefined || valor === null ? '' : valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function iniciales(nombre) {
        const partes = String(nombre || 'P').trim().split(/\s+/);
        return ((partes[0] || 'P').charAt(0) + (partes[1] || '').charAt(0)).toUpperCase();
    }

    function esCampoEditable(elemento) {
        if (!elemento) {
            return false;
        }

        const etiqueta = elemento.tagName;
        return etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT' || elemento.isContentEditable;
    }

    // Aviso flotante (componente ui-aviso de sistema.css) sobre la parte baja
    // del ticket: cerca de lo que mira el cajero, sin tapar buscador ni Cobrar.
    function aviso(mensaje, tipo) {
        const contenedor = document.querySelector('.pos-principal') || document.body;
        let nodo = contenedor.querySelector(':scope > .ui-aviso');

        if (!nodo) {
            nodo = document.createElement('div');
            nodo.className = 'ui-aviso';
            nodo.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
            nodo.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
            contenedor.appendChild(nodo);
        }

        nodo.textContent = mensaje;
        nodo.classList.remove('is-error', 'is-info', 'is-visible');

        if (tipo === 'error') {
            nodo.classList.add('is-error');
        } else if (tipo === 'info') {
            nodo.classList.add('is-info');
        }

        window.requestAnimationFrame(function () {
            nodo.classList.add('is-visible');
        });

        window.clearTimeout(nodo._temporizador);
        nodo._temporizador = window.setTimeout(function () {
            nodo.classList.remove('is-visible');
        }, tipo === 'error' ? 4500 : 2600);
    }

    function confirmar(opciones) {
        const titulo = opciones.titulo || 'Confirmar';
        const mensaje = opciones.mensaje || '¿Deseas continuar?';
        const textoConfirmar = opciones.textoConfirmar || 'Confirmar';

        return new Promise(function (resolver) {
            const fondo = document.createElement('div');
            fondo.className = 'ventas-confirm-backdrop';
            fondo.innerHTML = `
                <div class="ventas-confirm-card" role="alertdialog" aria-modal="true"
                    aria-labelledby="tituloConfirmarPOS" aria-describedby="textoConfirmarPOS">
                    <h3 id="tituloConfirmarPOS">${escapar(titulo)}</h3>
                    <p id="textoConfirmarPOS">${escapar(mensaje)}</p>
                    <footer class="ventas-confirm-actions">
                        <button type="button" class="btn-secondary" data-cancelar>Cancelar</button>
                        <button type="button" class="btn-danger" data-confirmar>${escapar(textoConfirmar)}</button>
                    </footer>
                </div>`;

            function cerrar(resultado) {
                document.removeEventListener('keydown', alTeclear, true);
                fondo.remove();
                document.body.classList.remove('ventas-modal-open');
                resolver(resultado);
            }

            function alTeclear(evento) {
                if (evento.key === 'Escape') {
                    evento.preventDefault();
                    evento.stopPropagation();
                    cerrar(false);
                }
            }

            fondo.addEventListener('click', function (evento) {
                if (evento.target === fondo || evento.target.closest('[data-cancelar]')) {
                    cerrar(false);
                } else if (evento.target.closest('[data-confirmar]')) {
                    cerrar(true);
                }
            });

            document.addEventListener('keydown', alTeclear, true);
            document.body.appendChild(fondo);
            document.body.classList.add('ventas-modal-open');
            fondo.querySelector('[data-cancelar]').focus();
        });
    }

    /* Descuento por unidad de una línea, en pesos (con % rápido). Usa el mismo
       diálogo del POS; Enter aplica y Esc cancela. */
    function editarDescuento(id) {
        const item = buscarItem(id);

        if (!item || hayModalAbierto()) {
            return;
        }

        const actual = descuentoDe(item);
        const fondo = document.createElement('div');
        fondo.className = 'ventas-confirm-backdrop';
        fondo.innerHTML = `
            <form class="ventas-confirm-card pos-descuento" role="dialog" aria-modal="true"
                aria-labelledby="tituloDescuentoPOS" novalidate>
                <h3 id="tituloDescuentoPOS">Descuento</h3>
                <p class="pos-descuento-producto">${escapar(item.nombre)} · ${pesos(item.precio)} / ${escapar(item.unidad)}</p>
                <label class="pos-descuento-campo">
                    <span>Descuento por ${escapar(item.unidad)}</span>
                    <span class="pos-descuento-entrada">
                        <b>$</b>
                        <input type="text" inputmode="numeric" autocomplete="off" spellcheck="false"
                            data-descuento placeholder="0" value="${actual > 0 ? actual : ''}">
                    </span>
                </label>
                <div class="pos-descuento-rapidos" role="group" aria-label="Porcentaje del precio">
                    ${[5, 10, 15, 20].map(function (porcentaje) {
                        return `<button type="button" data-porcentaje="${porcentaje}">${porcentaje} %</button>`;
                    }).join('')}
                </div>
                <p class="pos-descuento-resultado" data-resultado aria-live="polite"></p>
                <footer class="ventas-confirm-actions">
                    ${actual > 0 ? '<button type="button" class="btn-secondary" data-quitar>Quitar</button>' : ''}
                    <button type="button" class="btn-secondary" data-cancelar>Cancelar</button>
                    <button type="submit" class="btn-primary" data-aplicar>Aplicar</button>
                </footer>
            </form>`;

        const formulario = fondo.querySelector('form');
        const entrada = fondo.querySelector('[data-descuento]');
        const resultado = fondo.querySelector('[data-resultado]');
        const aplicar = fondo.querySelector('[data-aplicar]');

        function leer() {
            return Math.round(Number(String(entrada.value || '').replace(/[^\d]/g, '')) || 0);
        }

        function actualizar() {
            const valor = leer();

            if (valor > item.precio) {
                resultado.textContent = `No puede superar el precio (${pesos(item.precio)}).`;
                resultado.classList.add('is-error');
                aplicar.disabled = true;
                return;
            }

            const linea = calcularLinea(Object.assign({}, item, { descuento: valor }));
            resultado.classList.remove('is-error');
            aplicar.disabled = false;
            resultado.textContent = valor > 0
                ? `Precio final ${pesos(item.precio - valor)} · Línea ${pesos(linea.total)} · Ahorro ${pesos(linea.descuento)}`
                : 'Sin descuento.';
        }

        function cerrar() {
            document.removeEventListener('keydown', alTeclear, true);
            fondo.remove();
            document.body.classList.remove('ventas-modal-open');
            ui.buscar?.focus();
        }

        function guardar(valor) {
            item.descuento = Math.min(Math.max(0, valor), item.precio);
            estado.seleccion = item.id;
            cerrar();
            alCambiarCarrito();
        }

        function alTeclear(evento) {
            if (evento.key === 'Escape') {
                evento.preventDefault();
                evento.stopPropagation();
                cerrar();
            }
        }

        entrada.addEventListener('input', actualizar);

        formulario.addEventListener('submit', function (evento) {
            evento.preventDefault();
            const valor = leer();

            if (valor <= item.precio) {
                guardar(valor);
            }
        });

        fondo.addEventListener('click', function (evento) {
            const rapido = evento.target.closest('[data-porcentaje]');

            if (evento.target === fondo || evento.target.closest('[data-cancelar]')) {
                cerrar();
            } else if (evento.target.closest('[data-quitar]')) {
                guardar(0);
            } else if (rapido) {
                entrada.value = String(Math.round(item.precio * Number(rapido.dataset.porcentaje) / 100));
                actualizar();
                entrada.focus();
            }
        });

        document.addEventListener('keydown', alTeclear, true);
        document.body.appendChild(fondo);
        document.body.classList.add('ventas-modal-open');
        actualizar();
        entrada.focus();
        entrada.select();
    }

    function hayModalAbierto() {
        return Boolean(
            (ui.modalClienteRapido && !ui.modalClienteRapido.hidden)
            || (ui.modalFrecuente && !ui.modalFrecuente.hidden)
            || document.querySelector('.ventas-confirm-backdrop')
        );
    }

    /* ---------------------------------------------------------------
       Productos, cantidades y dinero
       --------------------------------------------------------------- */
    function normalizarProducto(producto) {
        return {
            id: Number(producto.id_producto),
            nombre: String(producto.nombre || 'Producto'),
            codigo: producto.codigo_interno || '',
            codigoBarras: producto.codigo_barras || '',
            categoria: producto.categoria_nombre || '',
            unidad: producto.unidad_abreviatura || 'und',
            precio: Math.round(Number(producto.precio_venta) || 0),
            stock: Number(producto.stock_disponible) || 0,
            controlaInventario: Number(producto.controla_inventario) === 1,
            permiteSinStock: Number(producto.permite_venta_sin_stock) === 1,
            permiteDecimal: Number(producto.permite_cantidad_decimal) === 1,
            porcentajeIva: Math.round(Number(producto.porcentaje_iva) || 0),
            manejaIva: Number(producto.maneja_iva) === 1,
            precioIncluyeIva: Number(producto.precio_incluye_iva) === 1,
            puedeVender: producto.puede_vender === true || Number(producto.puede_vender) === 1,
            imagen: producto.imagen_url || '',
            descuento: 0,
        };
    }

    function validarCantidad(item, cantidad) {
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            return { ok: false, mensaje: 'La cantidad debe ser mayor a cero.' };
        }

        if (!item.permiteDecimal && Math.abs(cantidad - Math.round(cantidad)) > 0.000001) {
            return { ok: false, mensaje: `"${item.nombre}" se vende por unidades enteras.` };
        }

        if (item.controlaInventario && !item.permiteSinStock && cantidad > item.stock + 0.000001) {
            return {
                ok: false,
                mensaje: `Solo hay ${cantidadTexto(Math.max(item.stock, 0))} ${item.unidad} de "${item.nombre}".`,
            };
        }

        return { ok: true };
    }

    // Descuento por unidad (en pesos): nunca negativo ni mayor que el precio.
    function descuentoDe(item) {
        return Math.min(Math.max(0, Math.round(Number(item.descuento) || 0)), item.precio);
    }

    // Misma regla y misma aritmética exacta que el servidor (dinero-exacto.js):
    // el descuento se resta del precio unitario antes de multiplicar.
    function calcularLinea(item) {
        const descuento = descuentoDe(item);
        const bruto = window.PrismiaDinero.multiplicarPorCantidad(item.precio - descuento, item.cantidad);
        const porcentaje = Math.round(Number(item.porcentajeIva) || 0);
        let subtotal = bruto;
        let iva = 0;

        if (item.manejaIva && porcentaje > 0) {
            if (item.precioIncluyeIva) {
                const separado = window.PrismiaDinero.separarIvaIncluido(bruto, porcentaje);
                subtotal = separado.base;
                iva = separado.iva;
            } else {
                iva = window.PrismiaDinero.calcularIva(subtotal, porcentaje);
            }
        }

        return {
            subtotal,
            iva,
            total: subtotal + iva,
            descuento: window.PrismiaDinero.multiplicarPorCantidad(descuento, item.cantidad),
        };
    }

    function calcularResumen() {
        return estado.carrito.reduce(function (resumen, item) {
            const linea = calcularLinea(item);
            resumen.subtotal += linea.subtotal;
            resumen.iva += linea.iva;
            resumen.total += linea.total;
            resumen.descuento += linea.descuento;
            return resumen;
        }, { subtotal: 0, iva: 0, total: 0, descuento: 0 });
    }

    function buscarItem(id) {
        return estado.carrito.find(function (item) {
            return item.id === id;
        }) || null;
    }

    function puedeCobrar(resumen) {
        const totales = resumen || calcularResumen();
        return estado.puedeVender && estado.carrito.length > 0 && totales.total > 0 && !estado.enviando;
    }

    /* ---------------------------------------------------------------
       Barra superior: modo, perfil y modo enfoque
       --------------------------------------------------------------- */
    function iniciarHerramientas() {
        const raiz = document.documentElement;

        aplicarModo(raiz.dataset.posMode === 'tactil' ? 'tactil' : 'clasico', false);

        ui.botonesModo.forEach(function (boton) {
            boton.addEventListener('click', function () {
                aplicarModo(boton.dataset.posModo, true);
                ui.buscar?.focus();
            });
        });

        if (ui.perfil) {
            ui.perfil.value = raiz.dataset.posBusiness || 'general';
            ui.perfil.addEventListener('change', function () {
                const perfil = ['general', 'comidas', 'boutique'].includes(ui.perfil.value) ? ui.perfil.value : 'general';
                raiz.dataset.posBusiness = perfil;
                guardarAlmacen(CLAVES.perfil, perfil);
            });
        }

        if (ui.enfoque) {
            ui.enfoque.setAttribute('aria-pressed', String(raiz.dataset.posEnfoque === '1'));
            ui.enfoque.addEventListener('click', function () {
                alternarEnfoque();
                ui.buscar?.focus();
            });
        }
    }

    function aplicarModo(modo, guardar) {
        const seguro = modo === 'tactil' ? 'tactil' : 'clasico';
        document.documentElement.dataset.posMode = seguro;

        ui.botonesModo.forEach(function (boton) {
            boton.setAttribute('aria-pressed', String(boton.dataset.posModo === seguro));
        });

        if (guardar) {
            guardarAlmacen(CLAVES.modo, seguro);
            if (estado) {
                dibujarTicket();
            }
        }
    }

    function alternarEnfoque(forzar) {
        const raiz = document.documentElement;
        const activo = typeof forzar === 'boolean' ? forzar : raiz.dataset.posEnfoque !== '1';

        if (activo) {
            raiz.dataset.posEnfoque = '1';
        } else {
            delete raiz.dataset.posEnfoque;
        }

        ui.enfoque?.setAttribute('aria-pressed', String(activo));
        guardarAlmacen(CLAVES.enfoque, activo ? '1' : null);
    }

    /* ---------------------------------------------------------------
       Buscador de productos
       --------------------------------------------------------------- */
    function iniciarBuscador() {
        if (!ui.buscar) {
            return;
        }

        ui.buscar.addEventListener('input', function () {
            const coincidencia = ui.buscar.value.match(RE_MULTIPLICADOR);

            if (coincidencia) {
                const cantidad = leerCantidad(coincidencia[1]);

                if (cantidad > 0) {
                    fijarMultiplicador(cantidad);
                    ui.buscar.value = coincidencia[2];
                }
            }

            programarBusqueda(false);
        });

        ui.buscar.addEventListener('keydown', alTeclearBusqueda);

        ui.buscar.addEventListener('focus', function () {
            if (ui.buscar.value.trim() && estado.busqueda.resultados.length) {
                dibujarResultados();
            }
        });

        ui.multiplicador?.addEventListener('click', function () {
            fijarMultiplicador(null);
            ui.buscar.focus();
        });

        // Los resultados no roban el foco del buscador (el lector sigue escribiendo ahí).
        ui.resultados.addEventListener('mousedown', function (evento) {
            evento.preventDefault();
        });

        ui.resultados.addEventListener('click', function (evento) {
            const fila = evento.target.closest('[data-indice]');

            if (fila) {
                agregarDesdeResultado(Number(fila.dataset.indice));
            }
        });

        ui.resultados.addEventListener('mousemove', function (evento) {
            const fila = evento.target.closest('[data-indice]');

            if (fila && Number(fila.dataset.indice) !== estado.busqueda.activo) {
                estado.busqueda.activo = Number(fila.dataset.indice);
                marcarResultadoActivo();
            }
        });
    }

    function alTeclearBusqueda(evento) {
        const abiertos = !ui.resultados.hidden && estado.busqueda.resultados.length > 0;

        if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            const delta = evento.key === 'ArrowDown' ? 1 : -1;

            if (abiertos) {
                evento.preventDefault();
                moverResultado(delta);
            } else if (estado.carrito.length) {
                evento.preventDefault();
                moverSeleccion(delta);
            }
            return;
        }

        if (evento.key === 'Enter') {
            evento.preventDefault();
            confirmarBusqueda();
            return;
        }

        if (evento.key === 'Backspace' && !ui.buscar.value && estado.multiplicador !== null) {
            evento.preventDefault();
            fijarMultiplicador(null);
        }
    }

    function programarBusqueda(inmediata) {
        const termino = ui.buscar.value.trim();

        window.clearTimeout(estado.busqueda.temporizador);

        if (!termino) {
            estado.busqueda.controlador?.abort();
            estado.busqueda.resultados = [];
            estado.busqueda.termino = '';
            ocultarResultados();
            return Promise.resolve([]);
        }

        if (inmediata) {
            return buscarProductos(termino);
        }

        estado.busqueda.temporizador = window.setTimeout(function () {
            buscarProductos(termino);
        }, 160);

        return null;
    }

    async function buscarProductos(termino) {
        estado.busqueda.controlador?.abort();

        const controlador = new AbortController();
        estado.busqueda.controlador = controlador;

        try {
            const respuesta = await fetch(`/ventas/productos/buscar?busqueda=${encodeURIComponent(termino)}`, {
                signal: controlador.signal,
            });
            const json = await respuesta.json();
            const productos = json.ok && Array.isArray(json.productos)
                ? json.productos.map(normalizarProducto)
                : [];

            // Si el cajero siguió escribiendo, este resultado ya no sirve.
            if (ui.buscar.value.trim() !== termino) {
                return null;
            }

            estado.busqueda.termino = termino;
            estado.busqueda.resultados = productos;
            estado.busqueda.activo = Math.max(0, productos.findIndex(function (producto) {
                return producto.puedeVender;
            }));

            dibujarResultados();
            return productos;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error buscando productos:', error);
                aviso('No se pudo buscar. Revisa la conexión.', 'error');
            }
            return null;
        }
    }

    async function confirmarBusqueda() {
        const termino = ui.buscar.value.trim();

        // Enter con el buscador vacío no hace nada (el lector a veces manda un Enter de más).
        if (!termino) {
            return;
        }

        if (!ui.resultados.hidden && estado.busqueda.termino === termino && estado.busqueda.resultados.length) {
            agregarDesdeResultado(estado.busqueda.activo);
            return;
        }

        // Lector de códigos de barras: escribe el código y Enter antes de que
        // termine la espera de la búsqueda. Se busca ya y, si el código coincide
        // exacto (o hay un solo resultado), se agrega sin preguntar.
        const productos = await programarBusqueda(true);

        if (!productos) {
            return;
        }

        const terminoMinuscula = termino.toLowerCase();
        const exacto = productos.find(function (producto) {
            return (producto.codigoBarras && producto.codigoBarras === termino)
                || (producto.codigo && producto.codigo.toLowerCase() === terminoMinuscula);
        });

        if (exacto) {
            agregarProducto(exacto);
        } else if (productos.length === 1) {
            agregarProducto(productos[0]);
        } else if (!productos.length) {
            aviso(`No hay productos con "${termino}".`, 'error');
            ui.buscar.select();
        }
    }

    function fijarMultiplicador(valor) {
        estado.multiplicador = valor;

        if (ui.multiplicador) {
            ui.multiplicador.hidden = valor === null;
            ui.multiplicador.textContent = valor === null ? '' : `${cantidadTexto(valor)} ×`;
        }

        if (!ui.resultados.hidden && estado.busqueda.resultados.length) {
            dibujarResultados();
        }
    }

    function dibujarResultados() {
        const lista = estado.busqueda.resultados;

        ui.resultados.hidden = false;
        ui.buscar.setAttribute('aria-expanded', 'true');

        if (!lista.length) {
            ui.resultados.innerHTML = `<div class="pos-resultados-vacio">Sin resultados para "${escapar(estado.busqueda.termino)}".</div>`;
            return;
        }

        ui.resultados.innerHTML = `
            <div class="pos-resultados-lista">${lista.map(filaResultado).join('')}</div>
            <div class="pos-resultados-pie">
                <span><kbd>↑</kbd><kbd>↓</kbd> Mover</span>
                <span><kbd>Enter</kbd> <span id="textoAgregarPOS">Agregar</span></span>
                <span><kbd>Esc</kbd> Cerrar</span>
            </div>`;

        marcarResultadoActivo();
    }

    function filaResultado(producto, indice) {
        const bloqueado = !producto.puedeVender;
        const foto = producto.imagen
            ? `<img src="${escapar(producto.imagen)}" alt="" loading="lazy">`
            : escapar(producto.unidad);
        const codigos = [producto.codigoBarras, producto.codigo].filter(Boolean).map(escapar).join(' · ');
        const porUnidad = producto.unidad !== 'und' ? ` / ${escapar(producto.unidad)}` : '';
        let stock = '';

        if (producto.controlaInventario) {
            const agotado = producto.stock <= 0;
            const texto = agotado
                ? (producto.permiteSinStock ? 'sin stock · se puede vender' : 'sin stock')
                : 'disp.';
            stock = `<small class="${agotado ? 'is-aviso' : ''}">${cantidadTexto(producto.stock)} ${escapar(producto.unidad)} ${texto}</small>`;
        }

        return `
            <button type="button" class="pos-resultado ${bloqueado ? 'is-bloqueado' : ''}" role="option"
                tabindex="-1" data-indice="${indice}" aria-selected="false" ${bloqueado ? 'aria-disabled="true"' : ''}>
                <span class="pos-resultado-unidad">${foto}</span>
                <span class="pos-resultado-texto">
                    <span class="pos-resultado-nombre">${escapar(producto.nombre)}</span>
                    <span class="pos-resultado-codigos">${codigos || 'Sin código'}</span>
                </span>
                <span class="pos-resultado-precio">
                    <strong>${pesos(producto.precio)}${porUnidad}</strong>
                    ${stock}
                </span>
            </button>`;
    }

    function marcarResultadoActivo() {
        const filas = ui.resultados.querySelectorAll('[data-indice]');

        filas.forEach(function (fila) {
            const activo = Number(fila.dataset.indice) === estado.busqueda.activo;
            fila.classList.toggle('is-activo', activo);
            fila.setAttribute('aria-selected', String(activo));

            if (activo) {
                fila.scrollIntoView({ block: 'nearest' });
            }
        });

        const texto = document.getElementById('textoAgregarPOS');
        const producto = estado.busqueda.resultados[estado.busqueda.activo];

        if (texto && producto) {
            texto.textContent = estado.multiplicador !== null
                ? `Agregar ${cantidadTexto(estado.multiplicador)} ${producto.unidad}`
                : 'Agregar';
        }
    }

    function moverResultado(delta) {
        const total = estado.busqueda.resultados.length;

        if (!total) {
            return;
        }

        estado.busqueda.activo = (estado.busqueda.activo + delta + total) % total;
        marcarResultadoActivo();
    }

    function agregarDesdeResultado(indice) {
        const producto = estado.busqueda.resultados[indice];

        if (producto) {
            agregarProducto(producto);
        }
    }

    function ocultarResultados() {
        if (!ui.resultados) {
            return;
        }

        ui.resultados.hidden = true;
        ui.resultados.innerHTML = '';
        ui.buscar?.setAttribute('aria-expanded', 'false');
    }

    /* ---------------------------------------------------------------
       Carrito (ticket)
       --------------------------------------------------------------- */
    function agregarProducto(producto, opciones) {
        const config = opciones || {};

        if (!estado.puedeVender) {
            aviso('Abre la caja para empezar a vender.', 'error');
            return false;
        }

        if (!producto.puedeVender) {
            aviso(`"${producto.nombre}" no tiene stock disponible.`, 'error');
            return false;
        }

        const conCantidad = config.cantidad !== undefined || estado.multiplicador !== null;
        const pedida = config.cantidad !== undefined
            ? config.cantidad
            : (estado.multiplicador !== null ? estado.multiplicador : 1);
        const existente = buscarItem(producto.id);
        const nueva = (existente ? existente.cantidad : 0) + pedida;
        const base = existente ? Object.assign({}, existente, producto) : producto;
        const validacion = validarCantidad(base, nueva);

        if (!validacion.ok) {
            aviso(validacion.mensaje, 'error');
            return false;
        }

        ocultarExito();

        let item = existente;

        if (existente) {
            // Precio y stock frescos (el servidor cobra con los datos actuales).
            Object.assign(existente, producto);
            existente.cantidad = normalizarCantidad(nueva, existente.permiteDecimal);
        } else {
            item = Object.assign({}, producto, {
                cantidad: normalizarCantidad(pedida, producto.permiteDecimal),
            });
            estado.carrito.push(item);
        }

        fijarMultiplicador(null);
        estado.seleccion = item.id;
        estado.destello = item.id;

        if (ui.buscar) {
            ui.buscar.value = '';
        }

        estado.busqueda.resultados = [];
        estado.busqueda.termino = '';
        ocultarResultados();

        // Productos por medida o peso: el foco va directo a la cantidad.
        const irACantidad = !existente && item.permiteDecimal && !conCantidad;

        if (irACantidad) {
            estado.enfocarCantidad = item.id;
        }

        alCambiarCarrito();

        if (!irACantidad) {
            ui.buscar?.focus();
        }

        return true;
    }

    function sumarCantidad(id, delta) {
        const item = buscarItem(id);

        if (!item) {
            return;
        }

        const nueva = normalizarCantidad(item.cantidad + delta, item.permiteDecimal);

        if (nueva <= 0) {
            quitarLinea(id);
            return;
        }

        const validacion = validarCantidad(item, nueva);

        if (!validacion.ok) {
            marcarErrorCantidad(id);
            aviso(validacion.mensaje, 'error');
            return;
        }

        item.cantidad = nueva;
        estado.seleccion = id;
        alCambiarCarrito();
    }

    function confirmarCantidad(input, volverAlBuscador) {
        const fila = input.closest('tr[data-id]');
        const id = Number(fila?.dataset.id);
        const item = buscarItem(id);

        if (!item) {
            return;
        }

        const cantidad = leerCantidad(input.value);

        if (Number.isNaN(cantidad)) {
            marcarErrorCantidad(id);
            aviso('Escribe una cantidad válida, por ejemplo 2 o 1,5.', 'error');
            input.value = cantidadTexto(item.cantidad);
            input.select();
            return;
        }

        if (cantidad === 0) {
            quitarLinea(id);
            if (volverAlBuscador) {
                ui.buscar?.focus();
            }
            return;
        }

        if (Math.abs(cantidad - item.cantidad) < 0.0005) {
            input.value = cantidadTexto(item.cantidad);
            if (volverAlBuscador) {
                ui.buscar?.focus();
            }
            return;
        }

        const validacion = validarCantidad(item, cantidad);

        if (!validacion.ok) {
            marcarErrorCantidad(id);
            aviso(validacion.mensaje, 'error');
            input.value = cantidadTexto(item.cantidad);
            input.select();
            return;
        }

        item.cantidad = normalizarCantidad(cantidad, item.permiteDecimal);
        estado.seleccion = id;
        alCambiarCarrito();

        if (volverAlBuscador) {
            ui.buscar?.focus();
        }
    }

    function marcarErrorCantidad(id) {
        const caja = ui.lineas.querySelector(`tr[data-id="${id}"] .pos-cantidad`);

        if (!caja) {
            return;
        }

        caja.classList.add('is-error');
        window.setTimeout(function () {
            caja.classList.remove('is-error');
        }, 1400);
    }

    function quitarLinea(id) {
        const indice = estado.carrito.findIndex(function (item) {
            return item.id === id;
        });

        if (indice < 0) {
            return;
        }

        finalizarDeshacer(false);

        const item = estado.carrito.splice(indice, 1)[0];

        estado.deshacer = {
            item,
            indice,
            temporizador: window.setTimeout(function () {
                finalizarDeshacer(true);
            }, SEGUNDOS_DESHACER * 1000),
        };

        const siguiente = estado.carrito[indice] || estado.carrito[indice - 1] || null;
        estado.seleccion = siguiente ? siguiente.id : null;
        alCambiarCarrito();
    }

    function finalizarDeshacer(redibujar) {
        if (!estado.deshacer) {
            return;
        }

        window.clearTimeout(estado.deshacer.temporizador);
        estado.deshacer = null;

        if (redibujar) {
            dibujarTicket();
        }
    }

    function deshacer() {
        if (!estado.deshacer) {
            return;
        }

        const pendiente = estado.deshacer;
        window.clearTimeout(pendiente.temporizador);
        estado.deshacer = null;

        const existente = buscarItem(pendiente.item.id);

        if (existente) {
            const nueva = existente.cantidad + pendiente.item.cantidad;

            if (validarCantidad(existente, nueva).ok) {
                existente.cantidad = normalizarCantidad(nueva, existente.permiteDecimal);
            }
        } else {
            estado.carrito.splice(Math.min(pendiente.indice, estado.carrito.length), 0, pendiente.item);
        }

        estado.seleccion = pendiente.item.id;
        estado.destello = pendiente.item.id;
        alCambiarCarrito();
        ui.buscar?.focus();
    }

    function seleccionar(id) {
        estado.seleccion = id;

        ui.lineas.querySelectorAll('tr[data-id]').forEach(function (fila) {
            fila.classList.toggle('is-seleccionada', Number(fila.dataset.id) === id);
        });
    }

    function moverSeleccion(delta) {
        if (!estado.carrito.length) {
            return;
        }

        const actual = estado.carrito.findIndex(function (item) {
            return item.id === estado.seleccion;
        });
        const indice = actual < 0
            ? (delta > 0 ? 0 : estado.carrito.length - 1)
            : Math.min(Math.max(actual + delta, 0), estado.carrito.length - 1);
        const id = estado.carrito[indice].id;

        seleccionar(id);
        ui.lineas.querySelector(`tr[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
    }

    function enfocarCantidadSeleccionada() {
        if (!estado.carrito.length) {
            ui.buscar?.focus();
            return;
        }

        const id = buscarItem(estado.seleccion) ? estado.seleccion : estado.carrito[estado.carrito.length - 1].id;
        const input = ui.lineas.querySelector(`tr[data-id="${id}"] [data-cantidad]`);

        seleccionar(id);

        if (input) {
            input.focus();
            input.select();
        }
    }

    function alCambiarCarrito() {
        if (!estado.carrito.length) {
            estado.pagos = [];
            estado.borrador = null;

            if (estado.vista === 'pago') {
                cerrarPago(false);
            }
        } else if (estado.borrador && !estado.borrador.tocado) {
            estado.borrador.monto = faltaParaBorrador();
        }

        guardarVentaEnCurso();
        dibujarTodo();
    }

    function iniciarTicket() {
        if (!ui.lineas) {
            return;
        }

        ui.lineas.addEventListener('click', function (evento) {
            const accion = evento.target.closest('[data-accion]');
            const fila = evento.target.closest('tr[data-id]');

            if (accion) {
                const tipo = accion.dataset.accion;

                if (tipo === 'deshacer') {
                    deshacer();
                    return;
                }

                const id = Number(fila?.dataset.id);

                if (tipo === 'descuento') {
                    editarDescuento(id);
                    return;
                }

                if (tipo === 'sumar') {
                    sumarCantidad(id, 1);
                } else if (tipo === 'restar') {
                    const item = buscarItem(id);

                    if (item && item.cantidad <= 1) {
                        quitarLinea(id);
                    } else {
                        sumarCantidad(id, -1);
                    }
                }

                // El foco vuelve al buscador: el lector de códigos sigue funcionando.
                ui.buscar?.focus();
                return;
            }

            if (fila && !evento.target.closest('[data-cantidad]')) {
                seleccionar(Number(fila.dataset.id));
            }
        });

        ui.lineas.addEventListener('focusin', function (evento) {
            const input = evento.target.closest('[data-cantidad]');

            if (input) {
                const id = Number(input.closest('tr[data-id]').dataset.id);

                if (estado.seleccion !== id) {
                    seleccionar(id);
                }

                // select() en Chrome también enfoca: solo si el campo sigue enfocado,
                // o le robaría el foco al buscador después de confirmar con Enter.
                window.requestAnimationFrame(function () {
                    if (document.activeElement === input) {
                        input.select();
                    }
                });
            }
        });

        ui.lineas.addEventListener('keydown', function (evento) {
            const input = evento.target.closest('[data-cantidad]');

            if (!input) {
                return;
            }

            const id = Number(input.closest('tr[data-id]').dataset.id);

            if (evento.key === 'Enter') {
                evento.preventDefault();
                confirmarCantidad(input, true);
            } else if (evento.key === 'Escape') {
                evento.preventDefault();
                evento.stopPropagation();
                const item = buscarItem(id);
                input.value = item ? cantidadTexto(item.cantidad) : input.value;
                ui.buscar?.focus();
            } else if (evento.key === 'ArrowUp' || evento.key === 'ArrowDown') {
                // Flechas: suben o bajan de a uno sin salir del campo (no quitan la línea).
                evento.preventDefault();
                const item = buscarItem(id);

                if (!item) {
                    return;
                }

                const escrito = leerCantidad(input.value);
                const base = Number.isFinite(escrito) && escrito > 0 ? escrito : item.cantidad;
                const nueva = normalizarCantidad(base + (evento.key === 'ArrowUp' ? 1 : -1), item.permiteDecimal);

                if (nueva <= 0) {
                    return;
                }

                const validacion = validarCantidad(item, nueva);

                if (!validacion.ok) {
                    marcarErrorCantidad(id);
                    aviso(validacion.mensaje, 'error');
                    return;
                }

                item.cantidad = nueva;
                estado.enfocarCantidad = id;
                alCambiarCarrito();
            }
        });

        ui.lineas.addEventListener('change', function (evento) {
            const input = evento.target.closest('[data-cantidad]');

            if (input) {
                confirmarCantidad(input, false);
            }
        });

        ui.tabla?.addEventListener('scroll', actualizarIndicadorArriba, { passive: true });
        ui.arriba?.addEventListener('click', function () {
            ui.tabla.scrollTo({ top: 0, behavior: 'smooth' });
            ui.buscar?.focus();
        });
    }

    function dibujarTicket() {
        if (!ui.lineas) {
            return;
        }

        // Si el cajero está escribiendo una cantidad, se conserva lo escrito y el foco.
        const activo = document.activeElement;
        let enEdicion = null;

        if (activo && activo.matches && activo.matches('[data-cantidad]') && ui.lineas.contains(activo)) {
            const idActivo = Number(activo.closest('tr[data-id]').dataset.id);
            const itemActivo = buscarItem(idActivo);
            const escrito = leerCantidad(activo.value);

            enEdicion = {
                id: idActivo,
                valor: activo.value,
                inicio: activo.selectionStart,
                fin: activo.selectionEnd,
                // Solo se conserva lo escrito si todavía no se ha confirmado.
                sucio: !itemActivo || !Number.isFinite(escrito) || Math.abs(escrito - itemActivo.cantidad) > 0.0005,
            };
        }

        const filas = [];
        let numero = 0;

        estado.carrito.forEach(function (item, indice) {
            if (estado.deshacer && estado.deshacer.indice === indice) {
                filas.push(filaQuitada());
            }

            numero += 1;
            filas.push(filaLinea(item, numero));
        });

        if (estado.deshacer && estado.deshacer.indice >= estado.carrito.length) {
            filas.push(filaQuitada());
        }

        ui.lineas.innerHTML = filas.join('');
        ui.vacio.hidden = estado.carrito.length > 0 || Boolean(estado.deshacer);
        ui.numeroFactura.textContent = estado.numeroFactura;
        ui.resumenTicket.textContent = textoResumenTicket();

        const destello = estado.destello;
        estado.destello = null;

        if (destello !== null) {
            ui.lineas.querySelector(`tr[data-id="${destello}"]`)?.scrollIntoView({ block: 'nearest' });
        }

        if (estado.enfocarCantidad !== null) {
            const input = ui.lineas.querySelector(`tr[data-id="${estado.enfocarCantidad}"] [data-cantidad]`);
            estado.enfocarCantidad = null;

            if (input) {
                input.focus();
                input.select();
            }
        } else if (enEdicion) {
            const input = ui.lineas.querySelector(`tr[data-id="${enEdicion.id}"] [data-cantidad]`);

            if (input) {
                input.focus();

                if (enEdicion.sucio) {
                    input.value = enEdicion.valor;

                    try {
                        input.setSelectionRange(enEdicion.inicio, enEdicion.fin);
                    } catch (error) {
                        // Algunos tipos de campo no admiten selección; no pasa nada.
                    }
                }
            }
        }

        actualizarIndicadorArriba();
    }

    function filaLinea(item, numero) {
        const linea = calcularLinea(item);
        const descuento = descuentoDe(item);
        const esMinimo = item.cantidad <= 1;
        const iconoQuitar = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
        const iva = item.manejaIva && item.porcentajeIva > 0 ? `<span>IVA ${item.porcentajeIva} %</span>` : '';
        const masIva = item.manejaIva && item.porcentajeIva > 0 && !item.precioIncluyeIva ? '<small>+ IVA</small>' : '';
        let avisoStock = '';

        if (item.controlaInventario && item.cantidad > item.stock + 0.000001) {
            avisoStock = `<span class="pos-aviso-stock">⚠ Stock ${cantidadTexto(item.stock)} · quedará en ${cantidadTexto(Math.round((item.stock - item.cantidad) * 1000) / 1000)}</span>`;
        }

        const clases = ['pos-linea'];

        if (item.id === estado.seleccion) {
            clases.push('is-seleccionada');
        }

        if (item.id === estado.destello) {
            clases.push('is-nueva');
        }

        return `
            <tr class="${clases.join(' ')}" data-id="${item.id}">
                <td class="pos-linea-indice">${numero}</td>
                <td class="pos-linea-producto">
                    <span class="pos-linea-nombre" title="${escapar(item.nombre)}">${escapar(item.nombre)}</span>
                    <span class="pos-linea-meta">
                        <span class="pos-linea-codigo">${escapar(item.codigo || item.codigoBarras || '')}</span>
                        ${iva}
                        ${avisoStock}
                    </span>
                </td>
                <td>
                    <div class="pos-cantidad">
                        <button type="button" data-accion="restar" class="${esMinimo ? 'is-quitar' : ''}"
                            aria-label="${esMinimo ? 'Quitar producto' : 'Restar uno'}" tabindex="-1">${esMinimo ? iconoQuitar : '−'}</button>
                        <label class="pos-cantidad-valor">
                            <input type="text" data-cantidad inputmode="${item.permiteDecimal ? 'decimal' : 'numeric'}"
                                value="${cantidadTexto(item.cantidad)}" autocomplete="off" spellcheck="false"
                                aria-label="Cantidad de ${escapar(item.nombre)} en ${escapar(item.unidad)}">
                            <span>${escapar(item.unidad)}</span>
                        </label>
                        <button type="button" data-accion="sumar" aria-label="Sumar uno" tabindex="-1">+</button>
                    </div>
                </td>
                <td class="pos-linea-precio">
                    <button type="button" data-accion="descuento" tabindex="-1"
                        class="pos-linea-precio-boton${descuento > 0 ? ' tiene-descuento' : ''}"
                        title="Descuento por unidad (F6)" aria-label="Precio ${pesos(item.precio - descuento)}. Descuento para ${escapar(item.nombre)}">
                        <span>× ${pesos(item.precio - descuento)}${masIva}</span>
                        ${descuento > 0 ? `<small class="pos-linea-descuento">−${pesos(descuento)} c/u</small>` : ''}
                    </button>
                </td>
                <td class="pos-linea-total">${pesos(linea.total)}</td>
            </tr>`;
    }

    function filaQuitada() {
        const item = estado.deshacer.item;
        const tactil = document.documentElement.dataset.posMode === 'tactil';

        return `
            <tr class="pos-linea-quitada">
                <td colspan="5">
                    <div class="pos-quitada">
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
                        <span>${escapar(item.nombre)}</span>
                        <strong>Quitada</strong>
                        <button type="button" data-accion="deshacer">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
                            Deshacer ${tactil ? '' : '<kbd>Ctrl+Z</kbd>'}
                        </button>
                    </div>
                </td>
            </tr>`;
    }

    function textoResumenTicket() {
        const lineas = estado.carrito.length;

        if (!lineas && !estado.deshacer) {
            return 'Sin productos';
        }

        const textoLineas = `${lineas} ${lineas === 1 ? 'línea' : 'líneas'}`;

        if (estado.deshacer) {
            return `${textoLineas} · la línea quitada se borra en ${SEGUNDOS_DESHACER} s`;
        }

        const unidades = new Set(estado.carrito.map(function (item) {
            return item.unidad;
        }));

        if (unidades.size === 1) {
            const suma = estado.carrito.reduce(function (total, item) {
                return total + item.cantidad;
            }, 0);
            return `${textoLineas} · ${cantidadTexto(Math.round(suma * 1000) / 1000)} ${Array.from(unidades)[0]}`;
        }

        return textoLineas;
    }

    function actualizarIndicadorArriba() {
        if (!ui.tabla || !ui.arriba) {
            return;
        }

        const cabecera = ui.tabla.querySelector('thead')?.offsetHeight || 0;
        const limite = ui.tabla.scrollTop + cabecera;
        let ocultas = 0;

        ui.lineas.querySelectorAll('tr.pos-linea').forEach(function (fila) {
            if (fila.offsetTop + fila.offsetHeight <= limite + 2) {
                ocultas += 1;
            }
        });

        if (!ocultas) {
            ui.arriba.hidden = true;
            return;
        }

        const tactil = document.documentElement.dataset.posMode === 'tactil';
        ui.arriba.hidden = false;
        ui.arriba.textContent = `↑ ${ocultas} ${ocultas === 1 ? 'línea' : 'líneas'} arriba${tactil ? '' : ' · Ctrl+↑'}`;
    }

    /* ---------------------------------------------------------------
       Totales, acciones y dibujo general
       --------------------------------------------------------------- */
    function dibujarTodo() {
        dibujarTicket();
        dibujarTotales();
        dibujarFrecuentes();
        dibujarAcciones();
        dibujarCliente();

        if (estado.vista === 'pago') {
            dibujarPago();
        }
    }

    function dibujarTotales() {
        const resumen = calcularResumen();
        const tasas = Array.from(new Set(estado.carrito
            .filter(function (item) {
                return item.manejaIva && item.porcentajeIva > 0;
            })
            .map(function (item) {
                return item.porcentajeIva;
            })));

        ui.subtotal.textContent = pesos(resumen.subtotal);
        ui.iva.textContent = pesos(resumen.iva);
        ui.etiquetaIva.textContent = tasas.length === 1 ? `IVA ${tasas[0]} %` : 'IVA';
        ui.total.textContent = pesos(resumen.total);

        if (ui.descuento && ui.filaDescuento) {
            ui.descuento.textContent = pesos(resumen.descuento);
            ui.filaDescuento.hidden = resumen.descuento <= 0;
        }
        ui.total.parentElement.classList.toggle('is-cero', resumen.total <= 0);
        ui.cobrarMonto.textContent = pesos(resumen.total);
        ui.cobrar.disabled = !puedeCobrar(resumen);
    }

    function dibujarAcciones() {
        const hayCarrito = estado.carrito.length > 0;

        if (ui.limpiar) {
            ui.limpiar.disabled = !hayCarrito;
        }

        if (ui.pendiente) {
            ui.pendiente.disabled = !hayCarrito || !estado.puedeVender;
        }

        dibujarPendientes();
    }

    function iniciarAcciones() {
        ui.limpiar?.addEventListener('click', async function () {
            if (!estado.carrito.length) {
                return;
            }

            const confirmado = await confirmar({
                titulo: 'Limpiar la venta',
                mensaje: estado.carrito.length === 1
                    ? 'Se quitará la línea y los pagos digitados.'
                    : `Se quitarán ${estado.carrito.length} líneas y los pagos digitados.`,
                textoConfirmar: 'Limpiar venta',
            });

            if (confirmado) {
                reiniciarVenta();
                cerrarPago(false);
                dibujarTodo();
            }

            ui.buscar?.focus();
        });

        ui.pendiente?.addEventListener('click', dejarPendiente);

        ui.pendientes?.addEventListener('click', function () {
            if (ui.panelPendientes.hidden) {
                abrirPanelPendientes();
            } else {
                cerrarPanelPendientes();
            }
        });

        ui.panelPendientes?.addEventListener('click', function (evento) {
            const retomar = evento.target.closest('[data-retomar]');
            const descartar = evento.target.closest('[data-descartar]');

            if (retomar) {
                retomarPendiente(Number(retomar.dataset.retomar));
            } else if (descartar) {
                descartarPendiente(Number(descartar.dataset.descartar));
            }
        });
    }

    function reiniciarVenta() {
        finalizarDeshacer(false);
        estado.carrito = [];
        estado.pagos = [];
        estado.borrador = null;
        estado.errorCobro = null;
        estado.seleccion = null;
        estado.cliente = clienteConsumidorFinal();
        fijarMultiplicador(null);
        guardarAlmacen(CLAVES.ventaEnCurso, null, window.sessionStorage);

        if (ui.buscar) {
            ui.buscar.value = '';
        }

        ocultarResultados();
    }

    /* ---------------------------------------------------------------
       Venta en curso: sobrevive si el cajero va a otro módulo y vuelve
       --------------------------------------------------------------- */
    function guardarVentaEnCurso() {
        if (!estado.carrito.length) {
            guardarAlmacen(CLAVES.ventaEnCurso, null, window.sessionStorage);
            return;
        }

        guardarAlmacen(CLAVES.ventaEnCurso, JSON.stringify({
            cliente: estado.cliente,
            items: estado.carrito.map(function (item) {
                return { id: item.id, nombre: item.nombre, cantidad: item.cantidad, descuento: descuentoDe(item) };
            }),
        }), window.sessionStorage);
    }

    async function recuperarVentaEnCurso() {
        if (!estado.puedeVender) {
            return;
        }

        let guardada = null;

        try {
            guardada = JSON.parse(leerAlmacen(CLAVES.ventaEnCurso, window.sessionStorage) || 'null');
        } catch (error) {
            guardada = null;
        }

        if (!guardada || !Array.isArray(guardada.items) || !guardada.items.length) {
            return;
        }

        const omitidos = await cargarItemsGuardados(guardada.items);
        estado.cliente = guardada.cliente && guardada.cliente.nombre ? guardada.cliente : clienteConsumidorFinal();
        alCambiarCarrito();

        if (omitidos.length) {
            aviso(`Venta recuperada. No se pudo volver a agregar: ${omitidos.join(', ')}.`, 'error');
        } else if (estado.carrito.length) {
            aviso('Venta en curso recuperada.', 'ok');
        }
    }

    // Vuelve a pedir cada producto al servidor (precio y stock actuales).
    async function cargarItemsGuardados(items) {
        const respuestas = await Promise.all(items.map(async function (guardado) {
            try {
                const respuesta = await fetch(`/ventas/productos/${encodeURIComponent(guardado.id)}`);
                const json = await respuesta.json();
                return json.ok ? { producto: normalizarProducto(json.producto), guardado } : { guardado };
            } catch (error) {
                return { guardado };
            }
        }));

        const omitidos = [];

        respuestas.forEach(function (respuesta) {
            const producto = respuesta.producto;
            const cantidad = Number(respuesta.guardado.cantidad);

            if (!producto || !producto.puedeVender || !validarCantidad(producto, cantidad).ok || buscarItem(producto.id)) {
                omitidos.push(respuesta.guardado.nombre || 'Producto');
                return;
            }

            estado.carrito.push(Object.assign({}, producto, {
                cantidad: normalizarCantidad(cantidad, producto.permiteDecimal),
                descuento: Math.min(Math.max(0, Math.round(Number(respuesta.guardado.descuento) || 0)), producto.precio),
            }));
        });

        const ultimo = estado.carrito[estado.carrito.length - 1];
        estado.seleccion = ultimo ? ultimo.id : null;
        return omitidos;
    }

    /* ---------------------------------------------------------------
       Ventas pendientes (en espera)
       --------------------------------------------------------------- */
    function leerPendientes() {
        try {
            const lista = JSON.parse(leerAlmacen(CLAVES.pendientes) || '[]');
            return Array.isArray(lista) ? lista : [];
        } catch (error) {
            return [];
        }
    }

    function guardarPendientes(lista) {
        guardarAlmacen(CLAVES.pendientes, lista.length ? JSON.stringify(lista) : null);
    }

    function dejarPendiente() {
        if (!estado.carrito.length) {
            return;
        }

        const lista = leerPendientes();

        if (lista.length >= MAX_PENDIENTES) {
            aviso(`Ya hay ${MAX_PENDIENTES} ventas en espera. Retoma o descarta alguna primero.`, 'error');
            return;
        }

        lista.push({
            id: Date.now(),
            creado: new Date().toISOString(),
            cliente: estado.cliente,
            total: calcularResumen().total,
            items: estado.carrito.map(function (item) {
                return { id: item.id, nombre: item.nombre, cantidad: item.cantidad, descuento: descuentoDe(item) };
            }),
        });

        guardarPendientes(lista);
        reiniciarVenta();
        cerrarPago(false);
        dibujarTodo();
        aviso('Venta en espera. Retómala desde "Pendientes".', 'ok');
        ui.buscar?.focus();
    }

    function dibujarPendientes() {
        if (!ui.pendientes) {
            return;
        }

        const lista = leerPendientes();
        ui.pendientes.hidden = !lista.length;
        ui.pendientes.textContent = `Pendientes (${lista.length})`;

        if (!lista.length) {
            cerrarPanelPendientes();
            return;
        }

        if (ui.panelPendientes.hidden) {
            return;
        }

        ui.panelPendientes.innerHTML = lista.map(function (pendiente) {
            const hora = new Date(pendiente.creado).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            const lineas = pendiente.items.length;

            return `
                <div class="pos-pendiente">
                    <div>
                        <strong>${escapar(pendiente.cliente?.nombre || 'Consumidor final')}</strong>
                        <small>${escapar(hora)} · ${lineas} ${lineas === 1 ? 'línea' : 'líneas'}</small>
                    </div>
                    <span class="pos-pendiente-monto">${pesos(pendiente.total)}</span>
                    <span class="pos-pendiente-acciones">
                        <button type="button" class="btn-primary btn-small" data-retomar="${pendiente.id}">Retomar</button>
                        <button type="button" class="btn-secondary btn-small" data-descartar="${pendiente.id}" aria-label="Descartar">✕</button>
                    </span>
                </div>`;
        }).join('');
    }

    function abrirPanelPendientes() {
        ui.panelPendientes.hidden = false;
        ui.pendientes.setAttribute('aria-expanded', 'true');
        dibujarPendientes();
    }

    function cerrarPanelPendientes() {
        if (!ui.panelPendientes || ui.panelPendientes.hidden) {
            return;
        }

        ui.panelPendientes.hidden = true;
        ui.pendientes?.setAttribute('aria-expanded', 'false');
    }

    async function retomarPendiente(id) {
        if (estado.carrito.length) {
            aviso('Termina o deja en espera la venta actual primero.', 'error');
            return;
        }

        const lista = leerPendientes();
        const pendiente = lista.find(function (item) {
            return item.id === id;
        });

        if (!pendiente) {
            return;
        }

        cerrarPanelPendientes();
        guardarPendientes(lista.filter(function (item) {
            return item.id !== id;
        }));

        const omitidos = await cargarItemsGuardados(pendiente.items || []);
        estado.cliente = pendiente.cliente && pendiente.cliente.nombre ? pendiente.cliente : clienteConsumidorFinal();
        alCambiarCarrito();

        if (omitidos.length) {
            aviso(`Venta retomada. No se pudo volver a agregar: ${omitidos.join(', ')}.`, 'error');
        } else {
            aviso('Venta retomada.', 'ok');
        }

        ui.buscar?.focus();
    }

    async function descartarPendiente(id) {
        const confirmado = await confirmar({
            titulo: 'Descartar venta en espera',
            mensaje: 'La venta en espera se borrará y no se podrá recuperar.',
            textoConfirmar: 'Descartar',
        });

        if (!confirmado) {
            return;
        }

        guardarPendientes(leerPendientes().filter(function (item) {
            return item.id !== id;
        }));
        dibujarPendientes();
        ui.buscar?.focus();
    }

    /* ---------------------------------------------------------------
       Cliente
       --------------------------------------------------------------- */
    function clienteConsumidorFinal() {
        const consumidor = datos.consumidorFinal || {};

        return {
            id: null,
            nombre: consumidor.nombre || 'Consumidor final',
            documento: consumidor.documento || '',
        };
    }

    function dibujarCliente() {
        if (ui.clienteNombre) {
            ui.clienteNombre.textContent = estado.cliente.nombre;
        }

        if (ui.clienteDocumento) {
            ui.clienteDocumento.textContent = estado.cliente.documento || '';
        }
    }

    function iniciarCliente() {
        if (!ui.botonCliente || !ui.panelCliente) {
            return;
        }

        ui.botonCliente.addEventListener('click', function () {
            if (ui.panelCliente.hidden) {
                abrirPanelCliente();
            } else {
                cerrarPanelCliente();
                ui.buscar?.focus();
            }
        });

        ui.buscarCliente.addEventListener('input', function () {
            const termino = ui.buscarCliente.value.trim();
            window.clearTimeout(estado.clientes.temporizador);

            if (!termino) {
                estado.clientes.resultados = [];
                ui.resultadosClientes.innerHTML = '<p class="pos-cliente-vacio">Escribe para buscar un cliente.</p>';
                return;
            }

            estado.clientes.temporizador = window.setTimeout(function () {
                buscarClientes(termino);
            }, 180);
        });

        ui.buscarCliente.addEventListener('keydown', function (evento) {
            const total = estado.clientes.resultados.length;

            if ((evento.key === 'ArrowDown' || evento.key === 'ArrowUp') && total) {
                evento.preventDefault();
                estado.clientes.activo = (estado.clientes.activo + (evento.key === 'ArrowDown' ? 1 : -1) + total) % total;
                marcarClienteActivo();
            } else if (evento.key === 'Enter') {
                evento.preventDefault();
                const cliente = estado.clientes.resultados[estado.clientes.activo];

                if (cliente) {
                    seleccionarCliente(cliente);
                }
            }
        });

        ui.resultadosClientes.addEventListener('click', function (evento) {
            const fila = evento.target.closest('[data-indice]');

            if (fila) {
                seleccionarCliente(estado.clientes.resultados[Number(fila.dataset.indice)]);
            }
        });

        ui.clienteFinal?.addEventListener('click', function () {
            seleccionarCliente(null);
        });

        ui.abrirClienteRapido?.addEventListener('click', function () {
            cerrarPanelCliente();
            abrirModalClienteRapido();
        });
    }

    function abrirPanelCliente() {
        if (!estado.puedeVender) {
            return;
        }

        ocultarResultados();
        cerrarPanelPendientes();
        ui.panelCliente.hidden = false;
        ui.botonCliente.setAttribute('aria-expanded', 'true');
        ui.buscarCliente.value = '';
        estado.clientes.resultados = [];
        ui.resultadosClientes.innerHTML = '<p class="pos-cliente-vacio">Escribe para buscar un cliente.</p>';
        ui.buscarCliente.focus();
    }

    function cerrarPanelCliente() {
        if (!ui.panelCliente || ui.panelCliente.hidden) {
            return;
        }

        ui.panelCliente.hidden = true;
        ui.botonCliente.setAttribute('aria-expanded', 'false');
    }

    async function buscarClientes(termino) {
        estado.clientes.controlador?.abort();
        const controlador = new AbortController();
        estado.clientes.controlador = controlador;

        try {
            const respuesta = await fetch(`/ventas/clientes/buscar?busqueda=${encodeURIComponent(termino)}`, {
                signal: controlador.signal,
            });
            const json = await respuesta.json();

            if (ui.buscarCliente.value.trim() !== termino) {
                return;
            }

            estado.clientes.resultados = json.ok && Array.isArray(json.clientes) ? json.clientes : [];
            estado.clientes.activo = 0;

            if (!estado.clientes.resultados.length) {
                ui.resultadosClientes.innerHTML = '<p class="pos-cliente-vacio">No se encontraron clientes.</p>';
                return;
            }

            ui.resultadosClientes.innerHTML = estado.clientes.resultados.map(function (cliente, indice) {
                return `
                    <button type="button" class="pos-cliente-resultado" data-indice="${indice}" tabindex="-1">
                        <strong>${escapar(cliente.nombre)}</strong>
                        <small>${escapar(cliente.texto_secundario || cliente.etiqueta_documento || '')}</small>
                    </button>`;
            }).join('');

            marcarClienteActivo();
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error buscando clientes:', error);
            }
        }
    }

    function marcarClienteActivo() {
        ui.resultadosClientes.querySelectorAll('[data-indice]').forEach(function (fila) {
            const activo = Number(fila.dataset.indice) === estado.clientes.activo;
            fila.classList.toggle('is-activo', activo);

            if (activo) {
                fila.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    function seleccionarCliente(cliente) {
        estado.cliente = cliente
            ? {
                id: Number(cliente.id_cliente) || null,
                nombre: cliente.nombre || cliente.nombre_mostrar || 'Cliente',
                documento: cliente.etiqueta_documento
                    || [cliente.tipo_documento, cliente.documento].filter(Boolean).join(' '),
            }
            : clienteConsumidorFinal();

        dibujarCliente();
        cerrarPanelCliente();
        guardarVentaEnCurso();
        ui.buscar?.focus();
    }

    /* ---------------------------------------------------------------
       Cliente rápido (modal)
       --------------------------------------------------------------- */
    function iniciarClienteRapido() {
        if (!ui.modalClienteRapido || !ui.formClienteRapido) {
            return;
        }

        ui.cerrarClienteRapido?.addEventListener('click', cerrarModalClienteRapido);
        ui.cancelarClienteRapido?.addEventListener('click', cerrarModalClienteRapido);

        ui.modalClienteRapido.addEventListener('click', function (evento) {
            if (evento.target === ui.modalClienteRapido) {
                cerrarModalClienteRapido();
            }
        });

        ui.modalClienteRapido.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') {
                evento.preventDefault();
                cerrarModalClienteRapido();
            }
        });

        ui.tipoDocumentoClienteRapido?.addEventListener('change', actualizarTipoDocumentoClienteRapido);

        ui.formClienteRapido.addEventListener('submit', function (evento) {
            evento.preventDefault();
            guardarClienteRapido();
        });

        actualizarTipoDocumentoClienteRapido();
    }

    function abrirModalClienteRapido() {
        ui.formClienteRapido.reset();

        if (ui.tipoDocumentoClienteRapido) {
            ui.tipoDocumentoClienteRapido.value = 'CC';
        }

        if (ui.autorizaClienteRapido) {
            ui.autorizaClienteRapido.checked = true;
        }

        limpiarErroresClienteRapido();
        actualizarTipoDocumentoClienteRapido();
        ui.modalClienteRapido.hidden = false;
        document.body.classList.add('ventas-modal-open');

        window.requestAnimationFrame(function () {
            ui.documentoClienteRapido?.focus();
        });
    }

    function cerrarModalClienteRapido() {
        ui.modalClienteRapido.hidden = true;
        document.body.classList.remove('ventas-modal-open');
        ui.buscar?.focus();
    }

    function actualizarTipoDocumentoClienteRapido() {
        const esNit = ui.tipoDocumentoClienteRapido?.value === 'NIT';

        if (ui.campoDvClienteRapido) {
            ui.campoDvClienteRapido.hidden = !esNit;
        }

        if (!esNit && ui.dvClienteRapido) {
            ui.dvClienteRapido.value = '';
        }
    }

    function limpiarErroresClienteRapido() {
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

    function mostrarErrorClienteRapido(campo, mensaje) {
        limpiarErroresClienteRapido();

        if (ui.avisoClienteRapido) {
            ui.avisoClienteRapido.textContent = mensaje;
            ui.avisoClienteRapido.hidden = false;
        }

        if (campo) {
            campo.classList.add('is-invalid');
            campo.focus();
        }
    }

    function construirPayloadClienteRapido() {
        const tipoDocumento = ui.tipoDocumentoClienteRapido?.value || 'CC';
        const documento = ui.documentoClienteRapido?.value.trim() || '';
        const digitoVerificacion = ui.dvClienteRapido?.value.trim() || '';
        const nombre = ui.nombreClienteRapido?.value.trim() || '';
        const esNit = tipoDocumento === 'NIT';

        if (!documento) {
            return { ok: false, campo: ui.documentoClienteRapido, mensaje: 'Digita el documento del cliente.' };
        }

        if (esNit && !digitoVerificacion) {
            return { ok: false, campo: ui.dvClienteRapido, mensaje: 'Digita el DV del NIT.' };
        }

        if (!nombre) {
            return { ok: false, campo: ui.nombreClienteRapido, mensaje: 'Digita el nombre del cliente.' };
        }

        if (!esNit && nombre.split(/\s+/).filter(Boolean).length < 2) {
            return { ok: false, campo: ui.nombreClienteRapido, mensaje: 'Digita nombre y apellido del cliente.' };
        }

        return {
            ok: true,
            datos: {
                tipo_documento: tipoDocumento,
                documento,
                digito_verificacion: digitoVerificacion,
                nombre,
                celular: ui.celularClienteRapido?.value.trim() || '',
                correo: ui.correoClienteRapido?.value.trim() || '',
                autoriza_tratamiento_datos: ui.autorizaClienteRapido?.checked ? 1 : 0,
            },
        };
    }

    async function guardarClienteRapido() {
        limpiarErroresClienteRapido();
        const payload = construirPayloadClienteRapido();

        if (!payload.ok) {
            mostrarErrorClienteRapido(payload.campo, payload.mensaje);
            return;
        }

        const boton = ui.guardarClienteRapido;
        const textoOriginal = boton?.textContent || 'Crear y seleccionar';

        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Guardando…';
        }

        try {
            const respuesta = await fetch(ui.formClienteRapido.dataset.url || '/clientes/rapido', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload.datos),
            });
            const json = await respuesta.json();

            if (!respuesta.ok || !json.ok) {
                mostrarErrorClienteRapido(null, json.mensaje || 'No se pudo crear el cliente.');
                return;
            }

            ui.modalClienteRapido.hidden = true;
            document.body.classList.remove('ventas-modal-open');
            seleccionarCliente(json.cliente);
            aviso('Cliente creado y seleccionado.', 'ok');
        } catch (error) {
            console.error('Error creando cliente rápido:', error);
            mostrarErrorClienteRapido(null, 'Error de conexión creando el cliente.');
        } finally {
            if (boton) {
                boton.disabled = false;
                boton.textContent = textoOriginal;
            }
        }
    }

    /* ---------------------------------------------------------------
       Frecuentes (accesos rápidos, 6 posiciones)
       --------------------------------------------------------------- */
    function iniciarFrecuentes() {
        if (!ui.listaFrecuentes) {
            return;
        }

        ui.plegarFrecuentes?.addEventListener('click', function () {
            const plegado = leerAlmacen(CLAVES.plegados) === '1';
            guardarAlmacen(CLAVES.plegados, plegado ? null : '1');
            dibujarFrecuentes();
            ui.buscar?.focus();
        });

        ui.editarFrecuentes?.addEventListener('click', function () {
            estado.editandoFrecuentes = !estado.editandoFrecuentes;

            if (estado.editandoFrecuentes) {
                guardarAlmacen(CLAVES.plegados, null);
            }

            dibujarFrecuentes();
        });

        ui.listaFrecuentes.addEventListener('click', function (evento) {
            const fila = evento.target.closest('[data-posicion]');

            if (!fila) {
                return;
            }

            const posicion = Number(fila.dataset.posicion);

            if (estado.editandoFrecuentes) {
                const accion = evento.target.closest('[data-accion]')?.dataset.accion || 'cambiar';

                if (accion === 'subir') {
                    moverFrecuente(posicion, posicion - 1);
                } else if (accion === 'bajar') {
                    moverFrecuente(posicion, posicion + 1);
                } else if (accion === 'quitar') {
                    quitarFrecuente(posicion);
                } else {
                    abrirModalFrecuente(posicion);
                }
                return;
            }

            const producto = estado.frecuentes[posicion - 1];

            if (producto) {
                agregarProducto(producto);
            }

            ui.buscar?.focus();
        });
    }

    function dibujarFrecuentes() {
        if (!ui.listaFrecuentes) {
            return;
        }

        const plegado = leerAlmacen(CLAVES.plegados) === '1' && !estado.editandoFrecuentes;
        const editando = estado.editandoFrecuentes;

        ui.frecuentes.classList.toggle('is-plegado', plegado);

        if (ui.plegarFrecuentes) {
            ui.plegarFrecuentes.setAttribute('aria-expanded', String(!plegado));
            ui.plegarFrecuentes.querySelector('span').textContent = plegado ? 'Mostrar' : 'Plegar';
            ui.plegarFrecuentes.hidden = editando;
        }

        if (ui.editarFrecuentes) {
            ui.editarFrecuentes.setAttribute('aria-pressed', String(editando));
            ui.editarFrecuentes.textContent = editando ? 'Listo' : 'Editar';
        }

        const posiciones = estado.frecuentes.map(function (producto, indice) {
            return { producto, posicion: indice + 1 };
        });
        const visibles = editando ? posiciones : posiciones.filter(function (entrada) {
            return entrada.producto;
        });

        if (!visibles.length) {
            ui.listaFrecuentes.innerHTML = `<li class="pos-frecuentes-ayuda">${datos.esAdministrador
                ? 'Usa "Editar" para elegir hasta 6 productos frecuentes.'
                : 'Aún no hay productos frecuentes.'}</li>`;
            return;
        }

        ui.listaFrecuentes.innerHTML = visibles.map(function (entrada) {
            const producto = entrada.producto;
            const posicion = entrada.posicion;

            if (!producto) {
                return `
                    <li>
                        <div class="pos-frecuente" data-posicion="${posicion}" role="button" tabindex="0">
                            <span class="pos-frecuente-foto">+</span>
                            <span class="pos-frecuente-nombre pos-frecuente-vacio">Posición ${posicion} libre</span>
                            <span></span>
                            <span class="pos-frecuente-editar"><button type="button" data-accion="cambiar" title="Asignar producto">✎</button></span>
                        </div>
                    </li>`;
            }

            const foto = producto.imagen
                ? `<img src="${escapar(producto.imagen)}" alt="" loading="lazy">`
                : `<span class="pos-frecuente-iniciales">${escapar(iniciales(producto.nombre))}</span>`;
            const precio = pesos(producto.precio)
                + (producto.unidad !== 'und' ? ` <small>/ ${escapar(producto.unidad)}</small>` : '');
            const vendible = producto.puedeVender && estado.puedeVender;

            if (editando) {
                return `
                    <li>
                        <div class="pos-frecuente" data-posicion="${posicion}">
                            <span class="pos-frecuente-foto">${foto}</span>
                            <span class="pos-frecuente-nombre">${escapar(producto.nombre)}</span>
                            <span class="pos-frecuente-precio">${precio}</span>
                            <span class="pos-frecuente-editar">
                                <button type="button" data-accion="subir" title="Subir" ${posicion === 1 ? 'disabled' : ''}>↑</button>
                                <button type="button" data-accion="bajar" title="Bajar" ${posicion === 6 ? 'disabled' : ''}>↓</button>
                                <button type="button" data-accion="cambiar" title="Cambiar producto">✎</button>
                                <button type="button" data-accion="quitar" title="Quitar">✕</button>
                            </span>
                        </div>
                    </li>`;
            }

            return `
                <li>
                    <button type="button" class="pos-frecuente" data-posicion="${posicion}"
                        ${vendible ? '' : 'disabled'}
                        title="${escapar(producto.nombre)} (Alt + ${posicion})">
                        <span class="pos-frecuente-foto">${foto}</span>
                        <span class="pos-frecuente-nombre">${escapar(producto.nombre)}</span>
                        <span class="pos-frecuente-precio">${precio}</span>
                        ${producto.puedeVender ? '' : '<span class="pos-frecuente-agotado">Sin stock</span>'}
                        <kbd>Alt ${posicion}</kbd>
                    </button>
                </li>`;
        }).join('');
    }

    function iniciarConfiguracionFrecuentes() {
        if (!ui.modalFrecuente || !ui.formFrecuente) {
            return;
        }

        let temporizador = null;

        ui.cerrarFrecuente?.addEventListener('click', cerrarModalFrecuente);
        ui.cancelarFrecuente?.addEventListener('click', cerrarModalFrecuente);

        ui.modalFrecuente.addEventListener('click', function (evento) {
            if (evento.target === ui.modalFrecuente) {
                cerrarModalFrecuente();
            }
        });

        ui.modalFrecuente.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') {
                evento.preventDefault();
                cerrarModalFrecuente();
            }
        });

        ui.buscarFrecuente?.addEventListener('input', function () {
            window.clearTimeout(temporizador);
            temporizador = window.setTimeout(buscarProductoFrecuente, 220);
        });

        ui.resultadosFrecuente?.addEventListener('click', function (evento) {
            const fila = evento.target.closest('[data-indice]');

            if (!fila) {
                return;
            }

            const producto = (ui.resultadosFrecuente._productos || [])[Number(fila.dataset.indice)];

            if (!producto) {
                return;
            }

            estado.productoConfig = producto;
            ui.productoFrecuente.value = producto.id;
            ui.seleccionadoFrecuente.hidden = false;
            ui.seleccionadoFrecuente.textContent = `Seleccionado: ${producto.nombre}`;
            ui.guardarFrecuente.disabled = false;
            ui.resultadosFrecuente.querySelectorAll('[data-indice]').forEach(function (item) {
                item.classList.toggle('is-selected', item === fila);
            });
        });

        ui.formFrecuente.addEventListener('submit', function (evento) {
            evento.preventDefault();
            guardarFrecuente();
        });
    }

    function abrirModalFrecuente(posicion) {
        estado.productoConfig = null;
        ui.posicionFrecuente.value = posicion;
        ui.productoFrecuente.value = '';
        ui.buscarFrecuente.value = '';
        ui.seleccionadoFrecuente.hidden = true;
        ui.guardarFrecuente.disabled = true;
        ui.resultadosFrecuente.innerHTML = '<div class="ventas-quick-config-empty">Escribe para buscar un producto.</div>';
        ui.modalFrecuente.hidden = false;
        document.body.classList.add('ventas-modal-open');

        window.requestAnimationFrame(function () {
            ui.buscarFrecuente.focus();
        });
    }

    function cerrarModalFrecuente() {
        ui.modalFrecuente.hidden = true;
        document.body.classList.remove('ventas-modal-open');
    }

    async function buscarProductoFrecuente() {
        const termino = ui.buscarFrecuente.value.trim();

        if (!termino) {
            ui.resultadosFrecuente.innerHTML = '<div class="ventas-quick-config-empty">Escribe para buscar un producto.</div>';
            return;
        }

        try {
            const respuesta = await fetch(`/ventas/productos/buscar?busqueda=${encodeURIComponent(termino)}`);
            const json = await respuesta.json();
            const productos = json.ok && Array.isArray(json.productos) ? json.productos.map(normalizarProducto) : [];

            ui.resultadosFrecuente._productos = productos;

            if (!productos.length) {
                ui.resultadosFrecuente.innerHTML = '<div class="ventas-quick-config-empty">Sin resultados.</div>';
                return;
            }

            ui.resultadosFrecuente.innerHTML = productos.map(function (producto, indice) {
                const foto = producto.imagen
                    ? `<img src="${escapar(producto.imagen)}" alt="" loading="lazy">`
                    : escapar(iniciales(producto.nombre));

                return `
                    <button type="button" class="ventas-quick-config-item" data-indice="${indice}">
                        <span class="ventas-quick-config-thumb">${foto}</span>
                        <span><strong>${escapar(producto.nombre)}</strong><br><small>${escapar(producto.codigo)}</small></span>
                        <strong>${pesos(producto.precio)}</strong>
                    </button>`;
            }).join('');
        } catch (error) {
            console.error('Error buscando producto para frecuentes:', error);
        }
    }

    async function enviarConfiguracionFrecuente(url, cuerpo) {
        try {
            const respuesta = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cuerpo),
            });
            const json = await respuesta.json();

            if (!json.ok) {
                aviso(json.mensaje || 'No se pudo actualizar el producto frecuente.', 'error');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error configurando frecuentes:', error);
            aviso('No se pudo actualizar el producto frecuente.', 'error');
            return false;
        }
    }

    async function guardarFrecuente() {
        const posicion = Number(ui.posicionFrecuente.value);
        const producto = estado.productoConfig;

        if (!producto || !posicion) {
            aviso('Selecciona un producto.', 'error');
            return;
        }

        ui.guardarFrecuente.disabled = true;
        const ok = await enviarConfiguracionFrecuente(
            ui.formFrecuente.dataset.configUrl || '/ventas/pos-tactil/acceso-rapido',
            { id_producto: producto.id, posicion }
        );
        ui.guardarFrecuente.disabled = false;

        if (!ok) {
            return;
        }

        // Un producto ocupa una sola posición.
        estado.frecuentes = estado.frecuentes.map(function (actual) {
            return actual && actual.id === producto.id ? null : actual;
        });
        estado.frecuentes[posicion - 1] = producto;
        cerrarModalFrecuente();
        dibujarFrecuentes();
        aviso('Producto frecuente actualizado.', 'ok');
    }

    async function quitarFrecuente(posicion) {
        const producto = estado.frecuentes[posicion - 1];

        if (!producto) {
            return;
        }

        const confirmado = await confirmar({
            titulo: 'Quitar producto frecuente',
            mensaje: `"${producto.nombre}" dejará de aparecer en Frecuentes.`,
            textoConfirmar: 'Quitar',
        });

        if (!confirmado) {
            return;
        }

        const ok = await enviarConfiguracionFrecuente(
            ui.formFrecuente.dataset.removeUrl || '/ventas/pos-tactil/acceso-rapido/quitar',
            { posicion }
        );

        if (ok) {
            estado.frecuentes[posicion - 1] = null;
            dibujarFrecuentes();
        }
    }

    async function moverFrecuente(origen, destino) {
        if (destino < 1 || destino > 6 || !estado.frecuentes[origen - 1]) {
            return;
        }

        const ok = await enviarConfiguracionFrecuente(
            ui.formFrecuente.dataset.moveUrl || '/ventas/pos-tactil/acceso-rapido/mover',
            { posicion_origen: origen, posicion_destino: destino }
        );

        if (ok) {
            const temporal = estado.frecuentes[destino - 1];
            estado.frecuentes[destino - 1] = estado.frecuentes[origen - 1];
            estado.frecuentes[origen - 1] = temporal;
            dibujarFrecuentes();
        }
    }

    /* ---------------------------------------------------------------
       Cobro (reemplaza la columna derecha)
       --------------------------------------------------------------- */
    function medioPorId(idMedio) {
        return (datos.mediosPago || []).find(function (medio) {
            return medio.id === idMedio;
        }) || null;
    }

    function medioPredeterminado() {
        const medios = datos.mediosPago || [];

        return medios.find(function (medio) {
            return medio.tipo === 'efectivo';
        }) || medios.find(function (medio) {
            return medio.afectaEfectivo;
        }) || medios[0] || null;
    }

    function faltaParaBorrador() {
        const total = calcularResumen().total;
        const comprometido = estado.pagos.reduce(function (suma, pago) {
            return suma + pago.monto;
        }, 0);

        return Math.max(total - comprometido, 0);
    }

    function iniciarPago() {
        if (!ui.pago) {
            return;
        }

        ui.cobrar?.addEventListener('click', abrirPago);
        ui.volverPago?.addEventListener('click', function () {
            cerrarPago(true);
        });

        ui.medios?.addEventListener('click', function (evento) {
            const boton = evento.target.closest('[data-id-medio]');

            if (boton) {
                seleccionarMedio(Number(boton.dataset.idMedio));
            }
        });

        ui.monto?.addEventListener('focus', function () {
            window.requestAnimationFrame(function () {
                if (document.activeElement === ui.monto) {
                    ui.monto.select();
                }
            });
        });

        ui.monto?.addEventListener('input', function () {
            if (!estado.borrador) {
                return;
            }

            const digitos = ui.monto.value.replace(/\D/g, '').slice(0, 12);
            estado.borrador.monto = digitos ? Number(digitos) : 0;
            estado.borrador.tocado = true;
            ui.monto.value = estado.borrador.monto ? formatoPesos.format(estado.borrador.monto) : '';
            estado.errorCobro = null;
            ui.errorPago.hidden = true;
            actualizarEstadoPago();
        });

        [ui.monto, ui.referencia].forEach(function (campo) {
            campo?.addEventListener('keydown', function (evento) {
                if (evento.key === 'Enter') {
                    evento.preventDefault();
                    registrarVenta();
                }
            });
        });

        ui.referencia?.addEventListener('input', function () {
            if (estado.borrador) {
                estado.borrador.referencia = ui.referencia.value;
            }

            ui.referencia.classList.remove('is-invalido');
            actualizarEstadoPago();
        });

        ui.billetes?.addEventListener('click', function (evento) {
            const boton = evento.target.closest('[data-billete]');

            if (boton) {
                aplicarBillete(boton.dataset.billete);
            }
        });

        ui.pagos?.addEventListener('click', function (evento) {
            const boton = evento.target.closest('[data-quitar-pago]');

            if (!boton) {
                return;
            }

            estado.pagos.splice(Number(boton.dataset.quitarPago), 1);

            if (estado.borrador && !estado.borrador.tocado) {
                estado.borrador.monto = faltaParaBorrador();
            }

            dibujarPago();
            ui.monto?.focus();
        });

        ui.teclado?.addEventListener('mousedown', function (evento) {
            evento.preventDefault();
        });

        ui.teclado?.addEventListener('click', function (evento) {
            const tecla = evento.target.closest('[data-tecla]');

            if (tecla) {
                pulsarTecla(tecla.dataset.tecla);
            }
        });

        ui.registrar?.addEventListener('click', registrarVenta);
    }

    function abrirPago() {
        if (!puedeCobrar()) {
            if (!estado.carrito.length) {
                aviso('Agrega productos antes de cobrar.', 'error');
            }
            return;
        }

        cerrarPanelCliente();
        cerrarPanelPendientes();
        ocultarResultados();
        ocultarExito();
        estado.vista = 'pago';

        if (!estado.borrador) {
            const medio = medioPredeterminado();
            estado.borrador = medio
                ? { idMedio: medio.id, monto: faltaParaBorrador(), referencia: '', tocado: false }
                : null;
        } else if (!estado.borrador.tocado) {
            estado.borrador.monto = faltaParaBorrador();
        }

        ui.lateralVenta.hidden = true;
        ui.pago.hidden = false;
        dibujarPago();
        ui.monto?.focus();
    }

    function cerrarPago(volverAlBuscador) {
        estado.vista = 'venta';

        if (ui.pago) {
            ui.pago.hidden = true;
        }

        if (ui.lateralVenta) {
            ui.lateralVenta.hidden = false;
        }

        if (volverAlBuscador) {
            ui.buscar?.focus();
        }
    }

    function seleccionarMedio(idMedio) {
        const medio = medioPorId(idMedio);
        const borrador = estado.borrador;

        if (!medio) {
            return;
        }

        if (borrador && borrador.idMedio === idMedio) {
            ui.monto?.focus();
            return;
        }

        // Un monto ya escrito pasa a la lista de pagos (pago mixto).
        if (borrador && borrador.tocado && borrador.monto > 0) {
            estado.pagos.push({
                idMedio: borrador.idMedio,
                monto: borrador.monto,
                referencia: String(borrador.referencia || '').trim(),
            });
        }

        estado.borrador = { idMedio, monto: faltaParaBorrador(), referencia: '', tocado: false };
        estado.errorCobro = null;
        dibujarPago();

        if (medio.requiereReferencia) {
            ui.referencia?.focus();
        } else {
            ui.monto?.focus();
        }
    }

    function aplicarBillete(valor) {
        const borrador = estado.borrador;

        if (!borrador) {
            return;
        }

        if (valor === 'exacto') {
            borrador.monto = faltaParaBorrador();
        } else {
            const billete = Number(valor) || 0;
            borrador.monto = borrador.tocado ? borrador.monto + billete : billete;
        }

        borrador.tocado = true;
        sincronizarMonto();
        actualizarEstadoPago();
        ui.monto?.focus();
    }

    function pulsarTecla(tecla) {
        const borrador = estado.borrador;

        if (!borrador) {
            return;
        }

        if (tecla === 'borrar') {
            borrador.monto = borrador.tocado ? Math.floor(borrador.monto / 10) : 0;
        } else {
            const base = borrador.tocado && borrador.monto ? String(borrador.monto) : '';
            borrador.monto = Math.min(Number(base + tecla) || 0, 999999999999);
        }

        borrador.tocado = true;
        sincronizarMonto();
        actualizarEstadoPago();
    }

    function sincronizarMonto() {
        if (ui.monto && estado.borrador) {
            ui.monto.value = estado.borrador.monto ? formatoPesos.format(estado.borrador.monto) : '';
        }
    }

    function pagosParaRegistrar() {
        const pagos = estado.pagos.slice();
        const borrador = estado.borrador;

        if (borrador && borrador.monto > 0) {
            pagos.push({
                idMedio: borrador.idMedio,
                monto: borrador.monto,
                referencia: String(borrador.referencia || '').trim(),
            });
        }

        return pagos;
    }

    // Mismas reglas que el servidor: total cubierto, cambio solo desde
    // efectivo y nunca mayor que el efectivo recibido, referencias exigidas.
    function analizarPago() {
        const total = calcularResumen().total;
        const pagos = pagosParaRegistrar();
        let recibido = 0;
        let efectivo = 0;

        pagos.forEach(function (pago) {
            recibido += pago.monto;

            if (medioPorId(pago.idMedio)?.afectaEfectivo) {
                efectivo += pago.monto;
            }
        });

        const falta = Math.max(total - recibido, 0);
        const cambio = Math.max(recibido - total, 0);
        let problema = null;
        let sinReferencia = null;

        if (falta === 0 && pagos.length) {
            if (cambio > 0 && efectivo <= 0) {
                problema = 'El cambio solo puede salir de un pago en efectivo. Ajusta el monto.';
            } else if (cambio > efectivo) {
                problema = 'El cambio no puede ser mayor que el efectivo recibido.';
            } else {
                sinReferencia = pagos.find(function (pago) {
                    return medioPorId(pago.idMedio)?.requiereReferencia && !pago.referencia;
                }) || null;

                if (sinReferencia) {
                    problema = `Escribe la referencia del pago con ${medioPorId(sinReferencia.idMedio).nombre}.`;
                }
            }
        }

        return {
            total,
            pagos,
            falta,
            cambio,
            problema,
            sinReferencia,
            listo: estado.carrito.length > 0 && total > 0 && pagos.length > 0 && falta === 0 && !problema,
        };
    }

    function dibujarPago() {
        if (!ui.pago) {
            return;
        }

        const resumen = calcularResumen();
        const borrador = estado.borrador;
        const medio = borrador ? medioPorId(borrador.idMedio) : null;

        ui.pagoTotal.textContent = pesos(resumen.total);

        ui.medios.querySelectorAll('[data-id-medio]').forEach(function (boton) {
            boton.setAttribute('aria-checked', String(Boolean(borrador) && Number(boton.dataset.idMedio) === borrador.idMedio));
        });

        ui.montoZona.hidden = !medio;
        ui.billetes.hidden = !medio || !medio.afectaEfectivo;

        if (medio) {
            const conReferencia = medio.requiereReferencia || !medio.afectaEfectivo;
            ui.montoEtiqueta.textContent = medio.afectaEfectivo ? 'Recibido' : medio.nombre;
            ui.referencia.hidden = !conReferencia;
            ui.referencia.value = borrador.referencia || '';
            ui.referencia.placeholder = medio.requiereReferencia ? 'Referencia' : 'Ref. opcional';
            sincronizarMonto();
        }

        ui.pagos.innerHTML = estado.pagos.map(function (pago, indice) {
            const medioPago = medioPorId(pago.idMedio) || { nombre: 'Pago', afectaEfectivo: false };
            const icono = ui.medios.querySelector(`[data-id-medio="${pago.idMedio}"] svg`)?.outerHTML || '';
            const detalle = medioPago.afectaEfectivo
                ? `Recibido ${pesos(pago.monto)}`
                : (pago.referencia ? `Ref. ${escapar(pago.referencia)}` : 'Sin referencia');

            return `
                <li class="pos-pago-item">
                    <span class="pos-pago-item-icono">${icono}</span>
                    <span><strong>${escapar(medioPago.nombre)}</strong><small>${detalle}</small></span>
                    <span class="pos-pago-item-monto">${pesos(pago.monto)}</span>
                    <button type="button" data-quitar-pago="${indice}" aria-label="Quitar pago con ${escapar(medioPago.nombre)}">×</button>
                </li>`;
        }).join('');

        ui.errorPago.hidden = !estado.errorCobro;
        ui.errorPagoTexto.textContent = estado.errorCobro || '';
        actualizarEstadoPago();
    }

    function actualizarEstadoPago() {
        if (!ui.estadoPago) {
            return;
        }

        const analisis = analizarPago();

        ui.estadoPago.classList.remove('is-falta', 'is-revisar');

        if (analisis.falta > 0) {
            ui.estadoPago.classList.add('is-falta');
            ui.estadoPagoEtiqueta.textContent = 'Falta';
            ui.estadoPagoMonto.textContent = pesos(analisis.falta);
        } else if (analisis.problema) {
            ui.estadoPago.classList.add('is-revisar');
            ui.estadoPagoEtiqueta.textContent = 'Revisa el pago';
            ui.estadoPagoMonto.textContent = analisis.problema;
        } else {
            ui.estadoPagoEtiqueta.textContent = 'Cambio';
            ui.estadoPagoMonto.textContent = pesos(analisis.cambio);
        }

        ui.referencia?.classList.toggle(
            'is-invalido',
            Boolean(analisis.sinReferencia && estado.borrador && analisis.sinReferencia.idMedio === estado.borrador.idMedio)
        );

        ui.registrar.disabled = !analisis.listo || estado.enviando;
        ui.textoRegistrar.textContent = estado.enviando
            ? 'Registrando…'
            : (estado.errorCobro ? 'Reintentar' : 'Registrar venta');
    }

    async function registrarVenta() {
        if (estado.enviando || estado.vista !== 'pago') {
            return;
        }

        const analisis = analizarPago();

        if (!analisis.listo) {
            if (analisis.falta > 0) {
                aviso(`Faltan ${pesos(analisis.falta)} por cobrar.`, 'error');
            } else if (analisis.problema) {
                aviso(analisis.problema, 'error');

                if (analisis.sinReferencia) {
                    ui.referencia?.focus();
                }
            }
            return;
        }

        const payload = {
            // Sin cliente elegido, el servidor usa el consumidor final.
            id_cliente: estado.cliente.id || null,
            items: estado.carrito.map(function (item) {
                return { id_producto: item.id, cantidad: item.cantidad, descuento_unitario: descuentoDe(item) };
            }),
            pagos: analisis.pagos.map(function (pago) {
                return {
                    id_medio_pago: pago.idMedio,
                    monto_recibido: pago.monto,
                    referencia: pago.referencia,
                };
            }),
        };

        estado.enviando = true;
        estado.errorCobro = null;
        dibujarPago();

        try {
            const respuesta = await fetch('/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            let json = {};

            try {
                json = await respuesta.json();
            } catch (error) {
                json = {};
            }

            if (!respuesta.ok || !json.ok) {
                estado.errorCobro = `${json.mensaje || 'El servidor no aceptó la venta.'} Los pagos digitados se conservan.`;
                return;
            }

            ventaRegistrada(json, analisis);
        } catch (error) {
            console.error('Error registrando la venta:', error);
            estado.errorCobro = 'Sin conexión con el servidor. Los pagos digitados se conservan.';
        } finally {
            estado.enviando = false;

            if (estado.vista === 'pago') {
                dibujarPago();
            }

            dibujarTotales();
        }
    }

    function ventaRegistrada(json, analisis) {
        const venta = json.venta || {};

        estado.ultimaVenta = {
            id: venta.id_venta,
            numero: venta.numero_venta || 'Venta',
            total: Number(venta.total !== undefined ? venta.total : analisis.total),
            cambio: Number(venta.cambio_entregado !== undefined ? venta.cambio_entregado : analisis.cambio),
        };

        // El stock local de los frecuentes baja con lo vendido.
        estado.carrito.forEach(function (item) {
            estado.frecuentes.forEach(function (frecuente) {
                if (frecuente && frecuente.id === item.id && frecuente.controlaInventario) {
                    frecuente.stock = Math.round((frecuente.stock - item.cantidad) * 1000) / 1000;
                    frecuente.puedeVender = frecuente.permiteSinStock || frecuente.stock > 0;
                }
            });
        });

        const siguiente = siguienteNumeroFactura(json);

        if (siguiente) {
            estado.numeroFactura = siguiente;
        }

        reiniciarVenta();
        cerrarPago(false);
        mostrarExito();
        dibujarTodo();
        ui.buscar?.focus();
    }

    function siguienteNumeroFactura(json) {
        const comprobante = json && json.comprobante ? json.comprobante : {};
        const numeroActual = String(comprobante.numero || json?.venta?.numero_venta || '').trim();
        const coincidencia = numeroActual.match(/^(.+?)-(\d+)$/);

        if (coincidencia) {
            const siguiente = Number(coincidencia[2]) + 1;

            if (Number.isInteger(siguiente)) {
                return `${coincidencia[1]}-${String(siguiente).padStart(coincidencia[2].length, '0')}`;
            }
        }

        return '';
    }

    /* ---------------------------------------------------------------
       Venta registrada
       --------------------------------------------------------------- */
    function iniciarExito() {
        ui.exitoOcultar?.addEventListener('click', function () {
            ocultarExito();
            ui.buscar?.focus();
        });

        ui.exitoImprimir?.addEventListener('click', function () {
            window.setTimeout(function () {
                ui.buscar?.focus();
            }, 0);
        });
    }

    function mostrarExito() {
        const venta = estado.ultimaVenta;

        if (!ui.exito || !venta) {
            return;
        }

        ui.exitoNumero.textContent = `${venta.numero} registrada`;
        ui.exitoTotal.textContent = pesos(venta.total);
        ui.exitoCambio.textContent = pesos(venta.cambio);
        ui.exitoImprimir.href = venta.id ? `/ventas/${encodeURIComponent(venta.id)}/ticket` : '#';
        ui.exito.hidden = false;
    }

    function ocultarExito() {
        if (ui.exito) {
            ui.exito.hidden = true;
        }
    }

    function imprimirUltimaVenta() {
        if (!estado.ultimaVenta || !estado.ultimaVenta.id) {
            return;
        }

        window.open(`/ventas/${encodeURIComponent(estado.ultimaVenta.id)}/ticket`, '_blank', 'noopener');
    }

    /* ---------------------------------------------------------------
       Teclado y clics fuera
       --------------------------------------------------------------- */
    function iniciarTeclado() {
        document.addEventListener('keydown', function (evento) {
            if (hayModalAbierto()) {
                return;
            }

            const tecla = evento.key;
            const objetivo = evento.target;
            const enCampo = esCampoEditable(objetivo);
            const buscadorVacio = objetivo === ui.buscar && !ui.buscar.value;
            const control = evento.ctrlKey || evento.metaKey;

            if (tecla === 'F2') {
                evento.preventDefault();
                cerrarPanelCliente();
                ui.buscar?.focus();
                ui.buscar?.select();
                return;
            }

            if (tecla === 'F4') {
                evento.preventDefault();
                if (ui.panelCliente?.hidden) {
                    abrirPanelCliente();
                } else {
                    cerrarPanelCliente();
                    ui.buscar?.focus();
                }
                return;
            }

            if (tecla === 'F8') {
                evento.preventDefault();
                enfocarCantidadSeleccionada();
                return;
            }

            if (tecla === 'F6') {
                evento.preventDefault();
                if (estado.seleccion) {
                    editarDescuento(estado.seleccion);
                }
                return;
            }

            if (tecla === 'F9') {
                evento.preventDefault();
                if (estado.vista === 'pago') {
                    registrarVenta();
                } else {
                    abrirPago();
                }
                return;
            }

            if (tecla === 'Escape') {
                manejarEscape();
                return;
            }

            if (control && tecla.toLowerCase() === 'z' && estado.deshacer && (!enCampo || buscadorVacio)) {
                evento.preventDefault();
                deshacer();
                return;
            }

            if (control && tecla.toLowerCase() === 'p' && ui.exito && !ui.exito.hidden) {
                evento.preventDefault();
                imprimirUltimaVenta();
                return;
            }

            if (control && (tecla === 'ArrowUp' || tecla === 'ArrowDown') && ui.tabla) {
                evento.preventDefault();
                ui.tabla.scrollTo({ top: tecla === 'ArrowUp' ? 0 : ui.tabla.scrollHeight, behavior: 'smooth' });
                return;
            }

            if (evento.altKey && /^[1-9]$/.test(tecla)) {
                evento.preventDefault();
                const numero = Number(tecla);

                if (estado.vista === 'pago') {
                    const medio = (datos.mediosPago || [])[numero - 1];

                    if (medio) {
                        seleccionarMedio(medio.id);
                    }
                } else if (numero <= 6 && estado.frecuentes[numero - 1]) {
                    agregarProducto(estado.frecuentes[numero - 1]);
                }
                return;
            }

            if (tecla === 'Delete' && estado.vista === 'venta' && (!enCampo || buscadorVacio)) {
                if (estado.seleccion !== null && buscarItem(estado.seleccion)) {
                    evento.preventDefault();
                    quitarLinea(estado.seleccion);
                    ui.buscar?.focus();
                }
                return;
            }

            if ((tecla === 'ArrowUp' || tecla === 'ArrowDown') && !enCampo && estado.vista === 'venta') {
                evento.preventDefault();
                moverSeleccion(tecla === 'ArrowUp' ? -1 : 1);
                return;
            }

            // Si el foco quedó fuera de un campo, lo que se escriba (o lo que mande
            // el lector de códigos de barras) va al buscador.
            if (!enCampo && !control && !evento.altKey && tecla.length === 1 && tecla !== ' '
                && estado.vista === 'venta' && estado.puedeVender && ui.buscar) {
                ui.buscar.focus();
            }
        });
    }

    function manejarEscape() {
        if (ui.resultados && !ui.resultados.hidden) {
            ocultarResultados();
            return;
        }

        if (ui.panelCliente && !ui.panelCliente.hidden) {
            cerrarPanelCliente();
            ui.buscar?.focus();
            return;
        }

        if (ui.panelPendientes && !ui.panelPendientes.hidden) {
            cerrarPanelPendientes();
            ui.buscar?.focus();
            return;
        }

        if (estado.multiplicador !== null) {
            fijarMultiplicador(null);
            return;
        }

        if (document.activeElement === ui.buscar && ui.buscar.value) {
            ui.buscar.value = '';
            programarBusqueda(false);
            return;
        }

        if (estado.vista === 'pago') {
            cerrarPago(true);
            return;
        }

        if (ui.exito && !ui.exito.hidden) {
            ocultarExito();
            ui.buscar?.focus();
            return;
        }

        if (estado.editandoFrecuentes) {
            estado.editandoFrecuentes = false;
            dibujarFrecuentes();
            return;
        }

        // Esc dos veces seguidas: sale del modo enfoque.
        if (document.documentElement.dataset.posEnfoque === '1') {
            const ahora = Date.now();

            if (ahora - estado.ultimoEscape < 700) {
                alternarEnfoque(false);
                estado.ultimoEscape = 0;
                return;
            }

            estado.ultimoEscape = ahora;
        }

        ui.buscar?.focus();
    }

    function iniciarClicFuera() {
        document.addEventListener('click', function (evento) {
            if (!evento.target.closest('.pos-buscador')) {
                ocultarResultados();
            }

            if (!evento.target.closest('.pos-cliente-zona')) {
                cerrarPanelCliente();
            }

            if (!evento.target.closest('.pos-pendientes-zona')) {
                cerrarPanelPendientes();
            }
        });
    }
})();
