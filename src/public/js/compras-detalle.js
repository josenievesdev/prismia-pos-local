(function () {
    const modal = document.getElementById('modalAnularPagoProveedor');

    if (!modal) {
        return;
    }

    const form = document.getElementById('formAnularPagoProveedor');
    const textoMonto = modal.querySelector('[data-modal-pago-monto]');
    const textoFecha = modal.querySelector('[data-modal-pago-fecha]');
    const textoMedio = modal.querySelector('[data-modal-pago-medio]');
    const botonesAbrir = document.querySelectorAll('[data-modal-anular-pago]');
    const botonesCerrar = modal.querySelectorAll('[data-cerrar-modal-anular-pago]');

    function abrirModal(boton) {
        const action = boton.dataset.action || '';
        const monto = boton.dataset.monto || '—';
        const fecha = boton.dataset.fecha || '—';
        const medio = boton.dataset.medio || '—';

        if (!action || !form) {
            return;
        }

        form.setAttribute('action', action);

        if (textoMonto) {
            textoMonto.textContent = monto;
        }

        if (textoFecha) {
            textoFecha.textContent = fecha;
        }

        if (textoMedio) {
            textoMedio.textContent = medio;
        }

        modal.hidden = false;
        document.body.classList.add('modal-open');

        const campoMotivo = form.querySelector('textarea[name="motivo_anulacion"]');

        if (campoMotivo) {
            campoMotivo.focus();
            campoMotivo.select();
        }
    }

    function cerrarModal() {
        modal.hidden = true;
        document.body.classList.remove('modal-open');

        if (form) {
            form.removeAttribute('action');
        }
    }

    botonesAbrir.forEach((boton) => {
        boton.addEventListener('click', () => {
            abrirModal(boton);
        });
    });

    botonesCerrar.forEach((boton) => {
        boton.addEventListener('click', cerrarModal);
    });

    modal.addEventListener('click', (evento) => {
        if (evento.target === modal) {
            cerrarModal();
        }
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && !modal.hidden) {
            cerrarModal();
        }
    });
})();