/**
 * Shell de la app: menú lateral.
 *
 * data-menu-estado en <html>:
 * - "movil"    (< 768 px): panel deslizable que se abre con el botón del header.
 * - "riel"     solo íconos (preferencia guardada o pantalla < 1280 px).
 * - "completo" íconos y textos.
 * La misma regla corre en línea en layouts/app.ejs antes de pintar.
 *
 * Además: el menú conserva su scroll entre módulos, muestra una ayuda al pasar
 * el mouse por los íconos del riel y se alterna con Ctrl+B.
 */
(function () {
    const raiz = document.documentElement;
    const menu = document.getElementById('appSidebar');
    const fondo = document.querySelector('[data-shell-close]');
    const botonPanel = document.querySelector('[data-menu-toggle]');

    function leer(almacen, clave) {
        try {
            return almacen.getItem(clave);
        } catch (error) {
            return null;
        }
    }

    function guardar(almacen, clave, valor) {
        try {
            almacen.setItem(clave, valor);
        } catch (error) {
            /* sin almacenamiento: dura solo esta página */
        }
    }

    function calcularEstado() {
        const preferencia = leer(localStorage, 'prismia.menu');
        const ancho = window.innerWidth;

        if (ancho < 768) return 'movil';
        if (preferencia === 'compacto') return 'riel';
        if (preferencia === 'expandido') return 'completo';
        if (ancho < 1280) return 'riel';

        return 'completo';
    }

    function actualizarBotonPanel() {
        if (!botonPanel) return;

        const abierto = raiz.getAttribute('data-menu-estado') === 'completo'
            || raiz.classList.contains('menu-abierto');
        const texto = abierto ? 'Cerrar menú' : 'Abrir menú';

        botonPanel.setAttribute('aria-expanded', String(abierto));
        botonPanel.setAttribute('aria-label', `${texto} lateral`);
        botonPanel.dataset.tooltip = texto;
    }

    function aplicarEstado() {
        raiz.setAttribute('data-menu-estado', calcularEstado());

        if (raiz.getAttribute('data-menu-estado') !== 'movil') {
            abrirPanelMovil(false);
        }

        actualizarBotonPanel();
    }

    function abrirPanelMovil(abrir) {
        raiz.classList.toggle('menu-abierto', abrir);

        if (fondo) {
            fondo.hidden = !abrir;
        }

        actualizarBotonPanel();
    }

    function alternarMenu() {
        if (raiz.getAttribute('data-menu-estado') === 'movil') {
            abrirPanelMovil(!raiz.classList.contains('menu-abierto'));
            return;
        }

        const esRiel = raiz.getAttribute('data-menu-estado') === 'riel';
        guardar(localStorage, 'prismia.menu', esRiel ? 'expandido' : 'compacto');
        ocultarAyuda();
        aplicarEstado();
    }

    document.addEventListener('click', function (evento) {
        if (evento.target.closest('[data-menu-toggle], [data-shell-toggle]')) {
            alternarMenu();
            return;
        }

        if (evento.target.closest('[data-shell-close]')) {
            abrirPanelMovil(false);
        }
    });

    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && raiz.classList.contains('menu-abierto')) {
            abrirPanelMovil(false);
            return;
        }

        if ((evento.ctrlKey || evento.metaKey) && !evento.shiftKey && !evento.altKey
            && String(evento.key).toLowerCase() === 'b') {
            evento.preventDefault();
            alternarMenu();
        }
    });

    let temporizadorResize = null;
    window.addEventListener('resize', function () {
        clearTimeout(temporizadorResize);
        temporizadorResize = setTimeout(aplicarEstado, 120);
    });

    // ---------- Scroll del menú entre módulos ----------
    if (menu) {
        let temporizadorScroll = null;

        menu.addEventListener('scroll', function () {
            clearTimeout(temporizadorScroll);
            temporizadorScroll = setTimeout(function () {
                guardar(sessionStorage, 'prismia.menu.scroll', String(menu.scrollTop));
            }, 80);
        }, { passive: true });

        window.addEventListener('pagehide', function () {
            guardar(sessionStorage, 'prismia.menu.scroll', String(menu.scrollTop));
        });
    }

    // ---------- Ayuda flotante ----------
    const ayuda = document.createElement('div');
    ayuda.className = 'menu-tooltip';
    ayuda.setAttribute('role', 'tooltip');
    document.body.appendChild(ayuda);

    let elementoConAyuda = null;

    function debeMostrarAyuda(elemento) {
        if (elemento.matches('[data-menu-toggle]')) return true;

        // Los enlaces solo necesitan ayuda cuando su texto está oculto (riel).
        return raiz.getAttribute('data-menu-estado') === 'riel';
    }

    function mostrarAyuda(elemento) {
        const texto = elemento.dataset.tooltip;

        if (!texto || !debeMostrarAyuda(elemento)) return;

        ayuda.textContent = texto;

        if (elemento.dataset.tooltipAtajo) {
            const atajo = document.createElement('kbd');
            atajo.textContent = elemento.dataset.tooltipAtajo;
            ayuda.appendChild(atajo);
        }

        const caja = elemento.getBoundingClientRect();
        ayuda.style.left = `${Math.round(caja.right + 10)}px`;
        ayuda.style.top = `${Math.round(caja.top + caja.height / 2 - 15)}px`;
        ayuda.classList.add('is-visible');
        elementoConAyuda = elemento;
    }

    function ocultarAyuda() {
        ayuda.classList.remove('is-visible');
        elementoConAyuda = null;
    }

    if (menu) {
        menu.addEventListener('mouseover', function (evento) {
            const elemento = evento.target.closest('[data-tooltip]');

            if (elemento && elemento !== elementoConAyuda) {
                mostrarAyuda(elemento);
            }
        });

        menu.addEventListener('mouseleave', ocultarAyuda);

        menu.addEventListener('mouseout', function (evento) {
            const elemento = evento.target.closest('[data-tooltip]');

            if (elemento && !elemento.contains(evento.relatedTarget)) {
                ocultarAyuda();
            }
        });

        menu.addEventListener('scroll', ocultarAyuda, { passive: true });
    }

    aplicarEstado();
})();
