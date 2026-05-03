(function () {
    function $(id) {
        return document.getElementById(id);
    }

    function limpiarTexto(valor) {
        return String(valor || '').trim();
    }

    function dinero(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(Number(valor || 0));
    }

    function obtenerUiAnulacionVenta() {
        return {
            btnAbrir: $('btnAbrirAnulacionVenta'),
            modal: $('modalAnularVenta'),
            form: $('formAnularVenta'),
            btnCerrar: $('btnCerrarAnulacionVenta'),
            btnCancelar: $('btnCancelarAnulacionVenta'),
            btnConfirmar: $('btnConfirmarAnulacionVenta'),

            alerta: $('alertaAnulacionVenta'),
            problemas: $('anulacionProblemasVenta'),

            numero: $('anulacionNumeroVenta'),
            cliente: $('anulacionClienteVenta'),
            total: $('anulacionTotalVenta'),
            estado: $('anulacionEstadoVenta'),

            inventario: $('anulacionInventarioVenta'),
            caja: $('anulacionCajaVenta'),

            motivo: $('motivoAnulacionVenta'),
            observaciones: $('observacionesAnulacionVenta'),

            preparacion: null,
        };
    }

    function mostrarAlertaAnulacion(ui, mensaje) {
        if (!ui.alerta) return;

        ui.alerta.textContent = mensaje;
        ui.alerta.hidden = false;
    }

    function limpiarAlertaAnulacion(ui) {
        if (!ui.alerta) return;

        ui.alerta.textContent = '';
        ui.alerta.hidden = true;
    }

    function renderProblemasAnulacion(ui, problemas = []) {
        if (!ui.problemas) return;

        if (!problemas.length) {
            ui.problemas.hidden = true;
            ui.problemas.innerHTML = '';
            return;
        }

        ui.problemas.innerHTML = `
            <strong>No se puede anular todavía:</strong>
            <ul>
                ${problemas.map((problema) => `<li>${problema}</li>`).join('')}
            </ul>
        `;

        ui.problemas.hidden = false;
    }

    function renderInventarioAnulacion(ui, plan = []) {
        if (!ui.inventario) return;

        if (!plan.length) {
            ui.inventario.innerHTML = '<p>No hay movimientos de inventario para reversar.</p>';
            return;
        }

        ui.inventario.innerHTML = plan.map((item) => `
            <p>
                <strong>${item.nombre_producto || 'Producto'}</strong>
                <span>
                    Regresa ${item.cantidad_vendida || 0} ${item.unidad_abreviatura || ''}
                    · Stock: ${item.stock_actual} → ${item.stock_despues_anulacion}
                </span>
            </p>
        `).join('');
    }

    function renderCajaAnulacion(ui, reversa = {}) {
        if (!ui.caja) return;

        ui.caja.innerHTML = `
            <p><strong>Total ventas:</strong> <span>${dinero(reversa.total_ventas || 0)}</span></p>
            <p><strong>Efectivo:</strong> <span>${dinero(reversa.total_efectivo || 0)}</span></p>
            <p><strong>Transferencia:</strong> <span>${dinero(reversa.total_transferencia || 0)}</span></p>
            <p><strong>Tarjeta:</strong> <span>${dinero(reversa.total_tarjeta || 0)}</span></p>
            <p><strong>Otros:</strong> <span>${dinero(reversa.total_otros || 0)}</span></p>
            <p><strong>Monto esperado:</strong> <span>${dinero(reversa.monto_esperado || 0)}</span></p>
        `;
    }

    async function abrirModalAnulacionVenta(ui) {
        limpiarAlertaAnulacion(ui);
        renderProblemasAnulacion(ui, []);

        ui.modal.hidden = false;
        document.body.classList.add('ventas-modal-open');

        ui.motivo.value = '';
        ui.observaciones.value = '';

        if (ui.btnConfirmar) {
            ui.btnConfirmar.disabled = true;
            ui.btnConfirmar.textContent = 'Validando...';
        }

        try {
            const respuesta = await fetch(ui.btnAbrir.dataset.urlPreparar);
            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                mostrarAlertaAnulacion(ui, datos.mensaje || 'No se pudo preparar la anulación.');
                return;
            }

            ui.preparacion = datos;

            ui.numero.textContent = datos.venta?.numero_venta || '-';
            ui.cliente.textContent = datos.venta?.cliente_nombre_mostrar || 'Consumidor final';
            ui.total.textContent = dinero(datos.venta?.total || 0);
            ui.estado.textContent = datos.venta?.estado || '-';

            renderProblemasAnulacion(ui, datos.problemas || []);
            renderInventarioAnulacion(ui, datos.plan_inventario || []);
            renderCajaAnulacion(ui, datos.reversa_caja || {});

            if (ui.btnConfirmar) {
                ui.btnConfirmar.disabled = !datos.puede_anular;
                ui.btnConfirmar.textContent = datos.puede_anular
                    ? 'Anular venta'
                    : 'No disponible';
            }
        } catch (error) {
            console.error('Error preparando anulación:', error);
            mostrarAlertaAnulacion(ui, 'Error de conexión preparando la anulación.');
        }
    }

    function cerrarModalAnulacionVenta(ui) {
        ui.modal.hidden = true;
        document.body.classList.remove('ventas-modal-open');
        limpiarAlertaAnulacion(ui);
    }

    function construirPayloadAnulacion(ui) {
        const motivo = limpiarTexto(ui.motivo.value);

        if (!motivo) {
            return {
                ok: false,
                mensaje: 'Debes digitar el motivo de la anulación.',
            };
        }

        if (motivo.length < 8) {
            return {
                ok: false,
                mensaje: 'El motivo de anulación debe ser más descriptivo.',
            };
        }

        return {
            ok: true,
            datos: {
                motivo_anulacion: motivo,
                observaciones: limpiarTexto(ui.observaciones.value),
            },
        };
    }

    async function confirmarAnulacionVenta(ui) {
        limpiarAlertaAnulacion(ui);

        const payload = construirPayloadAnulacion(ui);

        if (!payload.ok) {
            mostrarAlertaAnulacion(ui, payload.mensaje);
            ui.motivo.focus();
            return;
        }

        const textoOriginal = ui.btnConfirmar.textContent;

        ui.btnConfirmar.disabled = true;
        ui.btnConfirmar.textContent = 'Anulando...';

        try {
            const respuesta = await fetch(ui.btnAbrir.dataset.urlAnular, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload.datos),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                mostrarAlertaAnulacion(ui, datos.mensaje || 'No se pudo anular la venta.');
                return;
            }

            const idVenta = datos.anulacion?.id_venta || ui.btnAbrir.dataset.idVenta;
            const mensaje = datos.mensaje || 'Venta anulada correctamente.';

            window.location.href = `/ventas/${idVenta}?exito=${encodeURIComponent(mensaje)}`;
        } catch (error) {
            console.error('Error anulando venta:', error);
            mostrarAlertaAnulacion(ui, 'Error de conexión anulando la venta.');
        } finally {
            ui.btnConfirmar.disabled = false;
            ui.btnConfirmar.textContent = textoOriginal;
        }
    }

    function inicializarAnulacionVenta() {
        const ui = obtenerUiAnulacionVenta();

        if (!ui.btnAbrir || !ui.modal || !ui.form) {
            return;
        }

        ui.btnAbrir.addEventListener('click', function () {
            abrirModalAnulacionVenta(ui);
        });

        ui.btnCerrar?.addEventListener('click', function () {
            cerrarModalAnulacionVenta(ui);
        });

        ui.btnCancelar?.addEventListener('click', function () {
            cerrarModalAnulacionVenta(ui);
        });

        ui.modal.addEventListener('click', function (evento) {
            if (evento.target === ui.modal) {
                cerrarModalAnulacionVenta(ui);
            }
        });

        ui.form.addEventListener('submit', function (evento) {
            evento.preventDefault();
            confirmarAnulacionVenta(ui);
        });

        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && !ui.modal.hidden) {
                cerrarModalAnulacionVenta(ui);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', inicializarAnulacionVenta);
})();